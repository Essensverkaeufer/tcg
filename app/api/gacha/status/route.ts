import { NextResponse } from "next/server";
import { defaultGachaBanner, getFeaturedChanceForNextPull, getGachaBanner, getGuaranteedIn, type GachaBanner } from "@/lib/game/gacha";
import { ensureFeaturedGachaCards } from "@/lib/game/gacha-server";
import { cardRowToTemplate } from "@/lib/game/mapping";
import { requireSupabaseUser } from "@/lib/supabase/auth";
import type { Database } from "@/types/supabase";

export const dynamic = "force-dynamic";

type CardRow = Database["public"]["Tables"]["card_templates"]["Row"];

function buildStatus({
  banner,
  coins,
  featuredCards,
  featuredOwnedBySlug,
  featuredCopies,
  pullsSinceFeatured,
  totalPulls,
  history,
}: {
  banner: GachaBanner;
  coins: number;
  featuredCards: CardRow[];
  featuredOwnedBySlug: Record<string, number>;
  featuredCopies: number;
  pullsSinceFeatured: number;
  totalPulls: number;
  history: Database["public"]["Tables"]["gacha_pull_history"]["Row"][];
}) {
  return {
    banner: {
      ...banner,
      nextFeaturedChance: getFeaturedChanceForNextPull(pullsSinceFeatured, banner),
    },
    coins,
    featuredCard: cardRowToTemplate(featuredCards[0]),
    featuredCards: featuredCards.map(cardRowToTemplate),
    pity: {
      pullsSinceFeatured,
      totalPulls,
      featuredCopies,
      featuredOwned: Object.values(featuredOwnedBySlug).reduce((total, quantity) => total + quantity, 0),
      featuredOwnedBySlug,
      guaranteedIn: getGuaranteedIn(pullsSinceFeatured, banner),
    },
    history: history.map((entry) => ({
      id: entry.id,
      pullCount: entry.pull_count,
      cost: entry.cost,
      rewards: entry.rewards,
      pityBefore: entry.pity_before,
      pityAfter: entry.pity_after,
      featuredHits: entry.featured_hits,
      createdAt: entry.created_at,
    })),
  };
}

export async function GET(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const requestedSlug = new URL(request.url).searchParams.get("bannerSlug") ?? defaultGachaBanner.slug;
  const banner = getGachaBanner(requestedSlug);
  if (!banner) {
    return NextResponse.json({ error: "Gacha banner not found." }, { status: 404 });
  }

  try {
    const featuredCards = await ensureFeaturedGachaCards(auth.supabase, banner);
    const featuredIds = featuredCards.map((card) => card.id);
    if (!featuredCards.length) throw new Error("Featured gacha card is missing.");

    const [profileResult, pityResult, collectionResult, historyResult] = await Promise.all([
      auth.supabase.from("profiles").select("coins").eq("id", auth.user.id).single(),
      auth.supabase
        .from("gacha_pity")
        .select("*")
        .eq("user_id", auth.user.id)
        .eq("banner_slug", banner.slug)
        .maybeSingle(),
      auth.supabase
        .from("user_card_collection")
        .select("card_template_id, quantity")
        .eq("user_id", auth.user.id)
        .in("card_template_id", featuredIds),
      auth.supabase
        .from("gacha_pull_history")
        .select("*")
        .eq("user_id", auth.user.id)
        .eq("banner_slug", banner.slug)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    if (profileResult.error) throw new Error(profileResult.error.message);
    if (pityResult.error) throw new Error(pityResult.error.message);
    if (collectionResult.error) throw new Error(collectionResult.error.message);
    if (historyResult.error) throw new Error(historyResult.error.message);

    return NextResponse.json(buildStatus({
      banner,
      coins: profileResult.data.coins,
      featuredCards,
      featuredOwnedBySlug: Object.fromEntries(featuredCards.map((card) => [
        card.slug,
        collectionResult.data?.find((entry) => entry.card_template_id === card.id)?.quantity ?? 0,
      ])),
      featuredCopies: pityResult.data?.featured_copies ?? 0,
      pullsSinceFeatured: pityResult.data?.pulls_since_featured ?? 0,
      totalPulls: pityResult.data?.total_pulls ?? 0,
      history: historyResult.data ?? [],
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load gacha status." }, { status: 500 });
  }
}
