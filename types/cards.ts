export type CardType = "CHARACTER" | "BUILDING" | "ITEM" | "LEADER";
export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC" | "ULTRA_LEGENDARY" | "DIVINE";

export type AbilityTrigger =
  | "ON_PLAY"
  | "ON_DEATH"
  | "ON_ATTACK"
  | "ON_DAMAGE"
  | "ON_DAMAGED"
  | "ON_HEAL"
  | "START_OF_TURN"
  | "END_OF_TURN"
  | "WHEN_DRAWN"
  | "WHEN_DISCARDED"
  | "CARD_PLAYED"
  | "LEADER_DAMAGED"
  | "ACTIVATED"
  | "PASSIVE";

export type AbilityTarget =
  | "SELF"
  | "FRIENDLY_CHARACTER"
  | "FRIENDLY_LEADER"
  | "ALLY_CHARACTER"
  | "ALLY_LEADER"
  | "FRIENDLY_BOARD_AND_LEADER"
  | "ENEMY_BUILDING"
  | "ENEMY_CHARACTER"
  | "ENEMY_BOARD_CHARACTERS"
  | "ENEMY_LEADER"
  | "RANDOM_ENEMY"
  | "RANDOM_ENEMY_CHARACTER"
  | "ANY_CHARACTER"
  | "ANY_BUILDING"
  | "BOARD"
  | "HAND"
  | "DECK"
  | "GRAVEYARD";

export type EffectType =
  | "DAMAGE"
  | "HEAL"
  | "BUFF_ATTACK"
  | "BUFF_HEALTH"
  | "BUFF_SIZE"
  | "BUFF_AURA"
  | "CHANCE_DESTROY"
  | "DRAW"
  | "DESTROY"
  | "SUMMON"
  | "SHIELD"
  | "STUN"
  | "BLIND"
  | "COIN_FLIP"
  | "COPY_ABILITY"
  | "REVIVE"
  | "TRANSFORM"
  | "DISCARD"
  | "ADD_RANDOM_CARD";

export type AbilityCondition = {
  type:
    | "PLAYED_CARDS_THIS_TURN"
    | "TARGET_DAMAGED"
    | "ONCE_PER_GAME"
    | "RARITY_IN_HAND"
    | "CARD_IN_HAND"
    | "LEADER_IS";
  operator?: ">=" | "<=" | "==" | "!=";
  value?: number | string;
  cardSlug?: string;
  cardSlugs?: string[];
};

export type AbilityEffect = {
  type: EffectType;
  target: AbilityTarget;
  amount?: number;
  chance?: number;
  cardSlug?: string;
  duration?: "TURN" | "PERMANENT";
  metadata?: Record<string, unknown>;
};

export type AbilityDefinition = {
  id: string;
  label: string;
  trigger: AbilityTrigger;
  timing?: "BEFORE" | "AFTER";
  oncePerGame?: boolean;
  cooldownTurns?: number;
  requiresTarget?: boolean;
  conditions?: AbilityCondition[];
  effects: AbilityEffect[];
};

export type CardTemplate = {
  slug: string;
  name: string;
  description: string;
  flavorText: string;
  rarity: Rarity;
  cardType: CardType;
  attack: number;
  health: number;
  size: number;
  aura: number;
  category?: string;
  traits?: string[];
  imageUrl: string;
  soundEffectUrl?: string;
  dropEnabled?: boolean;
  abilityData: AbilityDefinition[];
};
