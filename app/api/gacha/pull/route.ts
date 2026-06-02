import { NextResponse } from "next/server";
import { z } from "zod";
import { necrpTuffGachaBanner } from "@/lib/game/gacha";
import { ensureFeaturedGachaCard } from "@/lib/game/gacha-server";
import { cardRowToTemplate } from "@/lib/game/mapping";
import { requireSupabaseUser } from "@/lib/supabase/auth";
import type { Database } from "@/types/supabase";

export const dynamic = "force-dynamic";

const pullSchema = z.object({
  bannerSlug: z.string().default(necrpTuffGachaBanner.slug),
  pullCount: z.union([z.literal(1), z.literal(10)]).default(1),
});

type GachaReward = {
  cardTemplateId: string;
  slug: string;
  name: string;
  rarity: string;
  featured: boolean;
  pityAfter: number;
  pullNumber: number;
};

function parseRewards(value: unknown): GachaReward[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const reward = entry as Partial<GachaReward>;
      if (typeof reward.cardTemplateId !== "string") return null;
      return {
        cardTemplateId: reward.cardTemplateId,
        slug: typeof reward.slug === "string" ? reward.slug : "",
        name: typeof reward.name === "string" ? reward.name : "",
        rarity: typeof reward.rarity === "string" ? reward.rarity : "COMMON",
        featured: Boolean(reward.featured),
        pityAfter: typeof reward.pityAfter === "number" ? reward.pityAfter : 0,
        pullNumber: typeof reward.pullNumber === "number" ? reward.pullNumber : 0,
      };
    })
    .filter((entry): entry is GachaReward => Boolean(entry));
}

export async function POST(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const parsed = pullSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid gacha pull request." }, { status: 400 });
  }

  if (parsed.data.bannerSlug !== necrpTuffGachaBanner.slug) {
    return NextResponse.json({ error: "Gacha banner not found." }, { status: 404 });
  }

  try {
    await ensureFeaturedGachaCard(auth.supabase);

    const pullResult = await auth.supabase.rpc("grant_gacha_pulls", {
      p_user_id: auth.user.id,
      p_banner_slug: necrpTuffGachaBanner.slug,
      p_pull_count: parsed.data.pullCount,
      p_featured_slug: necrpTuffGachaBanner.featuredSlug,
      p_price_per_pull: necrpTuffGachaBanner.pricePerPull,
      p_hard_pity: necrpTuffGachaBanner.hardPity,
    });

    if (pullResult.error) {
      const needsMigration = pullResult.error.message.includes("grant_gacha_pulls") || pullResult.error.message.includes("function");
      return NextResponse.json({
        error: needsMigration
          ? "Gacha is not installed in Supabase yet. Run supabase/migrations/0011_divine_gacha.sql."
          : pullResult.error.message,
      }, { status: 500 });
    }

    const account = pullResult.data?.[0];
    if (!account) {
      return NextResponse.json({ error: "Gacha pull did not return rewards." }, { status: 500 });
    }

    const rewards = parseRewards(account.rewards);
    const rewardIds = rewards.map((reward) => reward.cardTemplateId);

    const cardsResult = await auth.supabase
      .from("card_templates")
      .select("*")
      .in("id", rewardIds);

    if (cardsResult.error) {
      return NextResponse.json({ error: cardsResult.error.message }, { status: 500 });
    }

    const rowsById = new Map((cardsResult.data ?? []).map((row) => [row.id, row]));
    const cards = rewardIds
      .map((id) => rowsById.get(id))
      .filter((row): row is Database["public"]["Tables"]["card_templates"]["Row"] => Boolean(row))
      .map(cardRowToTemplate);

    if (cards.length !== rewards.length) {
      return NextResponse.json({ error: "Gacha returned an unknown card." }, { status: 500 });
    }

    return NextResponse.json({
      cards,
      rewards,
      coins: account.coins,
      pity: {
        pullsSinceFeatured: account.pulls_since_featured,
        totalPulls: account.total_pulls,
        featuredCopies: account.featured_copies,
        guaranteedIn: Math.max(1, necrpTuffGachaBanner.hardPity - account.pulls_since_featured),
      },
      cost: account.cost,
      featuredHits: account.featured_hits,
      pityBefore: account.pity_before,
      pityAfter: account.pity_after,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not pull gacha." }, { status: 500 });
  }
}
