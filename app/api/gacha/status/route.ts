import { NextResponse } from "next/server";
import { getFeaturedChanceForNextPull, getGuaranteedIn, necrpTuffGachaBanner } from "@/lib/game/gacha";
import { ensureFeaturedGachaCard } from "@/lib/game/gacha-server";
import { cardRowToTemplate } from "@/lib/game/mapping";
import { requireSupabaseUser } from "@/lib/supabase/auth";
import type { Database } from "@/types/supabase";

export const dynamic = "force-dynamic";

type CardRow = Database["public"]["Tables"]["card_templates"]["Row"];

function buildStatus({
  coins,
  featuredCard,
  featuredOwned,
  featuredCopies,
  pullsSinceFeatured,
  totalPulls,
  history,
}: {
  coins: number;
  featuredCard: CardRow;
  featuredOwned: number;
  featuredCopies: number;
  pullsSinceFeatured: number;
  totalPulls: number;
  history: Database["public"]["Tables"]["gacha_pull_history"]["Row"][];
}) {
  return {
    banner: {
      ...necrpTuffGachaBanner,
      nextFeaturedChance: getFeaturedChanceForNextPull(pullsSinceFeatured),
    },
    coins,
    featuredCard: cardRowToTemplate(featuredCard),
    pity: {
      pullsSinceFeatured,
      totalPulls,
      featuredCopies,
      featuredOwned,
      guaranteedIn: getGuaranteedIn(pullsSinceFeatured),
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

  try {
    const featuredCard = await ensureFeaturedGachaCard(auth.supabase);

    const [profileResult, pityResult, collectionResult, historyResult] = await Promise.all([
      auth.supabase.from("profiles").select("coins").eq("id", auth.user.id).single(),
      auth.supabase
        .from("gacha_pity")
        .select("*")
        .eq("user_id", auth.user.id)
        .eq("banner_slug", necrpTuffGachaBanner.slug)
        .maybeSingle(),
      auth.supabase
        .from("user_card_collection")
        .select("quantity")
        .eq("user_id", auth.user.id)
        .eq("card_template_id", featuredCard.id)
        .maybeSingle(),
      auth.supabase
        .from("gacha_pull_history")
        .select("*")
        .eq("user_id", auth.user.id)
        .eq("banner_slug", necrpTuffGachaBanner.slug)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    if (profileResult.error) throw new Error(profileResult.error.message);
    if (pityResult.error) throw new Error(pityResult.error.message);
    if (collectionResult.error) throw new Error(collectionResult.error.message);
    if (historyResult.error) throw new Error(historyResult.error.message);

    return NextResponse.json(buildStatus({
      coins: profileResult.data.coins,
      featuredCard,
      featuredOwned: collectionResult.data?.quantity ?? 0,
      featuredCopies: pityResult.data?.featured_copies ?? 0,
      pullsSinceFeatured: pityResult.data?.pulls_since_featured ?? 0,
      totalPulls: pityResult.data?.total_pulls ?? 0,
      history: historyResult.data ?? [],
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load gacha status." }, { status: 500 });
  }
}
