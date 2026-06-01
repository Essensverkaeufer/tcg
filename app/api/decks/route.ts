import { NextResponse } from "next/server";
import { z } from "zod";
import { cardRowToTemplate } from "@/lib/game/mapping";
import { validateDeck } from "@/lib/game/decks/validateDeck";
import { requireSupabaseUser } from "@/lib/supabase/auth";

const saveDeckSchema = z.object({
  deckId: z.string().uuid().optional(),
  name: z.string().min(1).max(60),
  isActive: z.boolean().default(false),
  cards: z.array(z.object({ cardTemplateId: z.string().uuid(), quantity: z.number().int().positive() })),
});

export async function GET(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const decks = await auth.supabase
    .from("decks")
    .select("*, deck_cards(*)")
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false });

  if (decks.error) {
    return NextResponse.json({ error: decks.error.message }, { status: 500 });
  }

  return NextResponse.json({ decks: decks.data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const parsed = saveDeckSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid deck payload." }, { status: 400 });
  }

  const cardIds = parsed.data.cards.map((card) => card.cardTemplateId);
  const [templatesResult, collectionResult] = await Promise.all([
    auth.supabase.from("card_templates").select("*").in("id", cardIds),
    auth.supabase.from("user_card_collection").select("*").eq("user_id", auth.user.id).in("card_template_id", cardIds),
  ]);

  if (templatesResult.error) return NextResponse.json({ error: templatesResult.error.message }, { status: 500 });
  if (collectionResult.error) return NextResponse.json({ error: collectionResult.error.message }, { status: 500 });

  const templateById = new Map((templatesResult.data ?? []).map((card) => [card.id, card]));
  const ownedById = new Map((collectionResult.data ?? []).map((entry) => [entry.card_template_id, entry.quantity]));

  const deckInput = parsed.data.cards.map((entry) => {
    const template = templateById.get(entry.cardTemplateId);
    return template ? { card: cardRowToTemplate(template), quantity: entry.quantity } : undefined;
  });

  if (deckInput.some((entry) => !entry)) {
    return NextResponse.json({ error: "Deck contains unknown cards." }, { status: 400 });
  }

  for (const entry of parsed.data.cards) {
    if ((ownedById.get(entry.cardTemplateId) ?? 0) < entry.quantity) {
      return NextResponse.json({ error: "Deck contains cards you do not own enough copies of." }, { status: 400 });
    }
  }

  const validation = validateDeck(deckInput as NonNullable<(typeof deckInput)[number]>[]);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
  }

  if (parsed.data.isActive) {
    await auth.supabase.from("decks").update({ is_active: false }).eq("user_id", auth.user.id);
  }

  const deckResult = parsed.data.deckId
    ? await auth.supabase
        .from("decks")
        .update({ name: parsed.data.name, is_active: parsed.data.isActive })
        .eq("id", parsed.data.deckId)
        .eq("user_id", auth.user.id)
        .select("*")
        .single()
    : await auth.supabase
        .from("decks")
        .insert({ user_id: auth.user.id, name: parsed.data.name, is_active: parsed.data.isActive })
        .select("*")
        .single();

  if (deckResult.error) return NextResponse.json({ error: deckResult.error.message }, { status: 500 });

  await auth.supabase.from("deck_cards").delete().eq("deck_id", deckResult.data.id);
  const insertCards = await auth.supabase.from("deck_cards").insert(
    parsed.data.cards.map((card) => ({
      deck_id: deckResult.data.id,
      card_template_id: card.cardTemplateId,
      quantity: card.quantity,
    })),
  );

  if (insertCards.error) return NextResponse.json({ error: insertCards.error.message }, { status: 500 });

  return NextResponse.json({ deck: deckResult.data });
}
