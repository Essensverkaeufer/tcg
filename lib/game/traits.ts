import type { CardTemplate } from "@/types/cards";

export const visibleTraitValues = [
  "AMERICAN",
  "STORY",
  "BOSS",
  "REWARD",
  "COMBO_PIECE",
  "CONTROL",
  "TANK",
  "SUPPORT",
  "AGGRESSIVE",
  "FOUNDATION",
  "BASED",
  "MINOR",
] as const;

export function normalizeTrait(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

export function normalizeTraits(values: readonly string[] | undefined, fallbackCategory?: string) {
  const traits = new Set<string>();

  for (const value of values ?? []) {
    const normalized = normalizeTrait(value);
    if (normalized) traits.add(normalized);
  }

  if (fallbackCategory) {
    const categoryTrait = normalizeTrait(fallbackCategory);
    if (categoryTrait && categoryTrait !== "STORY_BOSS" && categoryTrait !== "STORY_REWARD") traits.add(categoryTrait);
  }

  if (traits.has("STORY_BOSS")) {
    traits.delete("STORY_BOSS");
    traits.add("STORY");
    traits.add("BOSS");
  }
  if (traits.has("STORY_REWARD")) {
    traits.delete("STORY_REWARD");
    traits.add("STORY");
    traits.add("REWARD");
  }

  return Array.from(traits).sort();
}

export function parseTraitInput(value: string) {
  return normalizeTraits(value.split(","));
}

export function formatTraitsForInput(values: readonly string[] | undefined) {
  return normalizeTraits(values).join(", ");
}

export function getVisibleTraits(card: CardTemplate) {
  const traits = normalizeTraits(card.traits, card.category);

  if (card.dropEnabled === false && !traits.includes("STORY")) traits.push("STORY");
  if (card.cardType === "ITEM" && !traits.includes("COMBO_PIECE")) traits.push("COMBO_PIECE");

  return normalizeTraits(traits);
}

export function shareVisibleTrait(left: CardTemplate, right: CardTemplate) {
  const rightTraits = new Set(getVisibleTraits(right));
  return getVisibleTraits(left).some((trait) => rightTraits.has(trait));
}
