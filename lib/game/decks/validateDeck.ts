import type { CardTemplate } from "@/types/cards";

export type DeckInputCard = {
  card: CardTemplate;
  quantity: number;
};

export type DeckValidation = {
  valid: boolean;
  errors: string[];
};

export const deckRules = {
  minDeckSize: 10,
  leaders: 1,
  maxCopies: 2,
  maxHighRarityCopies: 1,
};

const highRarities = ["LEGENDARY", "MYTHIC", "ULTRA_LEGENDARY"];

export function validateDeck(cards: DeckInputCard[]): DeckValidation {
  const errors: string[] = [];
  const totalCards = cards.reduce((sum, entry) => sum + entry.quantity, 0);
  const leaders = cards.filter((entry) => entry.card.cardType === "LEADER").reduce((sum, entry) => sum + entry.quantity, 0);

  if (totalCards < deckRules.minDeckSize) {
    errors.push(`Deck must contain at least ${deckRules.minDeckSize} cards.`);
  }

  if (leaders !== deckRules.leaders) {
    errors.push("Deck must contain exactly 1 Leader card.");
  }

  for (const entry of cards) {
    if (entry.card.cardType === "LEADER" && entry.quantity > 1) {
      errors.push(`${entry.card.name} is a Leader and can only appear once.`);
    }

    if (highRarities.includes(entry.card.rarity) && entry.quantity > deckRules.maxHighRarityCopies) {
      errors.push(`${entry.card.name} is ${entry.card.rarity} and can only appear once.`);
    }

    if (entry.card.cardType !== "LEADER" && !highRarities.includes(entry.card.rarity) && entry.quantity > deckRules.maxCopies) {
      errors.push(`${entry.card.name} has more than ${deckRules.maxCopies} copies.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
