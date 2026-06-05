import type { AbilityDefinition, Rarity } from "@/types/cards";

export const cardCreatorStatSuggestions: Record<Rarity, {
  attack: number;
  health: number;
  size: number;
  aura: number;
}> = {
  COMMON: { attack: 4, health: 5, size: 4, aura: 2 },
  RARE: { attack: 9, health: 10, size: 5, aura: 7 },
  EPIC: { attack: 10, health: 23, size: 10, aura: 7 },
  LEGENDARY: { attack: 9, health: 10, size: 5, aura: 10 },
  MYTHIC: { attack: 10, health: 25, size: 9, aura: 10 },
  ULTRA_LEGENDARY: { attack: 10, health: 10, size: 10, aura: 10 },
  DIVINE: { attack: 12, health: 50, size: 9, aura: 12 },
};

export const maxCardMediaBytes = 10 * 1024 * 1024;
export const imageMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
export const soundMimeTypes = new Set(["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/webm"]);

export function slugifyCardName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    || "card";
}

export function extensionFromFile(file: File, fallback: string) {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (extension) return extension;
  const [, subtype] = file.type.split("/");
  return subtype?.replace(/[^a-z0-9]/g, "") || fallback;
}

export function parseAbilityJson(value: string): AbilityDefinition[] {
  const parsed = JSON.parse(value) as unknown;
  return validateAbilityData(parsed);
}

export function validateAbilityData(value: unknown): AbilityDefinition[] {
  if (!Array.isArray(value)) throw new Error("Ability JSON must be an array.");
  for (const ability of value) {
    if (!ability || typeof ability !== "object") throw new Error("Each ability must be an object.");
    const candidate = ability as Partial<AbilityDefinition>;
    if (typeof candidate.id !== "string" || typeof candidate.label !== "string" || typeof candidate.trigger !== "string") {
      throw new Error("Each ability needs id, label, and trigger.");
    }
    if (!Array.isArray(candidate.effects)) throw new Error("Each ability needs an effects array.");
  }
  return value as AbilityDefinition[];
}
