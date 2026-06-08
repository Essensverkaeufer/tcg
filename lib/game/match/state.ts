import { dealDamage, drawCards, findCard, getAbilityConditionError, getAbilityCooldownRemaining, getAbilityTargetError, getMaxHealth, getOpponent, getPlayer, MAX_HAND_SIZE, resolveTriggeredAbilities, sweepDeadCards } from "@/lib/game/abilities/engine";
import type { CardTemplate } from "@/types/cards";
import type { CardInstance, MatchAction, MatchPlayerState, MatchState, ValidationResult } from "@/types/match";

const MAX_BOARD_SIZE = 30;
const MAX_ENERGY = 10;
const STARTING_ENERGY = 3;
const ENERGY_GAIN_PER_TURN = 2;
export const ATTACK_ENERGY_COST = 1;

export function getCardCost(card: CardTemplate) {
  return Math.max(1, Math.min(MAX_ENERGY, Math.ceil((card.attack + card.health + card.size + card.aura) / 6)));
}

export function getUsedBoardSize(player: MatchPlayerState) {
  return player.board.reduce((sum, card) => sum + Math.max(0, card.currentSize), 0);
}

export function createMatchState(
  id: string,
  playerA: { id: string; name: string; deck: CardTemplate[] },
  playerB: { id: string; name: string; deck: CardTemplate[] },
  options: { deterministic?: boolean; seed?: string } = {},
): MatchState {
  const rngSeed = options.seed ?? crypto.randomUUID();
  const firstLeader = playerA.deck.find((card) => card.cardType === "LEADER");
  const secondLeader = playerB.deck.find((card) => card.cardType === "LEADER");

  if (!firstLeader || !secondLeader) {
    throw new Error("Both players need a Leader card before a match can start.");
  }
  const seededOptions = { ...options, seed: rngSeed };
  const first = createPlayerState(playerA.id, playerA.name, playerA.deck, firstLeader, seededOptions);
  const second = createPlayerState(playerB.id, playerB.name, playerB.deck, secondLeader, seededOptions);
  const startingPlayer = options.deterministic || seededNumber(`${rngSeed}:first-player`) < 0.5 ? first : second;

  drawCards(first, 5);
  drawCards(second, 5);
  startingPlayer.hasStartedTurn = true;
  startingPlayer.turnsStarted = 1;
  startingPlayer.skippedOpeningDraw = true;
  startingPlayer.energyMax = STARTING_ENERGY;
  startingPlayer.energyCurrent = STARTING_ENERGY;

  return {
    id,
    rngSeed,
    rngCounter: 0,
    turn: 1,
    activePlayerId: startingPlayer.playerId,
    firstPlayerId: startingPlayer.playerId,
    phase: "MAIN",
    players: [first, second],
    actionLog: [{ type: "START_MATCH" }],
    messages: [`${startingPlayer.displayName} starts the match with ${STARTING_ENERGY} energy and skips the first draw.`],
    lastEvent: {
      id: "start-match",
      type: "TURN",
      message: `${startingPlayer.displayName} starts the match.`,
    },
  };
}

export function validateAction(state: MatchState, action: MatchAction): ValidationResult {
  if (state.phase === "FINISHED") return { ok: false, reason: "Match is already finished." };
  if ("playerId" in action && action.playerId && action.type !== "START_MATCH" && action.playerId !== state.activePlayerId) {
    return { ok: false, reason: "It is not that player's turn." };
  }

  if (action.type === "PLAY_CARD") {
    const player = getPlayer(state, action.playerId);
    const card = player.hand.find((entry) => entry.instanceId === action.cardInstanceId);
    if (!card) return { ok: false, reason: "Card is not in hand." };
    const cost = getCardCost(card.template);
    if (player.energyCurrent < cost) return { ok: false, reason: `Not enough energy. Needs ${cost}.` };
    if (card.template.cardType === "ITEM") {
      if (!action.targetInstanceId) return { ok: false, reason: "Choose a friendly card or leader to equip this item." };
      const target = [player.leader, ...player.board].find((entry) => entry.instanceId === action.targetInstanceId);
      if (!target) return { ok: false, reason: "Items can only equip a friendly card or leader." };
      return { ok: true };
    }
    if (getUsedBoardSize(player) + Math.max(0, card.currentSize) > MAX_BOARD_SIZE) return { ok: false, reason: "Not enough board size space." };
  }

  if (action.type === "ATTACK") {
    const player = getPlayer(state, action.playerId);
    const attacker = player.board.find((entry) => entry.instanceId === action.attackerInstanceId);
    if (!attacker) return { ok: false, reason: "Attacker is not on the board." };
    if (player.energyCurrent < ATTACK_ENERGY_COST) return { ok: false, reason: `Not enough energy. Needs ${ATTACK_ENERGY_COST}.` };
    if (attacker.template.cardType === "BUILDING") return { ok: false, reason: "Buildings cannot attack by default." };
    if (attacker.exhausted) return { ok: false, reason: "Card is exhausted." };
    if (attacker.enteredTurn === state.turn) return { ok: false, reason: "Cards cannot attack on the turn they are played." };
    if ((attacker.stunnedUntilTurn ?? 0) >= state.turn) return { ok: false, reason: "Card is stunned." };
    if ((attacker.blindedUntilTurn ?? 0) >= state.turn) return { ok: false, reason: "Card is blinded." };
    const opponent = getOpponent(state, action.playerId);
    const target = [...opponent.board, opponent.leader].find((entry) => entry.instanceId === action.targetInstanceId);
    if (!target) return { ok: false, reason: "Invalid attack target." };
    const leaderIsProtected = target.instanceId === opponent.leader.instanceId && opponent.board.some((entry) => entry.template.cardType === "BUILDING");
    if (leaderIsProtected) return { ok: false, reason: "Destroy enemy buildings before attacking the leader." };
  }

  if (action.type === "USE_ABILITY") {
    const source = findCard(state, action.sourceInstanceId);
    if (!source) return { ok: false, reason: "Ability source is missing." };
    if (source.ownerId !== action.playerId) return { ok: false, reason: "That card is not yours." };
    if (source.zone !== "BOARD") return { ok: false, reason: "Only cards on board can use abilities." };
    const ability = source.template.abilityData.find((entry) => entry.id === action.abilityId);
    if (!ability || ability.trigger !== "ACTIVATED") return { ok: false, reason: "Card has no activated ability." };
    if (source.activatedThisTurn.includes(ability.id)) return { ok: false, reason: "Ability was already used this turn." };
    const sourceOwner = getPlayer(state, source.ownerId);
    if (ability.oncePerGame && sourceOwner.oncePerGameUsed.includes(ability.id)) return { ok: false, reason: "Ability was already used this game." };
    const cooldownRemaining = getAbilityCooldownRemaining(source, ability.id, sourceOwner.turnsStarted);
    if (cooldownRemaining > 0) return { ok: false, reason: `Ability is on cooldown for ${cooldownRemaining} more turn(s).` };
    if ((source.stunnedUntilTurn ?? 0) >= state.turn) return { ok: false, reason: "Card is stunned." };
    const conditionError = getAbilityConditionError(state, ability, action.playerId);
    if (conditionError) return { ok: false, reason: conditionError };
    const targetError = getAbilityTargetError(state, ability, action.playerId, action.targetInstanceId);
    if (targetError) return { ok: false, reason: targetError };
  }

  return { ok: true };
}

export function applyAction(state: MatchState, action: MatchAction): MatchState {
  const validation = validateAction(state, action);
  if (!validation.ok) throw new Error(validation.reason);

  let nextState = structuredClone(state);
  const messages: string[] = [];

  if (action.type === "END_TURN") {
    const current = getPlayer(nextState, action.playerId);
    for (const permanent of [current.leader, ...current.board]) {
      const resolved = resolveTriggeredAbilities(nextState, { trigger: "END_OF_TURN", source: permanent, controllerId: current.playerId });
      nextState = resolved.state;
      messages.push(...resolved.messages);
      if ((permanent.burnedUntilTurn ?? 0) >= nextState.turn) {
        messages.push(...dealDamage(permanent, 2, "Burn"));
      }
    }
    const opponent = getOpponent(nextState, action.playerId);
    nextState.activePlayerId = opponent.playerId;
    nextState.turn += 1;
    if (!opponent.hasStartedTurn) {
      opponent.hasStartedTurn = true;
    }
    opponent.turnsStarted += 1;
    opponent.energyMax = getEnergyForPlayerTurn(nextState, opponent);
    opponent.energyCurrent = opponent.energyMax;
    opponent.playedCardsThisTurn = 0;
    const shouldSkipDraw = !opponent.skippedOpeningDraw && opponent.playerId === nextState.firstPlayerId;
    if (shouldSkipDraw) {
      opponent.skippedOpeningDraw = true;
      messages.push(`${opponent.displayName} skipped the first draw.`);
    } else if (opponent.hand.length >= MAX_HAND_SIZE) {
      messages.push(`${opponent.displayName} already has ${MAX_HAND_SIZE} cards and did not draw.`);
    } else {
      const recycledBeforeDraw = opponent.deck.length === 0 && opponent.graveyard.length > 0;
      const drawn = drawCards(opponent, 1);
      if (recycledBeforeDraw) {
        messages.push(`${opponent.displayName}'s graveyard looped back into the deck.`);
      }
      if (drawn === 0) {
        messages.push(`${opponent.displayName} had no cards to draw.`);
      } else {
        messages.push(`${opponent.displayName} drew a card.`);
      }
    }
    opponent.board.forEach((card) => {
      card.exhausted = false;
      card.activatedThisTurn = [];
      clearExpiredStatuses(card, nextState.turn);
      if (card.poisoned) {
        messages.push(...dealDamage(card, 1, "Poison"));
      }
    });
    opponent.leader.activatedThisTurn = [];
    clearExpiredStatuses(opponent.leader, nextState.turn);
    if (opponent.leader.poisoned) {
      messages.push(...dealDamage(opponent.leader, 1, "Poison"));
    }
    for (const permanent of [opponent.leader, ...opponent.board]) {
      const resolved = resolveTriggeredAbilities(nextState, { trigger: "START_OF_TURN", source: permanent, controllerId: opponent.playerId });
      nextState = resolved.state;
      messages.push(...resolved.messages);
    }
    sweepDeadCards(nextState);
    messages.push(`${opponent.displayName}'s turn started.`);
  }

  if (action.type === "PLAY_CARD") {
    const player = getPlayer(nextState, action.playerId);
    const handIndex = player.hand.findIndex((entry) => entry.instanceId === action.cardInstanceId);
    const card = player.hand[handIndex];
    player.hand.splice(handIndex, 1);
    player.energyCurrent -= getCardCost(card.template);
    player.playedCardsThisTurn += 1;

    if (card.template.cardType === "ITEM") {
      const target = [player.leader, ...player.board].find((entry) => entry.instanceId === action.targetInstanceId)!;
      const comboMultiplier = getItemComboMultiplier(card.template, target.template);
      const attackBuff = card.currentAttack * comboMultiplier;
      const healthBuff = card.currentHealth * comboMultiplier;
      const auraBuff = card.currentAura * comboMultiplier;
      card.zone = "ATTACHED";
      target.attachedItems.push(card);
      target.currentAttack += attackBuff;
      target.currentHealth += healthBuff;
      target.currentMaxHealth += healthBuff;
      target.currentAura += auraBuff;
      if (comboMultiplier > 1) {
        messages.push(`Combo! ${card.template.name} gave ${target.template.name} ${comboMultiplier}x buffs.`);
      }
      messages.push(`${card.template.name} equipped ${target.template.name}.`);
    } else {
      card.zone = "BOARD";
      card.enteredTurn = nextState.turn;
      card.exhausted = true;
      player.board.push(card);
      if (card.currentHealth <= 0) {
        messages.push(`${card.template.name} has 0 HP and immediately went to the graveyard.`);
      }
    }
    messages.push(`${player.displayName} played ${card.template.name} for ${getCardCost(card.template)} energy.`);

    const resolved = resolveTriggeredAbilities(nextState, {
      trigger: "ON_PLAY",
      source: card,
      controllerId: player.playerId,
      targetInstanceId: action.targetInstanceId,
    });
    nextState = resolved.state;
    messages.push(...resolved.messages);
    sweepDeadCards(nextState);
  }

  if (action.type === "ATTACK") {
    const player = getPlayer(nextState, action.playerId);
    const attacker = player.board.find((entry) => entry.instanceId === action.attackerInstanceId)!;
    const opponent = getOpponent(nextState, action.playerId);
    const target = [...opponent.board, opponent.leader].find(
      (entry) => entry.instanceId === action.targetInstanceId,
    );
    if (!target) throw new Error("Invalid attack target.");

    player.energyCurrent -= ATTACK_ENERGY_COST;
    attacker.exhausted = true;
    messages.push(`${attacker.template.name} attacked ${target.template.name}.`);
    messages.push(...dealDamage(target, attacker.currentAttack, attacker.template.name));
    if (attacker.currentAttack > 0) {
      const onDamage = resolveTriggeredAbilities(nextState, { trigger: "ON_DAMAGE", source: attacker, controllerId: attacker.ownerId, targetInstanceId: target.instanceId });
      nextState = onDamage.state;
      messages.push(...onDamage.messages);
    }
    if (target.currentHealth > 0) {
      const damaged = resolveTriggeredAbilities(nextState, { trigger: "ON_DAMAGED", source: target, controllerId: target.ownerId });
      nextState = damaged.state;
      messages.push(...damaged.messages);
    } else {
      const death = resolveTriggeredAbilities(nextState, { trigger: "ON_DEATH", source: target, controllerId: target.ownerId });
      nextState = death.state;
      messages.push(...death.messages);
    }
    if (target.template.cardType === "CHARACTER" || target.template.cardType === "BUILDING") {
      messages.push(...dealDamage(attacker, target.currentAttack, target.template.name));
      if (target.currentAttack > 0) {
        const defenderDamage = resolveTriggeredAbilities(nextState, { trigger: "ON_DAMAGE", source: target, controllerId: target.ownerId, targetInstanceId: attacker.instanceId });
        nextState = defenderDamage.state;
        messages.push(...defenderDamage.messages);
      }
      if (attacker.currentHealth > 0) {
        const damaged = resolveTriggeredAbilities(nextState, { trigger: "ON_DAMAGED", source: attacker, controllerId: attacker.ownerId });
        nextState = damaged.state;
        messages.push(...damaged.messages);
      } else {
        const death = resolveTriggeredAbilities(nextState, { trigger: "ON_DEATH", source: attacker, controllerId: attacker.ownerId });
        nextState = death.state;
        messages.push(...death.messages);
      }
    }

    const resolved = resolveTriggeredAbilities(nextState, { trigger: "ON_ATTACK", source: attacker, controllerId: player.playerId, targetInstanceId: target.instanceId });
    nextState = resolved.state;
    messages.push(...resolved.messages);
    sweepDeadCards(nextState);
  }

  if (action.type === "USE_ABILITY") {
    const source = findCard(nextState, action.sourceInstanceId)!;
    const ability = source.template.abilityData.find((entry) => entry.id === action.abilityId)!;
    const resolved = resolveTriggeredAbilities(nextState, {
      trigger: "ACTIVATED",
      source,
      controllerId: action.playerId,
      targetInstanceId: action.targetInstanceId,
      abilityId: action.abilityId,
    });
    nextState = resolved.state;
    messages.push(`${source.template.name} used ${ability.label}.`);
    messages.push(...resolved.messages);
    sweepDeadCards(nextState);
  }

  if (nextState.phase === "FINISHED") {
    const winner = nextState.players.find((player) => player.playerId === nextState.winnerId);
    messages.unshift(nextState.draw ? "Draw. Both leaders hit 0 HP." : `${winner?.displayName ?? "A player"} wins. The enemy leader hit 0 HP.`);
  }

  nextState.actionLog.push(action);
  nextState.messages = [...messages, ...nextState.messages].slice(0, 8);
  nextState.lastEvent = {
    id: `${nextState.id}-${nextState.turn}-${nextState.actionLog.length}`,
    type: action.type === "END_TURN" ? "TURN" : action.type === "ATTACK" ? "ATTACK" : action.type === "USE_ABILITY" ? "ABILITY" : "PLAY",
    sourceInstanceId: "cardInstanceId" in action ? action.cardInstanceId : "attackerInstanceId" in action ? action.attackerInstanceId : "sourceInstanceId" in action ? action.sourceInstanceId : undefined,
    targetInstanceId: "targetInstanceId" in action ? action.targetInstanceId : undefined,
    message: messages[0] ?? "Action resolved.",
  };
  return nextState;
}

function createPlayerState(
  playerId: string,
  displayName: string,
  deck: CardTemplate[],
  leader: CardTemplate,
  options: { deterministic?: boolean; seed?: string },
): MatchPlayerState {
  const nonLeaderDeck = deck.filter((card) => card.slug !== leader.slug);

  return {
    playerId,
    displayName,
    leader: instantiateCard(leader, playerId, "BOARD", 0, options),
    deck: shuffle(nonLeaderDeck.map((card, index) => instantiateCard(card, playerId, "DECK", index, options)), options, playerId),
    hand: [],
    board: [],
    graveyard: [],
    energyCurrent: STARTING_ENERGY,
    energyMax: STARTING_ENERGY,
    hasStartedTurn: false,
    turnsStarted: 0,
    skippedOpeningDraw: false,
    playedCardsThisTurn: 0,
    oncePerGameUsed: [],
  };
}

function getEnergyForPlayerTurn(state: MatchState, player: MatchPlayerState) {
  const normalEnergy = STARTING_ENERGY + Math.max(0, player.turnsStarted - 1) * ENERGY_GAIN_PER_TURN;
  const secondPlayerBonus = player.playerId !== state.firstPlayerId && player.turnsStarted <= 2 ? 1 : 0;
  return Math.min(MAX_ENERGY, normalEnergy + secondPlayerBonus);
}

function getItemComboMultiplier(item: CardTemplate, target: CardTemplate) {
  if (item.slug === "zubr-beer" && target.slug === "necrps-drunken-dad") return 2;
  if (item.slug === "white-monster" && target.slug === "mwyi") return 2;
  if (item.slug === "the-bong" && target.slug === "garrett-prime") return 2;
  if (item.slug === "assault-rifle" && target.cardType === "CHARACTER" && isAmericanCard(target)) return 2;
  return 1;
}

function isAmericanCard(card: CardTemplate) {
  return card.category?.toUpperCase() === "AMERICAN";
}

function instantiateCard(template: CardTemplate, ownerId: string, zone: CardInstance["zone"], index: number, options: { deterministic?: boolean; seed?: string }): CardInstance {
  const maxHealth = template.cardType === "LEADER" ? template.health * 5 : template.health;
  return {
    instanceId: options.deterministic ? `${ownerId}-${template.slug}-${index}` : `${ownerId}-${template.slug}-${index}-${crypto.randomUUID()}`,
    ownerId,
    template,
    zone,
    currentAttack: template.attack,
    currentHealth: maxHealth,
    currentMaxHealth: maxHealth,
    currentSize: template.size,
    currentAura: template.aura,
    exhausted: false,
    shielded: false,
    activatedThisTurn: [],
    abilityCooldowns: {},
    attachedItems: [],
    enteredTurn: 0,
  };
}

function clearExpiredStatuses(card: CardInstance, turn: number) {
  if ((card.stunnedUntilTurn ?? 0) < turn) card.stunnedUntilTurn = undefined;
  if ((card.blindedUntilTurn ?? 0) < turn) card.blindedUntilTurn = undefined;
  if ((card.burnedUntilTurn ?? 0) < turn) card.burnedUntilTurn = undefined;
  card.currentHealth = Math.min(card.currentHealth, getMaxHealth(card));
}

function shuffle<T>(items: T[], options: { deterministic?: boolean; seed?: string }, salt: string) {
  if (options.deterministic) return items;
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(seededNumber(`${options.seed ?? "match"}:${salt}:shuffle:${index}`) * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function seededNumber(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;
  return (hash >>> 0) / 4294967296;
}
