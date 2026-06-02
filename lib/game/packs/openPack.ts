import type { CardTemplate, Rarity } from "@/types/cards";

export type PackOpeningResult = {
  cards: CardTemplate[];
};

const defaultRarityWeights: Record<Rarity, number> = {
  COMMON: 760,
  RARE: 200,
  EPIC: 32,
  LEGENDARY: 7,
  MYTHIC: 1,
  ULTRA_LEGENDARY: 0,
  DIVINE: 0,
};

export function openPack(cardPool: CardTemplate[], cardCount = 5, rarityWeights = defaultRarityWeights): PackOpeningResult {
  if (cardPool.length === 0) {
    return {
      cards: [],
    };
  }

  const cards: CardTemplate[] = [];

  for (let slot = 0; slot < cardCount; slot += 1) {
    const rarity = rollRarity(rarityWeights);
    cards.push(randomCardOfRarity(cardPool, rarity) ?? randomCardOfRarity(cardPool, "COMMON") ?? cardPool[0]);
  }

  return {
    cards,
  };
}

function rollRarity(rarityWeights: Record<Rarity, number>): Rarity {
  const entries = Object.entries(rarityWeights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity as Rarity;
  }

  return "COMMON";
}

function randomCardOfRarity(cardPool: CardTemplate[], rarity: Rarity) {
  const cards = cardPool.filter((card) => card.rarity === rarity);
  return cards[Math.floor(Math.random() * cards.length)];
}
