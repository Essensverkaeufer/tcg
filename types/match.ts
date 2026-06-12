import type { CardTemplate } from "./cards";

export type PlayerId = string;
export type Zone = "DECK" | "HAND" | "BOARD" | "GRAVEYARD" | "ATTACHED";

export type BattleVisualEventType =
  | "DRAW"
  | "PLAY"
  | "ITEM_ATTACH"
  | "COMBO"
  | "ATTACK"
  | "DAMAGE"
  | "HEAL"
  | "BUFF"
  | "STATUS"
  | "ABILITY"
  | "DEATH"
  | "TURN"
  | "ENERGY"
  | "ERROR"
  | "VICTORY";

export type BattleVisualEvent = {
  id: string;
  type: BattleVisualEventType;
  playerId?: PlayerId;
  sourceInstanceId?: string;
  targetInstanceId?: string;
  amount?: number;
  label?: string;
  message?: string;
};

export type CardInstance = {
  instanceId: string;
  ownerId: PlayerId;
  template: CardTemplate;
  zone: Zone;
  currentAttack: number;
  currentHealth: number;
  currentMaxHealth: number;
  currentSize: number;
  currentAura: number;
  exhausted: boolean;
  shielded: boolean;
  activatedThisTurn: string[];
  abilityCooldowns: Record<string, number>;
  attachedItems: CardInstance[];
  temporaryEffects?: Array<{
    id: string;
    expiresOnOwnerTurn: number;
    attack: number;
    health: number;
    size: number;
    aura: number;
    afterAttack: number;
    afterHealth: number;
    afterSize: number;
    afterAura: number;
  }>;
  blindedUntilTurn?: number;
  stunnedUntilTurn?: number;
  poisoned?: boolean;
  burnedUntilTurn?: number;
  enteredTurn: number;
};

export type MatchPlayerState = {
  playerId: PlayerId;
  displayName: string;
  leader: CardInstance;
  deck: CardInstance[];
  hand: CardInstance[];
  board: CardInstance[];
  graveyard: CardInstance[];
  energyCurrent: number;
  energyMax: number;
  hasStartedTurn: boolean;
  turnsStarted: number;
  skippedOpeningDraw: boolean;
  playedCardsThisTurn: number;
  oncePerGameUsed: string[];
};

export type MatchState = {
  id: string;
  rngSeed: string;
  rngCounter: number;
  turn: number;
  activePlayerId: PlayerId;
  firstPlayerId: PlayerId;
  phase: "START" | "MAIN" | "END" | "FINISHED";
  players: [MatchPlayerState, MatchPlayerState];
  actionLog: MatchAction[];
  messages: string[];
  lastEvent?: {
    id: string;
    type: "DRAW" | "PLAY" | "ATTACK" | "ABILITY" | "DEATH" | "TURN" | "ERROR";
    sourceInstanceId?: string;
    targetInstanceId?: string;
    message: string;
    visualEvents?: BattleVisualEvent[];
  };
  winnerId?: PlayerId;
  draw?: boolean;
};

export type MatchAction =
  MatchActionMeta & (
    | { type: "START_MATCH"; playerId?: PlayerId }
    | { type: "END_TURN"; playerId: PlayerId }
    | { type: "PLAY_CARD"; playerId: PlayerId; cardInstanceId: string; targetInstanceId?: string }
    | { type: "ATTACK"; playerId: PlayerId; attackerInstanceId: string; targetInstanceId: string }
    | { type: "USE_ABILITY"; playerId: PlayerId; sourceInstanceId: string; abilityId: string; targetInstanceId?: string }
  );

export type MatchActionMeta = {
  matchId?: string;
  actionSeq?: number;
  clientActionId?: string;
  createdAt?: string;
};

export type ValidationResult = {
  ok: boolean;
  reason?: string;
};
