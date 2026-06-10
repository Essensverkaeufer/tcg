import type { CardTemplate } from "@/types/cards";
import type { Database, Json } from "@/types/supabase";
import { normalizeTraits } from "@/lib/game/traits";

export type SupabaseCardRow = Database["public"]["Tables"]["card_templates"]["Row"];

export function cardRowToTemplate(row: SupabaseCardRow): CardTemplate {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    flavorText: row.flavor_text ?? "",
    rarity: row.rarity,
    cardType: row.card_type,
    attack: row.attack,
    health: row.health,
    size: row.size,
    aura: row.aura,
    category: row.category ?? undefined,
    traits: normalizeTraits(row.traits ?? [], row.category ?? undefined),
    imageUrl: row.image_url,
    soundEffectUrl: row.sound_effect_url ?? "",
    dropEnabled: row.drop_enabled ?? true,
    abilityData: Array.isArray(row.ability_data) ? row.ability_data as CardTemplate["abilityData"] : [],
  };
}

export function cardTemplateToInsert(card: CardTemplate): Database["public"]["Tables"]["card_templates"]["Insert"] {
  return {
    slug: card.slug,
    name: card.name,
    description: card.description,
    rarity: card.rarity,
    card_type: card.cardType,
    attack: card.attack,
    health: card.health,
    size: card.size,
    aura: card.aura,
    category: card.category ?? null,
    traits: normalizeTraits(card.traits, card.category),
    image_url: card.imageUrl,
    sound_effect_url: card.soundEffectUrl ?? "",
    drop_enabled: card.dropEnabled ?? true,
    flavor_text: card.flavorText,
    ability_data: card.abilityData as Json,
    balance_version: "prototype-0.1",
  };
}
