import { getAbilityCooldownRemaining } from "@/lib/game/abilities/engine";
import { ATTACK_ENERGY_COST, getCardCost, validateAction } from "@/lib/game/match/state";
import type { StoryBotPersonality, StoryDifficulty } from "@/lib/game/story/config";
import { getVisibleTraits } from "@/lib/game/traits";
import type { AbilityDefinition, AbilityEffect, CardTemplate } from "@/types/cards";
import type { CardInstance, MatchAction, MatchPlayerState, MatchState } from "@/types/match";

type ScoredAction = {
  action: MatchAction;
  score: number;
};

export function chooseBotAction(
  state: MatchState,
  botPlayerId: string,
  difficulty: StoryDifficulty,
  personality: StoryBotPersonality = "BALANCED",
): MatchAction {
  const bot = state.players.find((player) => player.playerId === botPlayerId);
  const opponent = state.players.find((player) => player.playerId !== botPlayerId);

  if (!bot || !opponent || state.phase === "FINISHED" || state.activePlayerId !== botPlayerId) {
    return { type: "END_TURN", playerId: botPlayerId };
  }

  const candidates = [
    ...chooseAbilityCandidates(state, bot, opponent, difficulty, personality),
    ...choosePlayCandidates(state, bot, opponent, difficulty, personality),
    ...chooseAttackCandidates(state, bot, opponent, difficulty, personality),
  ]
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);

  return candidates[0]?.action ?? { type: "END_TURN", playerId: botPlayerId };
}

function choosePlayCandidates(
  state: MatchState,
  bot: MatchPlayerState,
  opponent: MatchPlayerState,
  difficulty: StoryDifficulty,
  personality: StoryBotPersonality,
) {
  const candidates: ScoredAction[] = [];

  for (const card of bot.hand) {
    if (card.template.cardType === "ITEM") {
      for (const target of [bot.leader, ...bot.board]) {
        const action: MatchAction = { type: "PLAY_CARD", playerId: bot.playerId, cardInstanceId: card.instanceId, targetInstanceId: target.instanceId };
        if (!validateAction(state, action).ok) continue;
        candidates.push({
          action,
          score: scoreItemPlay(card, target, bot, opponent, difficulty, personality),
        });
      }
      continue;
    }

    const action: MatchAction = { type: "PLAY_CARD", playerId: bot.playerId, cardInstanceId: card.instanceId };
    if (!validateAction(state, action).ok) continue;
    candidates.push({
      action,
      score: scoreCard(card, difficulty, personality) + playCurveBonus(card, bot, difficulty, personality),
    });
  }

  return candidates;
}

function chooseAbilityCandidates(
  state: MatchState,
  bot: MatchPlayerState,
  opponent: MatchPlayerState,
  difficulty: StoryDifficulty,
  personality: StoryBotPersonality,
) {
  if (difficulty === "EASY") return [];

  const candidates: ScoredAction[] = [];
  const sources = [bot.leader, ...bot.board]
    .flatMap((card) => card.template.abilityData
      .filter((ability) => ability.trigger === "ACTIVATED")
      .map((ability) => ({ card, ability })));

  for (const { card, ability } of sources) {
    if (card.activatedThisTurn.includes(ability.id)) continue;
    if (getAbilityCooldownRemaining(card, ability.id, bot.turnsStarted) > 0) continue;

    if (!ability.requiresTarget) {
      const action: MatchAction = { type: "USE_ABILITY", playerId: bot.playerId, sourceInstanceId: card.instanceId, abilityId: ability.id };
      if (!validateAction(state, action).ok) continue;
      const score = scoreAbility(card, ability, undefined, bot, opponent, difficulty, personality);
      candidates.push({ action, score });
      continue;
    }

    for (const target of abilityTargets(bot, opponent, difficulty, personality)) {
      const action: MatchAction = {
        type: "USE_ABILITY",
        playerId: bot.playerId,
        sourceInstanceId: card.instanceId,
        abilityId: ability.id,
        targetInstanceId: target.instanceId,
      };
      if (!validateAction(state, action).ok) continue;
      candidates.push({
        action,
        score: scoreAbility(card, ability, target, bot, opponent, difficulty, personality),
      });
    }
  }

  return candidates;
}

function chooseAttackCandidates(
  state: MatchState,
  bot: MatchPlayerState,
  opponent: MatchPlayerState,
  difficulty: StoryDifficulty,
  personality: StoryBotPersonality,
) {
  if (bot.energyCurrent < ATTACK_ENERGY_COST) return [];
  const candidates: ScoredAction[] = [];

  for (const attacker of bot.board) {
    if (attacker.currentAttack <= 0) continue;
    for (const target of [...opponent.board, opponent.leader]) {
      const action: MatchAction = {
        type: "ATTACK",
        playerId: bot.playerId,
        attackerInstanceId: attacker.instanceId,
        targetInstanceId: target.instanceId,
      };
      if (!validateAction(state, action).ok) continue;
      candidates.push({
        action,
        score: scoreAttack(attacker, target, opponent, difficulty, personality),
      });
    }
  }

  return candidates;
}

function scoreAttack(
  attacker: CardInstance,
  target: CardInstance,
  opponent: MatchPlayerState,
  difficulty: StoryDifficulty,
  personality: StoryBotPersonality,
) {
  const leaderProtected = opponent.board.some((card) => card.template.cardType === "BUILDING");
  const targetWillDie = target.currentHealth <= attacker.currentAttack;
  const attackerWillDie = target.template.cardType !== "LEADER" && attacker.currentHealth <= target.currentAttack;
  const overkill = Math.max(0, attacker.currentAttack - target.currentHealth);
  const targetValue = target.template.cardType === "LEADER" ? target.currentHealth + 20 : scoreCard(target, difficulty, personality);
  const lethalLeader = target.template.cardType === "LEADER" && targetWillDie;

  let score = 8 + targetValue * 0.35 - overkill * 0.8 - ATTACK_ENERGY_COST * 3;
  if (target.template.cardType === "BUILDING") score += leaderProtected ? 45 : 18;
  if (target.template.cardType === "CHARACTER" && targetWillDie) score += 20 + target.currentAttack * 2;
  if (target.template.cardType === "LEADER") score += personality === "AGGRESSIVE" || personality === "BOSS" ? 22 : 8;
  if (lethalLeader) score += 1000;
  if (attackerWillDie) score -= scoreCard(attacker, difficulty, personality) * 0.45;
  if (personality === "CONTROL" && target.template.cardType !== "LEADER") score += 10;
  if (personality === "DEFENSIVE" && target.template.cardType === "LEADER") score -= 8;
  return score;
}

function scoreItemPlay(
  item: CardInstance,
  target: CardInstance,
  bot: MatchPlayerState,
  opponent: MatchPlayerState,
  difficulty: StoryDifficulty,
  personality: StoryBotPersonality,
) {
  const multiplier = getItemSynergyMultiplier(item.template, target.template);
  const buffValue = (item.currentAttack * 4 + item.currentHealth * 2 + item.currentAura * 2) * multiplier;
  const targetValue = scoreCard(target, difficulty, personality);
  const targetDamaged = target.currentHealth < target.currentMaxHealth;
  const targetIsLeader = target.instanceId === bot.leader.instanceId;
  const hasBoardTarget = bot.board.some((card) => card.currentHealth > 0);
  const targetCanPressure = target.template.cardType !== "BUILDING" && target.currentAttack > 0;
  const protectedByBuildings = bot.board.some((card) => card.template.cardType === "BUILDING");

  let score = buffValue + targetValue * 0.18 - getCardCost(item.template) * 3;
  if (multiplier > 1) score += personality === "COMBO" ? 45 : 30;
  if (targetCanPressure) score += personality === "AGGRESSIVE" ? 14 : 8;
  if (target.template.cardType === "BUILDING") score += personality === "DEFENSIVE" ? 18 : 4;
  if (targetDamaged && item.currentHealth > 0) score += 8;
  if (targetIsLeader) {
    const leaderNeedsHelp = bot.leader.currentHealth <= bot.leader.currentMaxHealth * 0.35 || !hasBoardTarget || !protectedByBuildings;
    score += leaderNeedsHelp || multiplier > 1 ? 8 : -40;
  }
  if (opponent.leader.currentHealth <= 12 && targetCanPressure) score += 10;
  return score;
}

function scoreAbility(
  source: CardInstance,
  ability: AbilityDefinition,
  target: CardInstance | undefined,
  bot: MatchPlayerState,
  opponent: MatchPlayerState,
  difficulty: StoryDifficulty,
  personality: StoryBotPersonality,
) {
  const cooldownPenalty = (ability.cooldownTurns ?? 0) * 2;
  const onceBonus = ability.oncePerGame ? 8 : 0;
  const effectScore = ability.effects.reduce((sum, effect) => {
    return sum + scoreEffect(effect, source, target, bot, opponent, personality);
  }, 0);
  const bossBonus = personality === "BOSS" ? 10 : 0;
  const auraBonus = source.currentAura * 0.5;
  return effectScore + onceBonus + bossBonus + auraBonus - cooldownPenalty;
}

function scoreEffect(
  effect: AbilityEffect,
  source: CardInstance,
  target: CardInstance | undefined,
  bot: MatchPlayerState,
  opponent: MatchPlayerState,
  personality: StoryBotPersonality,
) {
  const amount = effect.amount ?? 0;
  const effectiveTarget = target ?? source;

  if (effect.type === "DAMAGE") {
    const lethal = effectiveTarget.ownerId !== bot.playerId && amount >= effectiveTarget.currentHealth;
    return 16 + amount * 3 + (lethal ? 45 : 0) + (personality === "AGGRESSIVE" ? 8 : 0);
  }
  if (effect.type === "DESTROY") {
    const enemyTarget = effectiveTarget.ownerId !== bot.playerId;
    return enemyTarget ? 70 + scoreCard(effectiveTarget, "HARD", personality) * 0.2 : -80;
  }
  if (effect.type === "STUN" || effect.type === "BLIND") {
    const enemyThreat = effectiveTarget.ownerId !== bot.playerId ? effectiveTarget.currentAttack * 3 : -20;
    return 18 + enemyThreat + (personality === "CONTROL" ? 14 : 0);
  }
  if (effect.type === "HEAL") {
    const missing = Math.max(0, effectiveTarget.currentMaxHealth - effectiveTarget.currentHealth);
    if (missing <= 0) return -18;
    return Math.min(amount, missing) * 2 + (personality === "DEFENSIVE" ? 12 : 0);
  }
  if (effect.type.startsWith("BUFF")) {
    const friendly = effectiveTarget.ownerId === bot.playerId;
    return friendly ? 14 + amount * 4 + (personality === "COMBO" ? 12 : 0) : -25;
  }
  if (effect.type === "COIN_FLIP") return personality === "BOSS" ? 18 : 8;
  if (effect.type === "DRAW") return bot.hand.length < 5 ? 18 : -12;
  if (effect.type === "SHIELD") return effectiveTarget.ownerId === bot.playerId ? 16 : -16;
  return 4;
}

function abilityTargets(
  bot: MatchPlayerState,
  opponent: MatchPlayerState,
  difficulty: StoryDifficulty,
  personality: StoryBotPersonality,
) {
  const threatenedEnemies = opponent.board
    .filter((card) => card.currentHealth <= 8 || card.currentAttack >= 5)
    .sort((left, right) => scoreCard(right, difficulty, personality) - scoreCard(left, difficulty, personality));
  const valuableEnemies = [...opponent.board].sort((left, right) => scoreCard(right, difficulty, personality) - scoreCard(left, difficulty, personality));
  const damagedFriendlies = [bot.leader, ...bot.board]
    .filter((card) => card.currentHealth < card.currentMaxHealth)
    .sort((left, right) => (right.currentMaxHealth - right.currentHealth) - (left.currentMaxHealth - left.currentHealth));
  const friendlyValue = [bot.leader, ...bot.board].sort((left, right) => scoreCard(right, difficulty, personality) - scoreCard(left, difficulty, personality));

  if (difficulty === "BOSS" || difficulty === "HARD") {
    return [...threatenedEnemies, ...valuableEnemies, opponent.leader, ...damagedFriendlies, ...friendlyValue];
  }

  return [...threatenedEnemies, ...valuableEnemies, ...damagedFriendlies, opponent.leader, ...friendlyValue];
}

function scoreCard(card: CardInstance, difficulty: StoryDifficulty, personality: StoryBotPersonality) {
  const base = card.currentAttack * 3 + card.currentHealth * 2 + card.currentAura + card.currentSize;
  const rarityBonus = difficulty === "EASY" ? 0 : card.template.rarity === "DIVINE" ? 15 : card.template.rarity === "MYTHIC" ? 10 : card.template.rarity === "LEGENDARY" ? 8 : 0;
  const roleBonus = card.template.cardType === "BUILDING"
    ? personality === "DEFENSIVE" ? 18 : 8
    : card.template.cardType === "ITEM"
      ? personality === "COMBO" ? 14 : 4
      : personality === "AGGRESSIVE" ? card.currentAttack * 1.4 : 0;
  const traitBonus = getVisibleTraits(card.template).some((trait) => trait === "COMBO_PIECE" || trait === "FOUNDATION")
    ? personality === "COMBO" ? 12 : 3
    : 0;
  const costPenalty = difficulty === "EASY" ? getCardCost(card.template) * 2 : getCardCost(card.template);
  return base + rarityBonus + roleBonus + traitBonus - costPenalty;
}

function playCurveBonus(card: CardInstance, bot: MatchPlayerState, difficulty: StoryDifficulty, personality: StoryBotPersonality) {
  const cost = getCardCost(card.template);
  const spendRatio = bot.energyCurrent > 0 ? cost / bot.energyCurrent : 1;
  let bonus = spendRatio > 0.85 ? 6 : 0;
  if (card.template.cardType === "BUILDING" && personality === "DEFENSIVE") bonus += 12;
  if (card.template.cardType === "CHARACTER" && personality === "AGGRESSIVE") bonus += 8;
  if (difficulty === "BOSS" && card.template.rarity === "DIVINE") bonus += 12;
  return bonus;
}

function getItemSynergyMultiplier(item: CardTemplate, target: CardTemplate) {
  if (item.slug === "zubr-beer" && target.slug === "necrps-drunken-dad") return 2;
  if (item.slug === "white-monster" && target.slug === "mwyi") return 2;
  if (item.slug === "the-bong" && target.slug === "garrett-prime") return 2;
  if (item.slug === "assault-rifle" && target.cardType === "CHARACTER" && isAmericanCard(target)) return 2;
  return 1;
}

function isAmericanCard(card: CardTemplate) {
  return card.category?.toUpperCase() === "AMERICAN" || card.traits?.some((trait) => trait.toUpperCase() === "AMERICAN");
}
