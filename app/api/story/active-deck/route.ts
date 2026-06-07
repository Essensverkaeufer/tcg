import { NextResponse } from "next/server";
import { validateDeck } from "@/lib/game/decks/validateDeck";
import { cardRowToTemplate } from "@/lib/game/mapping";
import { requireSupabaseUser } from "@/lib/supabase/auth";

type DeckCardRow = {
  quantity: number;
  card_templates: Parameters<typeof cardRowToTemplate>[0] | null;
};

function groupDeck(deck: ReturnType<typeof cardRowToTemplate>[]) {
  const grouped = new Map<string, { card: ReturnType<typeof cardRowToTemplate>; quantity: number }>();
  for (const card of deck) {
    const current = grouped.get(card.slug);
    grouped.set(card.slug, { card, quantity: (current?.quantity ?? 0) + 1 });
  }
  return [...grouped.values()];
}

export async function GET(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const [cardsResult, deckResult] = await Promise.all([
    auth.supabase.from("card_templates").select("*"),
    auth.supabase
      .from("decks")
      .select("id, name, deck_cards(quantity, card_templates(*))")
      .eq("user_id", auth.user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
  ]);

  if (cardsResult.error) {
    return NextResponse.json({ error: cardsResult.error.message }, { status: 500 });
  }

  if (deckResult.error) {
    return NextResponse.json({ error: deckResult.error.message }, { status: 500 });
  }

  if (!deckResult.data) {
    return NextResponse.json({ error: "No active deck found. Go to Decks, save a deck, and mark it active." }, { status: 404 });
  }

  const catalog = (cardsResult.data ?? []).map(cardRowToTemplate);
  const rows = (deckResult.data.deck_cards ?? []) as unknown as DeckCardRow[];
  const playerDeck = rows.flatMap((row) => {
    if (!row.card_templates) return [];
    return Array.from({ length: row.quantity }, () => cardRowToTemplate(row.card_templates!));
  });

  const validation = validateDeck(groupDeck(playerDeck));
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors[0] ?? "Active deck is not legal.", errors: validation.errors }, { status: 400 });
  }

  return NextResponse.json({
    deck: {
      id: deckResult.data.id,
      name: deckResult.data.name,
      cards: playerDeck,
    },
    catalog,
  });
}
