import { getAbilityCooldownRemaining } from "@/lib/game/abilities/engine";
import { ATTACK_ENERGY_COST, getCardCost, validateAction } from "@/lib/game/match/state";
import type { StoryDifficulty } from "@/lib/game/story/config";
import type { AbilityDefinition } from "@/types/cards";
import type { CardInstance, MatchAction, MatchPlayerState, MatchState } from "@/types/match";

export function chooseBotAction(state: MatchState, botPlayerId: string, difficulty: StoryDifficulty): MatchAction {
  const bot = state.players.find((player) => player.playerId === botPlayerId);
  const opponent = state.players.find((player) => player.playerId !== botPlayerId);

  if (!bot || !opponent || state.phase === "FINISHED" || state.activePlayerId !== botPlayerId) {
    return { type: "END_TURN", playerId: botPlayerId };
  }

  const abilityAction = difficulty !== "EASY" ? chooseAbilityAction(state, bot, opponent, difficulty) : undefined;
  if (abilityAction) return abilityAction;

  const playAction = choosePlayAction(state, bot, difficulty);
  if (playAction) return playAction;

  const attackAction = chooseAttackAction(state, bot, opponent, difficulty);
  if (attackAction) return attackAction;

  return { type: "END_TURN", playerId: botPlayerId };
}

function choosePlayAction(state: MatchState, bot: MatchPlayerState, difficulty: StoryDifficulty) {
  const playable = bot.hand
    .map((card) => ({ card, score: scoreCard(card, difficulty) }))
    .sort((left, right) => right.score - left.score);

  for (const { card } of playable) {
    if (card.template.cardType === "ITEM") {
      const targets = [bot.leader, ...bot.board].sort((left, right) => scoreCard(right, difficulty) - scoreCard(left, difficulty));
      for (const target of targets) {
        const action: MatchAction = { type: "PLAY_CARD", playerId: bot.playerId, cardInstanceId: card.instanceId, targetInstanceId: target.instanceId };
        if (validateAction(state, action).ok) return action;
      }
      continue;
    }

    const action: MatchAction = { type: "PLAY_CARD", playerId: bot.playerId, cardInstanceId: card.instanceId };
    if (validateAction(state, action).ok) return action;
  }

  return undefined;
}

function chooseAbilityAction(state: MatchState, bot: MatchPlayerState, opponent: MatchPlayerState, difficulty: StoryDifficulty) {
  const sources = [bot.leader, ...bot.board]
    .flatMap((card) => card.template.abilityData
      .filter((ability) => ability.trigger === "ACTIVATED")
      .map((ability) => ({ card, ability, score: scoreAbility(card, ability, difficulty) })))
    .sort((left, right) => right.score - left.score);

  for (const { card, ability } of sources) {
    if (card.activatedThisTurn.includes(ability.id)) continue;
    if (getAbilityCooldownRemaining(card, ability.id, bot.turnsStarted) > 0) continue;

    if (!ability.requiresTarget) {
      const action: MatchAction = { type: "USE_ABILITY", playerId: bot.playerId, sourceInstanceId: card.instanceId, abilityId: ability.id };
      if (validateAction(state, action).ok) return action;
      continue;
    }

    for (const target of abilityTargets(bot, opponent, difficulty)) {
      const action: MatchAction = {
        type: "USE_ABILITY",
        playerId: bot.playerId,
        sourceInstanceId: card.instanceId,
        abilityId: ability.id,
        targetInstanceId: target.instanceId,
      };
      if (validateAction(state, action).ok) return action;
    }
  }

  return undefined;
}

function chooseAttackAction(state: MatchState, bot: MatchPlayerState, opponent: MatchPlayerState, difficulty: StoryDifficulty) {
  const attackers = bot.board
    .filter((card) => bot.energyCurrent >= ATTACK_ENERGY_COST && card.currentAttack > 0)
    .sort((left, right) => right.currentAttack - left.currentAttack);
  const targets = attackTargets(opponent, difficulty);

  for (const attacker of attackers) {
    for (const target of targets) {
      const action: MatchAction = {
        type: "ATTACK",
        playerId: bot.playerId,
        attackerInstanceId: attacker.instanceId,
        targetInstanceId: target.instanceId,
      };
      if (validateAction(state, action).ok) return action;
    }
  }

  return undefined;
}

function abilityTargets(bot: MatchPlayerState, opponent: MatchPlayerState, difficulty: StoryDifficulty) {
  if (difficulty === "BOSS" || difficulty === "HARD") {
    return [
      ...opponent.board.filter((card) => card.currentHealth <= 6).sort((left, right) => right.currentAttack - left.currentAttack),
      ...[...opponent.board].sort((left, right) => scoreCard(right, difficulty) - scoreCard(left, difficulty)),
      opponent.leader,
      bot.leader,
      ...bot.board,
    ];
  }

  return [...opponent.board, opponent.leader, bot.leader, ...bot.board];
}

function attackTargets(opponent: MatchPlayerState, difficulty: StoryDifficulty) {
  const buildings = opponent.board.filter((card) => card.template.cardType === "BUILDING");
  const lethalCharacters = opponent.board.filter((card) => card.template.cardType === "CHARACTER" && card.currentHealth <= 4);
  const boardByValue = [...opponent.board].sort((left, right) => scoreCard(right, difficulty) - scoreCard(left, difficulty));

  if (difficulty === "EASY") return [...buildings, ...opponent.board, opponent.leader];
  if (difficulty === "NORMAL") return [...buildings, ...lethalCharacters, ...boardByValue, opponent.leader];
  return [...buildings, ...lethalCharacters, opponent.leader, ...boardByValue];
}

function scoreCard(card: CardInstance, difficulty: StoryDifficulty) {
  const base = card.currentAttack * 3 + card.currentHealth * 2 + card.currentAura + card.currentSize;
  const rarityBonus = difficulty === "EASY" ? 0 : card.template.rarity === "DIVINE" ? 15 : card.template.rarity === "MYTHIC" ? 10 : card.template.rarity === "LEGENDARY" ? 8 : 0;
  const costPenalty = difficulty === "EASY" ? getCardCost(card.template) * 2 : getCardCost(card.template);
  return base + rarityBonus - costPenalty;
}

function scoreAbility(card: CardInstance, ability: AbilityDefinition, difficulty: StoryDifficulty) {
  const effectScore = ability.effects.reduce((sum, effect) => {
    if (effect.type === "DAMAGE" || effect.type === "DESTROY") return sum + 12 + (effect.amount ?? 0);
    if (effect.type === "STUN" || effect.type === "BLIND") return sum + 8 + (effect.amount ?? 0);
    if (effect.type.startsWith("BUFF")) return sum + 5 + (effect.amount ?? 0);
    if (effect.type === "HEAL") return sum + 4 + (effect.amount ?? 0);
    return sum + 2;
  }, 0);

  const bossBonus = difficulty === "BOSS" ? 8 : 0;
  return effectScore + bossBonus + card.currentAura;
}
