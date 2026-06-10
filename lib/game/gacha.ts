import type { Rarity } from "@/types/cards";

export type GachaBanner = {
  slug: string;
  name: string;
  subtitle: string;
  featuredSlug: string;
  featuredLabel: string;
  pricePerPull: 100;
  hardPity: 100;
  allowedPullCounts: readonly [1, 10];
};

export const necrpTuffGachaBanner: GachaBanner = {
  slug: "necrp-tuff-constellation",
  name: "necrp Tuff Constellation",
  subtitle: "The original DIVINE constellation chase.",
  featuredSlug: "necrp-tuff-edition",
  featuredLabel: "necrp (tuff edition)",
  pricePerPull: 100,
  hardPity: 100,
  allowedPullCounts: [1, 10] as const,
};

export const pillowNecrpGachaBanner: GachaBanner = {
  slug: "pillow-necrp-constellation",
  name: "Pillow Necrp Constellation",
  subtitle: "A cozy DIVINE building banner with the same brutal pity.",
  featuredSlug: "pillow-necrp",
  featuredLabel: "pillow necrp",
  pricePerPull: 100,
  hardPity: 100,
  allowedPullCounts: [1, 10] as const,
};

export const traitFoundationsGachaBanner: GachaBanner = {
  slug: "trait-foundations-constellation",
  name: "Trait Foundations Constellation",
  subtitle: "A support banner for trait-based deckbuilding and hidden combo hunting.",
  featuredSlug: "trait-foundation-map",
  featuredLabel: "Trait Foundation Map",
  pricePerPull: 100,
  hardPity: 100,
  allowedPullCounts: [1, 10] as const,
};

export const gachaBanners = [necrpTuffGachaBanner, pillowNecrpGachaBanner, traitFoundationsGachaBanner] as const;

export const defaultGachaBanner = necrpTuffGachaBanner;

export type GachaPullCount = GachaBanner["allowedPullCounts"][number];

export const gachaRarityRates: Array<{ rarity: Exclude<Rarity, "DIVINE">; rate: number }> = [
  { rarity: "COMMON", rate: 78 },
  { rarity: "RARE", rate: 18 },
  { rarity: "EPIC", rate: 3 },
  { rarity: "LEGENDARY", rate: 0.75 },
  { rarity: "MYTHIC", rate: 0.2 },
  { rarity: "ULTRA_LEGENDARY", rate: 0.05 },
];

export function getGachaBanner(slug: string | null | undefined) {
  return gachaBanners.find((banner) => banner.slug === slug) ?? null;
}

export function getFeaturedChanceForNextPull(pullsSinceFeatured: number, banner: GachaBanner = defaultGachaBanner) {
  const nextPity = pullsSinceFeatured + 1;
  if (nextPity >= banner.hardPity) return 1;
  return Math.min(0.65, 0.005 * 1.05 ** (nextPity - 1));
}

export function getGuaranteedIn(pullsSinceFeatured: number, banner: GachaBanner = defaultGachaBanner) {
  return Math.max(1, banner.hardPity - pullsSinceFeatured);
}
