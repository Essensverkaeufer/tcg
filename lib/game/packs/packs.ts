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

export const packDefinitions: PackDefinition[] = [
  {
    slug: "core-pack",
    name: "Core Pack",
    description: "General card pool with all current card types.",
    priceCoins: 100,
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
    priceCoins: 150,
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
    priceCoins: 300,
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
];

export function getPackDefinition(slug: string) {
  return packDefinitions.find((pack) => pack.slug === slug);
}
