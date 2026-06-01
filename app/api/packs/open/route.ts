import { NextResponse } from "next/server";
import { z } from "zod";
import { cardCatalog } from "@/lib/game/cards";
import { cardRowToTemplate, cardTemplateToInsert } from "@/lib/game/mapping";
import { openPack } from "@/lib/game/packs/openPack";
import { getPackDefinition } from "@/lib/game/packs/packs";
import { requireSupabaseUser } from "@/lib/supabase/auth";

const openPackSchema = z.object({
  packSlug: z.string().default("core-pack"),
});

export async function POST(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const parsed = openPackSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid pack request." }, { status: 400 });
  }

  const packDefinition = getPackDefinition(parsed.data.packSlug);
  if (!packDefinition) {
    return NextResponse.json({ error: "Pack not found." }, { status: 404 });
  }

  const cardQuery = await auth.supabase.from("card_templates").select("*");
  let cardRows = cardQuery.data;
  if (cardQuery.error) {
    return NextResponse.json({ error: cardQuery.error.message }, { status: 500 });
  }

  if (!cardRows?.length) {
    const seedRows = cardCatalog.map(cardTemplateToInsert);
    const seed = await auth.supabase.from("card_templates").upsert(seedRows, { onConflict: "slug" }).select("*");
    if (seed.error) {
      return NextResponse.json({ error: seed.error.message }, { status: 500 });
    }
    cardRows = seed.data;
  }

  const profileResult = await auth.supabase.from("profiles").select("*").eq("id", auth.user.id).single();
  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error.message }, { status: 500 });
  }

  if (profileResult.data.coins < packDefinition.priceCoins) {
    return NextResponse.json({ error: "Not enough coins." }, { status: 400 });
  }

  const templates = cardRows.map(cardRowToTemplate);
  const result = openPack(templates, packDefinition.cardCount, packDefinition.rarityWeights);
  const cardBySlug = new Map(cardRows.map((row) => [row.slug, row]));
  const cardTemplateIds = result.cards
    .map((card) => cardBySlug.get(card.slug)?.id)
    .filter((id): id is string => Boolean(id));

  if (cardTemplateIds.length !== result.cards.length) {
    return NextResponse.json({ error: "Pack rolled unknown cards." }, { status: 500 });
  }

  const grant = await auth.supabase.rpc("grant_pack_opening", {
    p_user_id: auth.user.id,
    p_pack_slug: packDefinition.slug,
    p_price: packDefinition.priceCoins,
    p_card_template_ids: cardTemplateIds,
  });

  if (grant.error) {
    const needsMigration = grant.error.message.includes("grant_pack_opening") || grant.error.message.includes("function");
    return NextResponse.json({
      error: needsMigration
        ? "Pack saving is not installed in Supabase yet. Run supabase/migrations/0007_repair_online_game_systems.sql."
        : grant.error.message,
    }, { status: 500 });
  }

  const account = grant.data?.[0];

  return NextResponse.json({
    cards: result.cards,
    coins: account?.coins ?? profileResult.data.coins - packDefinition.priceCoins,
    packsOpened: account?.packs_opened ?? profileResult.data.packs_opened + 1,
  });
}
