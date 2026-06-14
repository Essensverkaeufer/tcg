import type { Rarity } from "@/types/cards";

export type GachaBanner = {
  slug: string;
  name: string;
  subtitle: string;
  featuredSlugs: readonly string[];
  featuredLabels: readonly string[];
  pricePerPull: 100;
  hardPity: 100;
  allowedPullCounts: readonly [1, 10];
};

export const necrpTuffGachaBanner: GachaBanner = {
  slug: "necrp-tuff-constellation",
  name: "necrp Tuff Constellation",
  subtitle: "The original DIVINE constellation chase.",
  featuredSlugs: ["necrp-tuff-edition"],
  featuredLabels: ["necrp (tuff edition)"],
  pricePerPull: 100,
  hardPity: 100,
  allowedPullCounts: [1, 10] as const,
};

export const pillowNecrpGachaBanner: GachaBanner = {
  slug: "pillow-necrp-constellation",
  name: "Pillow Necrp Constellation",
  subtitle: "A cozy DIVINE building banner with the same brutal pity.",
  featuredSlugs: ["pillow-necrp"],
  featuredLabels: ["pillow necrp"],
  pricePerPull: 100,
  hardPity: 100,
  allowedPullCounts: [1, 10] as const,
};

export const evilRowletGachaBanner: GachaBanner = {
  slug: "evil-rowletforsenator-constellation",
  name: "Evil RowletForSenator Constellation",
  subtitle: "A corrupted DIVINE Rowlet banner for control-heavy American decks.",
  featuredSlugs: ["rowletforsenator-evil"],
  featuredLabels: ["RowletForSenator (Evil)"],
  pricePerPull: 100,
  hardPity: 100,
  allowedPullCounts: [1, 10] as const,
};

export const tateBrothersGachaBanner: GachaBanner = {
  slug: "tate-brothers-constellation",
  name: "Tate Brothers Constellation",
  subtitle: "A dual-feature DIVINE banner built around ego pressure and brother support.",
  featuredSlugs: ["andrew-tate", "tristan-tate"],
  featuredLabels: ["Andrew Tate", "Tristan Tate"],
  pricePerPull: 100,
  hardPity: 100,
  allowedPullCounts: [1, 10] as const,
};

export const gachaBanners = [necrpTuffGachaBanner, pillowNecrpGachaBanner, evilRowletGachaBanner, tateBrothersGachaBanner] as const;

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

export function getPrimaryFeaturedSlug(banner: GachaBanner) {
  return banner.featuredSlugs[0] ?? "";
}

export function getFeaturedLabel(banner: GachaBanner) {
  return banner.featuredLabels.join(" / ");
}

export function getFeaturedChanceForNextPull(pullsSinceFeatured: number, banner: GachaBanner = defaultGachaBanner) {
  const nextPity = pullsSinceFeatured + 1;
  if (nextPity >= banner.hardPity) return 1;
  return Math.min(0.65, 0.005 * 1.05 ** (nextPity - 1));
}

export function getGuaranteedIn(pullsSinceFeatured: number, banner: GachaBanner = defaultGachaBanner) {
  return Math.max(1, banner.hardPity - pullsSinceFeatured);
}
