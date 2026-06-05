import assert from "node:assert/strict";
import { ATTACK_ENERGY_COST, createMatchState, applyAction, validateAction } from "@/lib/game/match/state";
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

function cooldownUnit(slug: string): CardTemplate {
  return {
    slug,
    name: slug,
    description: "Cooldown unit",
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
        id: `${slug}-cooldown`,
        label: "Cooldown Shot",
        trigger: "ACTIVATED",
        requiresTarget: false,
        cooldownTurns: 2,
        effects: [{ type: "DAMAGE", target: "ENEMY_CHARACTER", amount: 1 }],
      },
    ],
  };
}

function necrpTuffLeader(): CardTemplate {
  return {
    ...leader,
    slug: "necrp-tuff-edition",
    name: "necrp (tuff edition)",
    rarity: "DIVINE",
    attack: 12,
    health: 15,
    size: 4,
    aura: 12,
    abilityData: [
      {
        id: "necrp-tuff-board-wipe",
        label: "Tuff Sweep",
        trigger: "ACTIVATED",
        requiresTarget: false,
        cooldownTurns: 3,
        effects: [{ type: "DAMAGE", target: "ENEMY_BOARD_CHARACTERS", amount: 8 }],
      },
    ],
  };
}

function garrettPrimeLeader(): CardTemplate {
  return {
    ...leader,
    slug: "garrett-prime",
    name: "Garrett (Prime)",
    rarity: "LEGENDARY",
    attack: 8,
    health: 10,
    size: 2,
    aura: 10,
    abilityData: [
      {
        id: "garrett-prime-flex",
        label: "Flex",
        trigger: "ACTIVATED",
        requiresTarget: true,
        effects: [
          { type: "DAMAGE", target: "ENEMY_CHARACTER", amount: 4 },
          { type: "BLIND", target: "ENEMY_CHARACTER", amount: 1, duration: "TURN" },
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

let energyState = createMatchState(
  "energy-ramp",
  { id: "a", name: "A", deck: deck("a-energy") },
  { id: "b", name: "B", deck: deck("b-energy") },
  { seed: "energy-ramp-seed", deterministic: true },
);
assert.equal(energyState.activePlayerId, "a", "deterministic match should start player A");
assert.equal(energyState.players[0].energyMax, 3, "first player should start on 3 energy");
energyState = applyAction(energyState, { type: "END_TURN", playerId: "a" });
assert.equal(energyState.players[1].energyMax, 4, "second player should start their first turn on 4 energy");
energyState = applyAction(energyState, { type: "END_TURN", playerId: "b" });
assert.equal(energyState.players[0].energyMax, 5, "first player should have 5 energy on their second turn");
energyState = applyAction(energyState, { type: "END_TURN", playerId: "a" });
assert.equal(energyState.players[1].energyMax, 6, "second player should have 6 energy on their second turn");
energyState = applyAction(energyState, { type: "END_TURN", playerId: "b" });
assert.equal(energyState.players[0].energyMax, 7, "first player should have 7 energy on their third turn");
energyState = applyAction(energyState, { type: "END_TURN", playerId: "a" });
assert.equal(energyState.players[1].energyMax, 7, "second player should match the normal energy curve on their third turn");

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
const energyBeforeAttack = state.players[0].energyCurrent;

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
assert.equal(state.players[0].energyCurrent, energyBeforeAttack - ATTACK_ENERGY_COST, "attacking should spend 1 energy");

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

const loopPlayer = structuredClone(capped.players[1]);
const loopCard = loopPlayer.deck[0];
loopPlayer.hand = loopPlayer.hand.slice(0, 1);
loopPlayer.deck = [];
loopPlayer.graveyard = [{
  ...loopCard,
  zone: "GRAVEYARD",
  currentHealth: 0,
  exhausted: true,
  poisoned: true,
  stunnedUntilTurn: 99,
}];
assert.equal(drawCards(loopPlayer, 1), 1, "empty decks should recycle the graveyard before drawing");
assert.equal(loopPlayer.graveyard.length, 0, "recycled graveyard should be emptied");
assert.equal(loopPlayer.hand.length, 2, "recycled card should be drawn into hand");
const recycledHandCard = loopPlayer.hand[1];
assert.equal(recycledHandCard.zone, "HAND", "recycled card should enter hand");
assert.equal(recycledHandCard.currentHealth, recycledHandCard.template.health, "recycled cards should reset health");
assert.equal(recycledHandCard.exhausted, false, "recycled cards should clear exhausted state");
assert.equal(recycledHandCard.poisoned, undefined, "recycled cards should clear status effects");
assert.equal(recycledHandCard.stunnedUntilTurn, undefined, "recycled cards should clear timed effects");

let deckLoopState = createMatchState(
  "deck-loop",
  { id: "a", name: "A", deck: deck("a-loop") },
  { id: "b", name: "B", deck: deck("b-loop") },
  { seed: "deck-loop-seed", deterministic: true },
);
const loopDrawCard = deckLoopState.players[1].deck[0];
deckLoopState.players[1].hand = deckLoopState.players[1].hand.slice(0, 1);
deckLoopState.players[1].deck = [];
deckLoopState.players[1].graveyard = [{ ...loopDrawCard, zone: "GRAVEYARD", currentHealth: 0 }];
deckLoopState = applyAction(deckLoopState, { type: "END_TURN", playerId: "a" });
assert.equal(deckLoopState.phase, "MAIN", "drawing from an empty deck should no longer end the match");
assert.equal(deckLoopState.activePlayerId, "b", "turn should still pass after looping the graveyard");
assert.equal(deckLoopState.players[1].hand.length, 2, "turn draw should use the recycled graveyard card");
assert.equal(deckLoopState.messages.includes("B's graveyard looped back into the deck."), true, "turn log should explain the recycle");
assert.equal(deckLoopState.messages.includes("B drew a card."), true, "turn log should still report the draw");

let noCardsState = createMatchState(
  "no-cards-left",
  { id: "a", name: "A", deck: deck("a-no-cards") },
  { id: "b", name: "B", deck: deck("b-no-cards") },
  { seed: "no-cards-left-seed", deterministic: true },
);
noCardsState.players[1].hand = noCardsState.players[1].hand.slice(0, 1);
noCardsState.players[1].deck = [];
noCardsState.players[1].graveyard = [];
noCardsState = applyAction(noCardsState, { type: "END_TURN", playerId: "a" });
assert.equal(noCardsState.phase, "MAIN", "drawing with no deck and no graveyard should not end the match");
assert.equal(noCardsState.activePlayerId, "b", "turn should still pass when no cards are available to draw");
assert.equal(noCardsState.messages.includes("B had no cards to draw."), true, "turn log should explain the skipped draw");
assert.equal(noCardsState.messages.some((message) => message.includes("hit 0 HP")), false, "empty draw should not create a fake leader-death message");

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
protectedState.players[0].energyCurrent = 0;
assert.deepEqual(validateAction(protectedState, {
  type: "ATTACK",
  playerId: protectedState.players[0].playerId,
  attackerInstanceId: attacker.instanceId,
  targetInstanceId: wall.instanceId,
}), { ok: false, reason: "Not enough energy. Needs 1." }, "attacking should be blocked at 0 energy");
protectedState.players[0].energyCurrent = 1;
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

let cooldownState = createMatchState(
  "cooldown",
  { id: "a", name: "A", deck: [leader, cooldownUnit("cooldown-unit"), ...Array.from({ length: 9 }, (_, index) => unit(`a-cooldown-extra-${index}`))] },
  { id: "b", name: "B", deck: [leader, unit("cooldown-target", 1, 5), ...Array.from({ length: 9 }, (_, index) => unit(`b-cooldown-extra-${index}`))] },
  { seed: "cooldown-seed", deterministic: true },
);
const cooldownSource = cooldownState.players[0].hand.find((card) => card.template.slug === "cooldown-unit")!;
cooldownState.players[0].hand = cooldownState.players[0].hand.filter((card) => card.instanceId !== cooldownSource.instanceId);
cooldownSource.zone = "BOARD";
cooldownSource.enteredTurn = 0;
cooldownState.players[0].board.push(cooldownSource);
const cooldownTarget = cooldownState.players[1].hand.find((card) => card.template.slug === "cooldown-target")!;
cooldownState.players[1].hand = cooldownState.players[1].hand.filter((card) => card.instanceId !== cooldownTarget.instanceId);
cooldownTarget.zone = "BOARD";
cooldownState.players[1].board.push(cooldownTarget);
cooldownState = applyAction(cooldownState, {
  type: "USE_ABILITY",
  playerId: cooldownState.players[0].playerId,
  sourceInstanceId: cooldownSource.instanceId,
  abilityId: "cooldown-unit-cooldown",
});
assert.equal(cooldownState.players[0].board[0].abilityCooldowns["cooldown-unit-cooldown"], 4, "cooldown should be stored as the next owner turn where the ability is legal");
cooldownState = applyAction(cooldownState, { type: "END_TURN", playerId: cooldownState.players[0].playerId });
cooldownState = applyAction(cooldownState, { type: "END_TURN", playerId: cooldownState.players[1].playerId });
assert.deepEqual(validateAction(cooldownState, {
  type: "USE_ABILITY",
  playerId: cooldownState.players[0].playerId,
  sourceInstanceId: cooldownState.players[0].board[0].instanceId,
  abilityId: "cooldown-unit-cooldown",
}), { ok: false, reason: "Ability is on cooldown for 2 more turn(s)." }, "cooldown should block on the first owner turn after use");
cooldownState = applyAction(cooldownState, { type: "END_TURN", playerId: cooldownState.players[0].playerId });
cooldownState = applyAction(cooldownState, { type: "END_TURN", playerId: cooldownState.players[1].playerId });
assert.deepEqual(validateAction(cooldownState, {
  type: "USE_ABILITY",
  playerId: cooldownState.players[0].playerId,
  sourceInstanceId: cooldownState.players[0].board[0].instanceId,
  abilityId: "cooldown-unit-cooldown",
}), { ok: false, reason: "Ability is on cooldown for 1 more turn(s)." }, "cooldown should block for the second owner turn after use");
cooldownState = applyAction(cooldownState, { type: "END_TURN", playerId: cooldownState.players[0].playerId });
cooldownState = applyAction(cooldownState, { type: "END_TURN", playerId: cooldownState.players[1].playerId });
assert.equal(validateAction(cooldownState, {
  type: "USE_ABILITY",
  playerId: cooldownState.players[0].playerId,
  sourceInstanceId: cooldownState.players[0].board[0].instanceId,
  abilityId: "cooldown-unit-cooldown",
}).ok, true, "cooldown should expire after the configured turns pass");

let tuffState = createMatchState(
  "necrp-tuff",
  { id: "a", name: "A", deck: [necrpTuffLeader(), ...Array.from({ length: 10 }, (_, index) => unit(`a-tuff-extra-${index}`))] },
  { id: "b", name: "B", deck: [leader, unit("enemy-character-a", 1, 10), unit("enemy-character-b", 1, 10), building("enemy-building", 0, 10), ...Array.from({ length: 8 }, (_, index) => unit(`b-tuff-extra-${index}`))] },
  { seed: "necrp-tuff-seed", deterministic: true },
);
const tuffEnemyA = tuffState.players[1].hand.find((card) => card.template.slug === "enemy-character-a")!;
const tuffEnemyB = tuffState.players[1].hand.find((card) => card.template.slug === "enemy-character-b")!;
const tuffBuilding = tuffState.players[1].hand.find((card) => card.template.slug === "enemy-building")!;
for (const card of [tuffEnemyA, tuffEnemyB, tuffBuilding]) {
  tuffState.players[1].hand = tuffState.players[1].hand.filter((entry) => entry.instanceId !== card.instanceId);
  card.zone = "BOARD";
  tuffState.players[1].board.push(card);
}
const tuffLeaderHp = tuffState.players[1].leader.currentHealth;
tuffState = applyAction(tuffState, {
  type: "USE_ABILITY",
  playerId: tuffState.players[0].playerId,
  sourceInstanceId: tuffState.players[0].leader.instanceId,
  abilityId: "necrp-tuff-board-wipe",
});
assert.equal(tuffState.players[1].board.find((card) => card.template.slug === "enemy-character-a")?.currentHealth, 2, "Tuff Sweep should damage the first enemy character");
assert.equal(tuffState.players[1].board.find((card) => card.template.slug === "enemy-character-b")?.currentHealth, 2, "Tuff Sweep should damage the second enemy character");
assert.equal(tuffState.players[1].board.find((card) => card.template.slug === "enemy-building")?.currentHealth, 10, "Tuff Sweep should not hit enemy buildings");
assert.equal(tuffState.players[1].leader.currentHealth, tuffLeaderHp, "Tuff Sweep should not hit the enemy leader");
assert.equal(tuffState.players[0].leader.abilityCooldowns["necrp-tuff-board-wipe"], 5, "Tuff Sweep should be unavailable until the fourth owner turn after use");
for (const remaining of [3, 2, 1]) {
  tuffState = applyAction(tuffState, { type: "END_TURN", playerId: tuffState.players[0].playerId });
  tuffState = applyAction(tuffState, { type: "END_TURN", playerId: tuffState.players[1].playerId });
  assert.deepEqual(validateAction(tuffState, {
    type: "USE_ABILITY",
    playerId: tuffState.players[0].playerId,
    sourceInstanceId: tuffState.players[0].leader.instanceId,
    abilityId: "necrp-tuff-board-wipe",
  }), { ok: false, reason: `Ability is on cooldown for ${remaining} more turn(s).` }, `Tuff Sweep should still be on cooldown for ${remaining} owner turn(s)`);
}
tuffState = applyAction(tuffState, { type: "END_TURN", playerId: tuffState.players[0].playerId });
tuffState = applyAction(tuffState, { type: "END_TURN", playerId: tuffState.players[1].playerId });
assert.equal(validateAction(tuffState, {
  type: "USE_ABILITY",
  playerId: tuffState.players[0].playerId,
  sourceInstanceId: tuffState.players[0].leader.instanceId,
  abilityId: "necrp-tuff-board-wipe",
}).ok, true, "Tuff Sweep should be usable on the fourth owner turn after use");

let flexState = createMatchState(
  "garrett-flex",
  { id: "a", name: "A", deck: [garrettPrimeLeader(), ...Array.from({ length: 10 }, (_, index) => unit(`a-flex-extra-${index}`))] },
  { id: "b", name: "B", deck: [leader, unit("flex-target", 2, 6), ...Array.from({ length: 9 }, (_, index) => unit(`b-flex-extra-${index}`))] },
  { seed: "garrett-flex-seed", deterministic: true },
);
const flexTarget = flexState.players[1].hand.find((card) => card.template.slug === "flex-target")!;
flexState.players[1].hand = flexState.players[1].hand.filter((card) => card.instanceId !== flexTarget.instanceId);
flexTarget.zone = "BOARD";
flexTarget.enteredTurn = 0;
flexState.players[1].board.push(flexTarget);
flexState = applyAction(flexState, {
  type: "USE_ABILITY",
  playerId: flexState.players[0].playerId,
  sourceInstanceId: flexState.players[0].leader.instanceId,
  abilityId: "garrett-prime-flex",
  targetInstanceId: flexTarget.instanceId,
});
assert.equal(flexState.players[1].board[0].blindedUntilTurn, 2, "Flex should blind through the target owner's next turn");
flexState = applyAction(flexState, { type: "END_TURN", playerId: flexState.players[0].playerId });
assert.deepEqual(validateAction(flexState, {
  type: "ATTACK",
  playerId: flexState.players[1].playerId,
  attackerInstanceId: flexState.players[1].board[0].instanceId,
  targetInstanceId: flexState.players[0].leader.instanceId,
}), { ok: false, reason: "Card is blinded." }, "Flex should block the target on its next owner turn");
flexState = applyAction(flexState, { type: "END_TURN", playerId: flexState.players[1].playerId });
flexState = applyAction(flexState, { type: "END_TURN", playerId: flexState.players[0].playerId });
assert.equal(validateAction(flexState, {
  type: "ATTACK",
  playerId: flexState.players[1].playerId,
  attackerInstanceId: flexState.players[1].board[0].instanceId,
  targetInstanceId: flexState.players[0].leader.instanceId,
}).ok, true, "Flex blind should expire after the target owner's next turn");

console.log("battle engine tests passed");
