import { highRarities } from "@/lib/game/rarities";
import type { CardTemplate, Rarity } from "@/types/cards";

export const duplicateCreditValues: Record<Rarity, number> = {
  COMMON: 5,
  RARE: 15,
  EPIC: 50,
  LEGENDARY: 150,
  MYTHIC: 400,
  ULTRA_LEGENDARY: 900,
  DIVINE: 1500,
};

export const craftCreditCosts: Record<Rarity, number> = {
  COMMON: 30,
  RARE: 90,
  EPIC: 300,
  LEGENDARY: 900,
  MYTHIC: 2400,
  ULTRA_LEGENDARY: 5000,
  DIVINE: 9000,
};

export function getProtectedDuplicateCopies(card: CardTemplate) {
  return card.cardType === "LEADER" || highRarities.includes(card.rarity) ? 1 : 2;
}

export function getConvertibleCopies(card: CardTemplate, quantity: number) {
  return Math.max(0, quantity - getProtectedDuplicateCopies(card));
}

export function getDuplicateCreditValue(card: CardTemplate) {
  return duplicateCreditValues[card.rarity];
}

export function getCraftCost(card: CardTemplate) {
  return craftCreditCosts[card.rarity];
}
