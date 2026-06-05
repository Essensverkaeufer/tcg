import type { CardTemplate } from "@/types/cards";

export type CardSortKey = "name" | "attack" | "health" | "size" | "aura" | "total" | "owned" | "deck";
export type SortDirection = "asc" | "desc";

export const cardSortOptions: Array<{ value: CardSortKey; label: string }> = [
  { value: "name", label: "Name" },
  { value: "attack", label: "Attack" },
  { value: "health", label: "Health" },
  { value: "size", label: "Size" },
  { value: "aura", label: "Aura" },
  { value: "total", label: "Total Stats" },
  { value: "owned", label: "Owned Count" },
];

export function sortCardEntries<T extends { card: CardTemplate; quantity?: number; deckQuantity?: number }>(
  entries: T[],
  sortKey: CardSortKey,
  direction: SortDirection,
) {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...entries].sort((left, right) => {
    const compared = compareSortValue(getSortValue(left, sortKey), getSortValue(right, sortKey));
    if (compared !== 0) return compared * multiplier;
    return left.card.name.localeCompare(right.card.name);
  });
}

function getSortValue(entry: { card: CardTemplate; quantity?: number; deckQuantity?: number }, sortKey: CardSortKey) {
  if (sortKey === "name") return entry.card.name.toLowerCase();
  if (sortKey === "owned") return entry.quantity ?? 0;
  if (sortKey === "deck") return entry.deckQuantity ?? 0;
  if (sortKey === "total") return entry.card.attack + entry.card.health + entry.card.size + entry.card.aura;
  return entry.card[sortKey];
}

function compareSortValue(left: string | number, right: string | number) {
  if (typeof left === "string" && typeof right === "string") return left.localeCompare(right);
  return Number(left) - Number(right);
}
