import { NextResponse } from "next/server";
import { cardCatalog } from "@/lib/game/cards";
import { cardRowToTemplate, cardTemplateToInsert } from "@/lib/game/mapping";
import { openPack } from "@/lib/game/packs/openPack";
import { getPackDefinition } from "@/lib/game/packs/packs";
import { getSiteUrl } from "@/lib/site-url";
import { requireSupabaseUser } from "@/lib/supabase/auth";

export async function GET(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) {
    return NextResponse.redirect(getSiteUrl("/auth/login", request));
  }

  const url = new URL(request.url);
  const packSlug = url.searchParams.get("pack") ?? "core-pack";
  const packDefinition = getPackDefinition(packSlug);
  if (!packDefinition) {
    return NextResponse.redirect(getSiteUrl("/packs?error=pack-not-found", request));
  }

  const cardQuery = await auth.supabase.from("card_templates").select("*");
  let cardRows = cardQuery.data;
  if (cardQuery.error) {
    return NextResponse.redirect(getSiteUrl(`/packs?error=${encodeURIComponent(cardQuery.error.message)}`, request));
  }

  if (!cardRows?.length) {
    const seed = await auth.supabase.from("card_templates").upsert(cardCatalog.map(cardTemplateToInsert), { onConflict: "slug" }).select("*");
    if (seed.error) {
      return NextResponse.redirect(getSiteUrl(`/packs?error=${encodeURIComponent(seed.error.message)}`, request));
    }
    cardRows = seed.data;
  }

  const profileResult = await auth.supabase.from("profiles").select("*").eq("id", auth.user.id).single();
  if (profileResult.error) {
    return NextResponse.redirect(getSiteUrl(`/packs?error=${encodeURIComponent(profileResult.error.message)}`, request));
  }
  if (profileResult.data.coins < packDefinition.priceCoins) {
    return NextResponse.redirect(getSiteUrl("/packs?error=not-enough-coins", request));
  }

  const result = openPack(cardRows.map(cardRowToTemplate), packDefinition.cardCount, packDefinition.rarityWeights);
  const cardBySlug = new Map(cardRows.map((row) => [row.slug, row]));
  const ids = result.cards.map((card) => cardBySlug.get(card.slug)?.id).filter((id): id is string => Boolean(id));
  if (ids.length !== result.cards.length) {
    return NextResponse.redirect(getSiteUrl("/packs?error=unknown-card", request));
  }

  const grant = await auth.supabase.rpc("grant_pack_opening", {
    p_user_id: auth.user.id,
    p_pack_slug: packDefinition.slug,
    p_price: packDefinition.priceCoins,
    p_card_template_ids: ids,
  });
  if (grant.error) {
    return NextResponse.redirect(getSiteUrl(`/packs?error=${encodeURIComponent(grant.error.message)}`, request));
  }

  const response = NextResponse.redirect(getSiteUrl(`/packs/opening?pack=${packDefinition.slug}&source=purchase`, request));
  response.cookies.set("friend_tcg_last_pack", JSON.stringify({ packSlug: packDefinition.slug, cards: result.cards }), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
