import type { Rarity } from "@/types/cards";

export const necrpTuffGachaBanner = {
  slug: "necrp-tuff-constellation",
  name: "necrp Tuff Constellation",
  featuredSlug: "necrp-tuff-edition",
  pricePerPull: 100,
  hardPity: 50,
  allowedPullCounts: [1, 10] as const,
};

export type GachaPullCount = typeof necrpTuffGachaBanner.allowedPullCounts[number];

export const gachaRarityRates: Array<{ rarity: Exclude<Rarity, "DIVINE">; rate: number }> = [
  { rarity: "COMMON", rate: 78 },
  { rarity: "RARE", rate: 18 },
  { rarity: "EPIC", rate: 3 },
  { rarity: "LEGENDARY", rate: 0.75 },
  { rarity: "MYTHIC", rate: 0.2 },
  { rarity: "ULTRA_LEGENDARY", rate: 0.05 },
];

export function getFeaturedChanceForNextPull(pullsSinceFeatured: number) {
  const nextPity = pullsSinceFeatured + 1;
  if (nextPity >= necrpTuffGachaBanner.hardPity) return 1;
  if (nextPity <= 25) return 0.005;
  return Math.min(0.65, 0.005 * 1.35 ** (nextPity - 25));
}

export function getGuaranteedIn(pullsSinceFeatured: number) {
  return Math.max(1, necrpTuffGachaBanner.hardPity - pullsSinceFeatured);
}
