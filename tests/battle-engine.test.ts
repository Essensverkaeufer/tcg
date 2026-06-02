import assert from "node:assert/strict";
import { createMatchState, applyAction, validateAction } from "@/lib/game/match/state";
import { drawCards } from "@/lib/game/abilities/engine";
import { createMatchView, isHiddenCard } from "@/lib/game/match/view";
import type { CardTemplate } from "@/types/cards";

const leader: CardTemplate = {
  slug: "test-leader",
  name: "Test Leader",
  description: "Leader",
  flavorText: "",
  rarity: "COMMON",
  cardType: "LEADER",
  attack: 1,
  health: 5,
  size: 1,
  aura: 0,
  imageUrl: "",
  abilityData: [],
};

function unit(slug: string, attack = 1, health = 2): CardTemplate {
  return {
    slug,
    name: slug,
    description: "Unit",
    flavorText: "",
    rarity: "COMMON",
    cardType: "CHARACTER",
    attack,
    health,
    size: 1,
    aura: 0,
    imageUrl: "",
    abilityData: [],
  };
}

function coinUnit(slug: string): CardTemplate {
  return {
    slug,
    name: slug,
    description: "Coin unit",
    flavorText: "",
    rarity: "RARE",
    cardType: "CHARACTER",
    attack: 1,
    health: 2,
    size: 1,
    aura: 0,
    imageUrl: "",
    abilityData: [
      {
        id: `${slug}-coin`,
        label: "50/50",
        trigger: "ACTIVATED",
        requiresTarget: false,
        oncePerGame: true,
        effects: [
          {
            type: "COIN_FLIP",
            target: "SELF",
            metadata: {
              heads: [{ type: "DESTROY", target: "ENEMY_CHARACTER" }],
              tails: [{ type: "DESTROY", target: "SELF" }],
            },
          },
        ],
      },
    ],
  };
}

function building(slug: string, attack = 0, health = 3): CardTemplate {
  return {
    slug,
    name: slug,
    description: "Building",
    flavorText: "",
    rarity: "COMMON",
    cardType: "BUILDING",
    attack,
    health,
    size: 1,
    aura: 0,
    imageUrl: "",
    abilityData: [],
  };
}

function deck(prefix: string) {
  return [leader, ...Array.from({ length: 29 }, (_, index) => unit(`${prefix}-${index}`, 1, 2))];
}

const first = createMatchState(
  "seeded",
  { id: "a", name: "A", deck: deck("a") },
  { id: "b", name: "B", deck: deck("b") },
  { seed: "same-seed", deterministic: false },
);
const second = createMatchState(
  "seeded",
  { id: "a", name: "A", deck: deck("a") },
  { id: "b", name: "B", deck: deck("b") },
  { seed: "same-seed", deterministic: false },
);

assert.deepEqual(first.players[0].deck.map((card) => card.template.slug), second.players[0].deck.map((card) => card.template.slug), "same seed should produce same player A deck order");
assert.deepEqual(first.players[1].deck.map((card) => card.template.slug), second.players[1].deck.map((card) => card.template.slug), "same seed should produce same player B deck order");

const view = createMatchView(first, "a");
assert.equal(view.players[0].hand.some(isHiddenCard), false, "viewer hand should be visible");
assert.equal(view.players[1].hand.every(isHiddenCard), true, "opponent hand should be hidden");

let state = createMatchState(
  "flow",
  { id: "a", name: "A", deck: deck("a") },
  { id: "b", name: "B", deck: deck("b") },
  { seed: "flow-seed", deterministic: true },
);

const active = state.players[0];
const playedCard = active.hand[0];
state = applyAction(state, { type: "PLAY_CARD", playerId: active.playerId, cardInstanceId: playedCard.instanceId, actionSeq: 1 });
assert.equal(state.players[0].hand.length, 4, "playing should remove one card from hand");
assert.equal(state.players[0].board.length, 1, "playing should put one card on board");

state.players[0].board[0].currentAttack = 99;
state.players[0].board[0].enteredTurn = 0;
state.players[0].board[0].exhausted = false;
state = applyAction(state, {
  type: "ATTACK",
  playerId: active.playerId,
  attackerInstanceId: state.players[0].board[0].instanceId,
  targetInstanceId: state.players[1].leader.instanceId,
  actionSeq: 2,
});
assert.equal(state.phase, "FINISHED", "leader death should finish the match");
assert.equal(state.winnerId, active.playerId, "attacker should win after killing enemy leader");

const capped = createMatchState(
  "cap",
  { id: "a", name: "A", deck: deck("a") },
  { id: "b", name: "B", deck: deck("b") },
  { seed: "cap-seed", deterministic: true },
);
const cappedPlayer = capped.players[0];
assert.equal(cappedPlayer.hand.length, 5, "opening hand should stay at 5");
assert.equal(drawCards(cappedPlayer, 1), 0, "drawing at 5 cards should draw nothing");
assert.equal(cappedPlayer.hand.length, 5, "hand should stay capped at 5");

const protectedState = createMatchState(
  "building-protect",
  { id: "a", name: "A", deck: [leader, unit("attacker", 3, 3), ...Array.from({ length: 9 }, (_, index) => unit(`a-extra-${index}`))] },
  { id: "b", name: "B", deck: [leader, building("wall", 0, 5), ...Array.from({ length: 9 }, (_, index) => unit(`b-extra-${index}`))] },
  { seed: "building-protect-seed", deterministic: true },
);
const attacker = protectedState.players[0].hand.find((card) => card.template.slug === "attacker")!;
attacker.zone = "BOARD";
attacker.enteredTurn = 0;
attacker.exhausted = false;
protectedState.players[0].board.push(attacker);
const wall = protectedState.players[1].hand.find((card) => card.template.slug === "wall")!;
wall.zone = "BOARD";
protectedState.players[1].board.push(wall);
assert.deepEqual(validateAction(protectedState, {
  type: "ATTACK",
  playerId: protectedState.players[0].playerId,
  attackerInstanceId: attacker.instanceId,
  targetInstanceId: protectedState.players[1].leader.instanceId,
}), { ok: false, reason: "Destroy enemy buildings before attacking the leader." }, "buildings should block direct leader attacks");
assert.equal(validateAction(protectedState, {
  type: "ATTACK",
  playerId: protectedState.players[0].playerId,
  attackerInstanceId: attacker.instanceId,
  targetInstanceId: wall.instanceId,
}).ok, true, "buildings should remain valid attack targets");

let coinHeadsState = createMatchState(
  "coin-heads",
  { id: "a", name: "A", deck: [leader, coinUnit("coin-heads-unit"), ...Array.from({ length: 9 }, (_, index) => unit(`a-coin-heads-extra-${index}`))] },
  { id: "b", name: "B", deck: [leader, unit("enemy-heads-target"), ...Array.from({ length: 9 }, (_, index) => unit(`b-coin-heads-extra-${index}`))] },
  { seed: "coin-tails", deterministic: true },
);
const headsSource = coinHeadsState.players[0].hand.find((card) => card.template.slug === "coin-heads-unit")!;
coinHeadsState.players[0].hand = coinHeadsState.players[0].hand.filter((card) => card.instanceId !== headsSource.instanceId);
headsSource.zone = "BOARD";
headsSource.enteredTurn = 0;
coinHeadsState.players[0].board.push(headsSource);
const headsEnemy = coinHeadsState.players[1].hand.find((card) => card.template.slug === "enemy-heads-target")!;
coinHeadsState.players[1].hand = coinHeadsState.players[1].hand.filter((card) => card.instanceId !== headsEnemy.instanceId);
headsEnemy.zone = "BOARD";
coinHeadsState.players[1].board.push(headsEnemy);
coinHeadsState = applyAction(coinHeadsState, {
  type: "USE_ABILITY",
  playerId: coinHeadsState.players[0].playerId,
  sourceInstanceId: headsSource.instanceId,
  abilityId: "coin-heads-unit-coin",
});
assert.equal(coinHeadsState.messages.includes("50/50 landed heads."), true, "coin flip should report heads");
assert.equal(coinHeadsState.players[1].graveyard.some((card) => card.template.slug === "enemy-heads-target"), true, "heads should destroy the first enemy character");
assert.equal(coinHeadsState.players[0].oncePerGameUsed.includes("coin-heads-unit-coin"), true, "coin flip ability should be marked once-per-game");

let coinTailsState = createMatchState(
  "coin-tails",
  { id: "a", name: "A", deck: [leader, coinUnit("coin-tails-unit"), ...Array.from({ length: 9 }, (_, index) => unit(`a-coin-tails-extra-${index}`))] },
  { id: "b", name: "B", deck: [leader, unit("enemy-tails-target"), ...Array.from({ length: 9 }, (_, index) => unit(`b-coin-tails-extra-${index}`))] },
  { seed: "coin-heads", deterministic: true },
);
const tailsSource = coinTailsState.players[0].hand.find((card) => card.template.slug === "coin-tails-unit")!;
coinTailsState.players[0].hand = coinTailsState.players[0].hand.filter((card) => card.instanceId !== tailsSource.instanceId);
tailsSource.zone = "BOARD";
tailsSource.enteredTurn = 0;
coinTailsState.players[0].board.push(tailsSource);
coinTailsState = applyAction(coinTailsState, {
  type: "USE_ABILITY",
  playerId: coinTailsState.players[0].playerId,
  sourceInstanceId: tailsSource.instanceId,
  abilityId: "coin-tails-unit-coin",
});
assert.equal(coinTailsState.messages.includes("50/50 landed tails."), true, "coin flip should report tails");
assert.equal(coinTailsState.players[0].graveyard.some((card) => card.template.slug === "coin-tails-unit"), true, "tails should destroy the source");

console.log("battle engine tests passed");
