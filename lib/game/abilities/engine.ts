import type { AbilityDefinition, AbilityEffect, AbilityTrigger } from "@/types/cards";
import type { CardInstance, MatchPlayerState, MatchState } from "@/types/match";

export type AbilityEvent = {
  trigger: AbilityTrigger;
  source: CardInstance;
  controllerId: string;
  targetInstanceId?: string;
  abilityId?: string;
};

export type AbilityResolution = {
  state: MatchState;
  messages: string[];
};

const unsupportedEffects = new Set(["SUMMON", "COPY_ABILITY", "REVIVE", "TRANSFORM", "ADD_RANDOM_CARD"]);
export const MAX_HAND_SIZE = 5;

export function getMaxHealth(card: CardInstance) {
  return card.currentMaxHealth ?? (card.template.cardType === "LEADER" ? card.template.health * 5 : card.template.health);
}

export function getAbilityTargetError(state: MatchState, ability: AbilityDefinition, controllerId: string, targetInstanceId?: string) {
  if (!ability.requiresTarget) return undefined;
  if (!targetInstanceId) return "Choose a target first.";

  const requestedTarget = findCard(state, targetInstanceId);
  if (!requestedTarget) return "Target is missing.";

  const invalidEffect = ability.effects.find((effect) => isEffectTargeted(effect) && !isValidEffectTarget(state, effect, controllerId, requestedTarget));
  if (invalidEffect) return `${ability.label} cannot target ${requestedTarget.template.name}.`;

  return undefined;
}

export function resolveTriggeredAbilities(state: MatchState, event: AbilityEvent): AbilityResolution {
  let nextState = structuredClone(state);
  const messages: string[] = [];
  const source = findCard(nextState, event.source.instanceId);

  if (!source) {
    return { state: nextState, messages };
  }

  for (const ability of source.template.abilityData) {
    if (ability.trigger !== event.trigger) continue;
    if (event.abilityId && ability.id !== event.abilityId) continue;
    if (!conditionsPass(nextState, ability, event.controllerId)) continue;
    if (ability.oncePerGame && hasUsedOncePerGame(nextState, event.controllerId, ability.id)) continue;
    if (ability.trigger === "ACTIVATED" && source.activatedThisTurn.includes(ability.id)) continue;

    for (const effect of ability.effects) {
      const result = applyEffect(nextState, effect, event, ability);
      nextState = result.state;
      messages.push(...result.messages);
    }

    if (ability.oncePerGame) {
      const controller = getPlayer(nextState, event.controllerId);
      controller.oncePerGameUsed.push(ability.id);
    }

    if (ability.trigger === "ACTIVATED") {
      const updatedSource = findCard(nextState, source.instanceId);
      updatedSource?.activatedThisTurn.push(ability.id);
    }
  }

  return { state: nextState, messages };
}

function applyEffect(
  state: MatchState,
  effect: AbilityEffect,
  event: AbilityEvent,
  ability: AbilityDefinition,
): AbilityResolution {
  let nextState = structuredClone(state);
  const controller = getPlayer(nextState, event.controllerId);
  const source = findCard(nextState, event.source.instanceId);
  const targets = selectTargets(nextState, effect, event);
  const messages: string[] = [];

  for (const target of targets) {
    switch (effect.type) {
      case "DAMAGE":
        messages.push(...dealDamage(target, effect.amount ?? 0, ability.label));
        if (source && source.instanceId !== target.instanceId) {
          const onDamage = resolveTriggeredAbilities(nextState, {
            trigger: "ON_DAMAGE",
            source,
            controllerId: source.ownerId,
            targetInstanceId: target.instanceId,
          });
          nextState = onDamage.state;
          messages.push(...onDamage.messages);
        }
        if (target.currentHealth > 0) {
          const damaged = resolveTriggeredAbilities(nextState, {
            trigger: "ON_DAMAGED",
            source: target,
            controllerId: target.ownerId,
          });
          nextState = damaged.state;
          messages.push(...damaged.messages);
        } else {
          const death = resolveTriggeredAbilities(nextState, {
            trigger: "ON_DEATH",
            source: target,
            controllerId: target.ownerId,
          });
          nextState = death.state;
          messages.push(...death.messages);
        }
        break;
      case "HEAL":
        target.currentHealth = Math.min(getMaxHealth(target), target.currentHealth + (effect.amount ?? 0));
        messages.push(`${ability.label} healed ${target.template.name} for ${effect.amount ?? 0}.`);
        {
          const healed = resolveTriggeredAbilities(nextState, {
            trigger: "ON_HEAL",
            source: target,
            controllerId: target.ownerId,
          });
          nextState = healed.state;
          messages.push(...healed.messages);
        }
        break;
      case "BUFF_ATTACK":
        target.currentAttack += effect.amount ?? 0;
        messages.push(`${ability.label} changed ${target.template.name}'s attack by ${effect.amount ?? 0}.`);
        break;
      case "BUFF_HEALTH":
        target.currentMaxHealth += effect.amount ?? 0;
        target.currentHealth += effect.amount ?? 0;
        messages.push(`${ability.label} changed ${target.template.name}'s health by ${effect.amount ?? 0}.`);
        break;
      case "BUFF_SIZE":
        target.currentSize = Math.max(0, target.currentSize + (effect.amount ?? 0));
        messages.push(`${ability.label} changed ${target.template.name}'s size by ${effect.amount ?? 0}.`);
        break;
      case "BUFF_AURA":
        target.currentAura = Math.max(0, target.currentAura + (effect.amount ?? 0));
        messages.push(`${ability.label} changed ${target.template.name}'s aura by ${effect.amount ?? 0}.`);
        break;
      case "SHIELD":
        target.shielded = true;
        messages.push(`${ability.label} shielded ${target.template.name}.`);
        break;
      case "STUN":
        target.stunnedUntilTurn = nextState.turn + 1;
        messages.push(`${ability.label} stunned ${target.template.name}.`);
        break;
      case "BLIND":
        target.blindedUntilTurn = nextState.turn + (effect.amount ?? 1);
        messages.push(`${ability.label} blinded ${target.template.name}.`);
        break;
      case "DESTROY":
        target.currentHealth = 0;
        messages.push(`${ability.label} destroyed ${target.template.name}.`);
        {
          const death = resolveTriggeredAbilities(nextState, {
            trigger: "ON_DEATH",
            source: target,
            controllerId: target.ownerId,
          });
          nextState = death.state;
          messages.push(...death.messages);
        }
        break;
      default:
        if (unsupportedEffects.has(effect.type)) {
          messages.push(`${ability.label} has an unsupported ${effect.type} effect.`);
        }
        break;
    }
  }

  if (effect.type === "DRAW") {
    const drawn = drawCards(controller, effect.amount ?? 1);
    messages.push(`${ability.label} drew ${drawn} card(s).`);
  }

  if (effect.type === "DISCARD") {
    const amount = effect.amount ?? 1;
    controller.graveyard.push(...controller.hand.splice(0, amount).map((card) => ({ ...card, zone: "GRAVEYARD" as const })));
    messages.push(`${ability.label} discarded ${amount} card(s).`);
  }

  sweepDeadCards(nextState);
  return { state: nextState, messages };
}

export function dealDamage(target: CardInstance, amount: number, label = "Damage") {
  if (amount <= 0) return [`${label} dealt 0 damage to ${target.template.name}.`];
  if (target.shielded) {
    target.shielded = false;
    return [`${target.template.name}'s shield blocked ${label}.`];
  }
  target.currentHealth -= amount;
  return [`${label} dealt ${amount} damage to ${target.template.name}.`];
}

export function drawCards(player: MatchPlayerState, amount = 1) {
  let drawn = 0;
  for (let index = 0; index < amount; index += 1) {
    if (player.hand.length >= MAX_HAND_SIZE) return drawn;
    const card = player.deck.shift();
    if (!card) return drawn;
    player.hand.push({ ...card, zone: "HAND" });
    drawn += 1;
  }
  return drawn;
}

export function sweepDeadCards(state: MatchState) {
  const defeatedLeaders: string[] = [];
  for (const player of state.players) {
    const deadBoard = player.board.filter((card) => card.currentHealth <= 0);
    player.board = player.board.filter((card) => card.currentHealth > 0);
    player.graveyard.push(...deadBoard.flatMap((card) => [
      { ...card, zone: "GRAVEYARD" as const },
      ...card.attachedItems.map((item) => ({ ...item, zone: "GRAVEYARD" as const })),
    ]));

    if (player.leader.currentHealth <= 0) {
      player.leader.currentHealth = 0;
      defeatedLeaders.push(player.playerId);
    }
  }

  if (defeatedLeaders.length === 2) {
    state.phase = "FINISHED";
    state.draw = true;
    state.winnerId = undefined;
  } else if (defeatedLeaders.length === 1) {
    state.phase = "FINISHED";
    state.winnerId = state.players.find((candidate) => candidate.playerId !== defeatedLeaders[0])?.playerId;
  }
}

function selectTargets(state: MatchState, effect: AbilityEffect, event: AbilityEvent): CardInstance[] {
  const controller = getPlayer(state, event.controllerId);
  const opponent = getOpponent(state, event.controllerId);
  const requestedTarget = event.targetInstanceId ? findCard(state, event.targetInstanceId) : undefined;

  switch (effect.target) {
    case "SELF":
      return findCard(state, event.source.instanceId) ? [findCard(state, event.source.instanceId)!] : [];
    case "FRIENDLY_LEADER":
    case "ALLY_LEADER":
      return [controller.leader];
    case "ENEMY_LEADER":
      return [opponent.leader];
    case "FRIENDLY_CHARACTER":
    case "ALLY_CHARACTER":
      return requestedTarget && requestedTarget.ownerId === controller.playerId && requestedTarget.zone === "BOARD"
        && matchesCardSlug(requestedTarget, effect.cardSlug)
        ? [requestedTarget]
        : controller.board.filter((card) => matchesCardSlug(card, effect.cardSlug)).slice(0, effect.amount ?? 1);
    case "ENEMY_CHARACTER":
      return requestedTarget && requestedTarget.ownerId === opponent.playerId && requestedTarget.zone === "BOARD"
        && requestedTarget.template.cardType === "CHARACTER"
        && matchesCardSlug(requestedTarget, effect.cardSlug)
        ? [requestedTarget]
        : opponent.board.filter((card) => card.template.cardType === "CHARACTER" && matchesCardSlug(card, effect.cardSlug)).slice(0, 1);
    case "ENEMY_BUILDING":
      return requestedTarget && requestedTarget.ownerId === opponent.playerId && requestedTarget.zone === "BOARD"
        && requestedTarget.template.cardType === "BUILDING"
        && matchesCardSlug(requestedTarget, effect.cardSlug)
        ? [requestedTarget]
        : opponent.board.filter((card) => card.template.cardType === "BUILDING" && matchesCardSlug(card, effect.cardSlug)).slice(0, 1);
    case "ANY_CHARACTER":
      return requestedTarget && requestedTarget.zone === "BOARD" && requestedTarget.template.cardType === "CHARACTER"
        && matchesCardSlug(requestedTarget, effect.cardSlug)
        ? [requestedTarget]
        : [...controller.board, ...opponent.board].filter((card) => card.template.cardType === "CHARACTER" && matchesCardSlug(card, effect.cardSlug)).slice(0, 1);
    case "ANY_BUILDING":
      return requestedTarget && requestedTarget.zone === "BOARD" && requestedTarget.template.cardType === "BUILDING"
        && matchesCardSlug(requestedTarget, effect.cardSlug)
        ? [requestedTarget]
        : [...controller.board, ...opponent.board].filter((card) => card.template.cardType === "BUILDING" && matchesCardSlug(card, effect.cardSlug)).slice(0, 1);
    case "RANDOM_ENEMY": {
      const pool = [...opponent.board, opponent.leader];
      const picked = pool[Math.floor(nextRandom(state) * pool.length)];
      return picked ? [picked] : [];
    }
    default:
      return [];
  }
}

function isEffectTargeted(effect: AbilityEffect) {
  return !["SELF", "RANDOM_ENEMY", "BOARD", "HAND", "DECK", "GRAVEYARD"].includes(effect.target);
}

function isValidEffectTarget(state: MatchState, effect: AbilityEffect, controllerId: string, target: CardInstance) {
  const controller = getPlayer(state, controllerId);
  const opponent = getOpponent(state, controllerId);
  if (!matchesCardSlug(target, effect.cardSlug)) return false;

  switch (effect.target) {
    case "FRIENDLY_LEADER":
    case "ALLY_LEADER":
      return target.instanceId === controller.leader.instanceId;
    case "ENEMY_LEADER":
      return target.instanceId === opponent.leader.instanceId;
    case "FRIENDLY_CHARACTER":
    case "ALLY_CHARACTER":
      return target.ownerId === controller.playerId && target.zone === "BOARD" && target.template.cardType === "CHARACTER";
    case "ENEMY_CHARACTER":
      return target.ownerId === opponent.playerId && target.zone === "BOARD" && target.template.cardType === "CHARACTER";
    case "ENEMY_BUILDING":
      return target.ownerId === opponent.playerId && target.zone === "BOARD" && target.template.cardType === "BUILDING";
    case "ANY_CHARACTER":
      return target.zone === "BOARD" && target.template.cardType === "CHARACTER";
    case "ANY_BUILDING":
      return target.zone === "BOARD" && target.template.cardType === "BUILDING";
    default:
      return true;
  }
}

function matchesCardSlug(card: CardInstance, cardSlug?: string) {
  return !cardSlug || card.template.slug === cardSlug;
}

function nextRandom(state: MatchState) {
  const value = seededNumber(`${state.rngSeed}:${state.rngCounter}`);
  state.rngCounter += 1;
  return value;
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

function conditionsPass(state: MatchState, ability: AbilityDefinition, controllerId: string) {
  const controller = getPlayer(state, controllerId);

  return (ability.conditions ?? []).every((condition) => {
    if (condition.type === "PLAYED_CARDS_THIS_TURN") {
      const value = Number(condition.value ?? 0);
      if (condition.operator === ">=") return controller.playedCardsThisTurn >= value;
      if (condition.operator === "<=") return controller.playedCardsThisTurn <= value;
      if (condition.operator === "==") return controller.playedCardsThisTurn === value;
    }
    return true;
  });
}

function hasUsedOncePerGame(state: MatchState, playerId: string, abilityId: string) {
  return getPlayer(state, playerId).oncePerGameUsed.includes(abilityId);
}

export function getPlayer(state: MatchState, playerId: string) {
  const player = state.players.find((entry) => entry.playerId === playerId);
  if (!player) throw new Error(`Player ${playerId} is not in match ${state.id}.`);
  return player;
}

export function getOpponent(state: MatchState, playerId: string) {
  const opponent = state.players.find((entry) => entry.playerId !== playerId);
  if (!opponent) throw new Error(`Opponent for ${playerId} is missing.`);
  return opponent;
}

export function findCard(state: MatchState, instanceId: string) {
  for (const player of state.players) {
    const attached = [player.leader, ...player.board].flatMap((card) => card.attachedItems);
    const allCards = [player.leader, ...player.deck, ...player.hand, ...player.board, ...player.graveyard, ...attached];
    const card = allCards.find((entry) => entry.instanceId === instanceId);
    if (card) return card;
  }
}
