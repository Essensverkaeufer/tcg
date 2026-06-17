import type { Rarity } from "@/types/cards";

export type PackDefinition = {
  slug: string;
  name: string;
  description: string;
  priceCoins: number;
  cardCount: number;
  accent: string;
  rarityWeights: Record<Rarity, number>;
};

export const packRarityOrder: Rarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC", "ULTRA_LEGENDARY", "DIVINE"];

export const packDefinitions: PackDefinition[] = [
  {
    slug: "core-pack",
    name: "Core Pack",
    description: "General card pool with all current card types.",
    priceCoins: 50,
    cardCount: 5,
    accent: "rose",
    rarityWeights: {
      COMMON: 760,
      RARE: 200,
      EPIC: 32,
      LEGENDARY: 7,
      MYTHIC: 1,
      ULTRA_LEGENDARY: 0,
      DIVINE: 0,
    },
  },
  {
    slug: "character-pack",
    name: "Character Pack",
    description: "Character-heavy pack shell for later filtered drops.",
    priceCoins: 75,
    cardCount: 5,
    accent: "sky",
    rarityWeights: {
      COMMON: 650,
      RARE: 260,
      EPIC: 70,
      LEGENDARY: 16,
      MYTHIC: 3,
      ULTRA_LEGENDARY: 1,
      DIVINE: 0,
    },
  },
  {
    slug: "chaos-pack",
    name: "Chaos Pack",
    description: "Future weird pack for events and high-rarity nonsense.",
    priceCoins: 150,
    cardCount: 5,
    accent: "violet",
    rarityWeights: {
      COMMON: 925,
      RARE: 0,
      EPIC: 0,
      LEGENDARY: 60,
      MYTHIC: 13,
      ULTRA_LEGENDARY: 2,
      DIVINE: 0,
    },
  },
  {
    slug: "premium-pack",
    name: "Premium Pack",
    description: "Discounted high-roller pack with more cards and cleaner high-rarity odds.",
    priceCoins: 250,
    cardCount: 7,
    accent: "amber",
    rarityWeights: {
      COMMON: 420,
      RARE: 330,
      EPIC: 170,
      LEGENDARY: 55,
      MYTHIC: 18,
      ULTRA_LEGENDARY: 6,
      DIVINE: 1,
    },
  },
  {
    slug: "ascendant-pack",
    name: "Ascendant Pack",
    description: "Big pull session with stronger odds across every premium rarity.",
    priceCoins: 500,
    cardCount: 10,
    accent: "emerald",
    rarityWeights: {
      COMMON: 300,
      RARE: 330,
      EPIC: 240,
      LEGENDARY: 90,
      MYTHIC: 28,
      ULTRA_LEGENDARY: 10,
      DIVINE: 2,
    },
  },
  {
    slug: "god-chase-pack",
    name: "God Chase Pack",
    description: "Best value high-roller pack. Still weighted rolls only, never guaranteed.",
    priceCoins: 1000,
    cardCount: 12,
    accent: "fuchsia",
    rarityWeights: {
      COMMON: 200,
      RARE: 300,
      EPIC: 310,
      LEGENDARY: 130,
      MYTHIC: 42,
      ULTRA_LEGENDARY: 15,
      DIVINE: 3,
    },
  },
];

export function getPackDefinition(slug: string) {
  return packDefinitions.find((pack) => pack.slug === slug);
}

export function getPackRarityOdds(pack: PackDefinition) {
  const total = packRarityOrder.reduce((sum, rarity) => sum + pack.rarityWeights[rarity], 0);
  return packRarityOrder.map((rarity) => ({
    rarity,
    percent: total > 0 ? (pack.rarityWeights[rarity] / total) * 100 : 0,
  }));
}
