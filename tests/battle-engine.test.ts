import assert from "node:assert/strict";
import { ATTACK_ENERGY_COST, createMatchState, applyAction, validateAction } from "@/lib/game/match/state";
import { drawCards } from "@/lib/game/abilities/engine";
import { createMatchView, isHiddenCard } from "@/lib/game/match/view";
import { cardCatalog } from "@/lib/game/cards";
import { chooseBotAction } from "@/lib/game/story/bot";
import { buildStoryEnemyDeck, storyEncounters } from "@/lib/game/story/config";
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

function unit(slug: string, attack = 1, health = 2, category?: string): CardTemplate {
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
    category,
    imageUrl: "",
    abilityData: [],
  };
}

function testItem(slug: string, attack: number, health: number, aura: number): CardTemplate {
  return {
    slug,
    name: slug,
    description: "Item",
    flavorText: "",
    rarity: "COMMON",
    cardType: "ITEM",
    attack,
    health,
    size: 1,
    aura,
    imageUrl: "",
    abilityData: [],
  };
}

function wokeDeployable(chance = 0.05): CardTemplate {
  return {
    slug: `woke-deployable-${chance}`,
    name: "Woke Deployable",
    description: "Risky global item",
    flavorText: "",
    rarity: "DIVINE",
    cardType: "ITEM",
    attack: 0,
    health: 0,
    size: 0,
    aura: 0,
    imageUrl: "",
    abilityData: [
      {
        id: "woke-deploy-test",
        label: "Deploy Brainrot",
        trigger: "ON_PLAY",
        requiresTarget: false,
        effects: [
          { type: "BUFF_ATTACK", target: "FRIENDLY_BOARD_AND_LEADER", amount: 2, duration: "PERMANENT" },
          { type: "BUFF_HEALTH", target: "FRIENDLY_BOARD_AND_LEADER", amount: 4, duration: "PERMANENT" },
          { type: "BUFF_AURA", target: "FRIENDLY_BOARD_AND_LEADER", amount: 2, duration: "PERMANENT" },
          { type: "CHANCE_DESTROY", target: "FRIENDLY_BOARD_AND_LEADER", chance },
        ],
      },
    ],
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

function leaderDamageUnit(slug: string, amount: number): CardTemplate {
  return {
    ...unit(slug, 1, 2),
    abilityData: [
      {
        id: `${slug}-leader-damage`,
        label: "Leader Damage",
        trigger: "ACTIVATED",
        requiresTarget: false,
        effects: [{ type: "DAMAGE", target: "ENEMY_LEADER", amount }],
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

function oncePerGameLeader(): CardTemplate {
  return {
    ...leader,
    slug: "once-leader",
    name: "Once Leader",
    abilityData: [
      {
        id: "once-leader-heal",
        label: "One Time Heal",
        trigger: "ACTIVATED",
        requiresTarget: false,
        oncePerGame: true,
        effects: [{ type: "HEAL", target: "SELF", amount: 1 }],
      },
    ],
  };
}

function randomEnemyCharacterDestroyLeader(): CardTemplate {
  return {
    ...leader,
    slug: "random-character-destroy-leader",
    name: "Random Character Destroy Leader",
    abilityData: [
      {
        id: "random-character-destroy",
        label: "Random Character Destroy",
        trigger: "ACTIVATED",
        requiresTarget: false,
        effects: [{ type: "DESTROY", target: "RANDOM_ENEMY_CHARACTER" }],
      },
    ],
  };
}

function jpjsBasement(): CardTemplate {
  return {
    ...building("jpjs-basement", 0, 10),
    rarity: "MYTHIC",
    abilityData: [
      {
        id: "jpjs-basement-trap",
        label: "Trap",
        trigger: "ACTIVATED",
        requiresTarget: true,
        cooldownTurns: 3,
        conditions: [{ type: "CARD_IN_HAND", cardSlug: "jpj" }],
        effects: [{ type: "STUN", target: "ENEMY_CHARACTER", amount: 3, duration: "TURN" }],
      },
    ],
  };
}

function vanessaCard(): CardTemplate {
  return {
    ...unit("vanessa", 2, 4, "AMERICAN"),
    rarity: "EPIC",
    abilityData: [
      {
        id: "vanessa-heartbroken",
        label: "Heartbroken",
        trigger: "ACTIVATED",
        requiresTarget: false,
        cooldownTurns: 3,
        conditions: [{ type: "LEADER_IS", cardSlugs: ["garrett-current", "garrett-prime"] }],
        effects: [{ type: "BUFF_ATTACK", target: "SELF", amount: 3, duration: "PERMANENT" }],
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

function takeCardFromPlayer(match: ReturnType<typeof createMatchState>, playerIndex: number, slug: string) {
  const player = match.players[playerIndex];
  const handCard = player.hand.find((card) => card.template.slug === slug);
  if (handCard) {
    player.hand = player.hand.filter((card) => card.instanceId !== handCard.instanceId);
    return handCard;
  }

  const deckCard = player.deck.find((card) => card.template.slug === slug);
  if (!deckCard) throw new Error(`Expected ${slug} in player ${playerIndex}'s hand or deck.`);
  player.deck = player.deck.filter((card) => card.instanceId !== deckCard.instanceId);
  return deckCard;
}

function putCardInHand(match: ReturnType<typeof createMatchState>, playerIndex: number, slug: string) {
  const card = takeCardFromPlayer(match, playerIndex, slug);
  card.zone = "HAND";
  match.players[playerIndex].hand.push(card);
  return card;
}

function putCardOnBoard(match: ReturnType<typeof createMatchState>, playerIndex: number, slug: string) {
  const card = takeCardFromPlayer(match, playerIndex, slug);
  card.zone = "BOARD";
  match.players[playerIndex].board.push(card);
  return card;
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
assert.notDeepEqual([...first.players[0].hand, ...first.players[0].deck].map((card) => card.template.slug), deck("a").filter((card) => card.cardType !== "LEADER").map((card) => card.slug), "match setup should shuffle cards instead of keeping the saved deck order");

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
assert.equal(state.lastEvent?.visualEvents?.some((event) => event.type === "PLAY" && event.sourceInstanceId === playedCard.instanceId), true, "playing should emit a visual PLAY event");
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
assert.equal(state.lastEvent?.visualEvents?.some((event) => event.type === "ATTACK"), true, "attacking should emit a visual ATTACK event");
assert.equal(state.lastEvent?.visualEvents?.some((event) => event.type === "DAMAGE" && event.targetInstanceId === state.players[1].leader.instanceId), true, "attacking should emit a leader damage event");
assert.equal(state.lastEvent?.visualEvents?.some((event) => event.type === "VICTORY"), true, "finishing a match should emit a visual VICTORY event");

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

function comboState(target: CardTemplate, itemCard: CardTemplate) {
  const match = createMatchState(
    `${target.slug}-${itemCard.slug}`,
    { id: "a", name: "A", deck: [leader, itemCard, target, ...Array.from({ length: 3 }, (_, index) => unit(`combo-extra-${index}`))] },
    { id: "b", name: "B", deck: deck("b-combo") },
    { seed: `${target.slug}-${itemCard.slug}-seed`, deterministic: true },
  );
  const stagedTarget = putCardOnBoard(match, 0, target.slug);
  stagedTarget.enteredTurn = 0;
  putCardInHand(match, 0, itemCard.slug);
  match.players[0].energyCurrent = 10;
  return match;
}

function equipFirstItem(match: ReturnType<typeof createMatchState>, targetInstanceId: string) {
  const itemCard = match.players[0].hand.find((card) => card.template.cardType === "ITEM")!;
  return applyAction(match, {
    type: "PLAY_CARD",
    playerId: match.players[0].playerId,
    cardInstanceId: itemCard.instanceId,
    targetInstanceId,
  });
}

let zubrCombo = comboState(
  { ...unit("necrps-drunken-dad", 10, 6, "BASED"), aura: 9 },
  testItem("zubr-beer", 10, 9, 9),
);
zubrCombo = equipFirstItem(zubrCombo, zubrCombo.players[0].board[0].instanceId);
assert.equal(zubrCombo.players[0].board[0].currentAttack, 30, "zubr beer should give necrps drunken dad double attack buffs");
assert.equal(zubrCombo.players[0].board[0].currentHealth, 24, "zubr beer should give necrps drunken dad double health buffs");
assert.equal(zubrCombo.players[0].board[0].currentAura, 27, "zubr beer should give necrps drunken dad double aura buffs");
assert.equal(zubrCombo.messages.includes("Combo! zubr-beer gave necrps-drunken-dad 2x buffs."), true, "zubr combo should be logged");

let monsterCombo = comboState(
  { ...unit("mwyi", 6, 4, "MINOR"), aura: 5 },
  testItem("white-monster", 9, 2, 7),
);
monsterCombo = equipFirstItem(monsterCombo, monsterCombo.players[0].board[0].instanceId);
assert.equal(monsterCombo.players[0].board[0].currentAttack, 24, "White Monster should give mwyi double attack buffs");
assert.equal(monsterCombo.players[0].board[0].currentHealth, 8, "White Monster should give mwyi double health buffs");
assert.equal(monsterCombo.players[0].board[0].currentAura, 19, "White Monster should give mwyi double aura buffs");

let bongCombo = createMatchState(
  "bong-combo",
  { id: "a", name: "A", deck: [garrettPrimeLeader(), testItem("the-bong", 6, 9, 8), ...Array.from({ length: 4 }, (_, index) => unit(`bong-extra-${index}`))] },
  { id: "b", name: "B", deck: deck("b-bong") },
  { seed: "bong-combo-seed", deterministic: true },
);
bongCombo.players[0].energyCurrent = 10;
bongCombo = equipFirstItem(bongCombo, bongCombo.players[0].leader.instanceId);
assert.equal(bongCombo.players[0].leader.currentAttack, 20, "The Bong should give Garrett Prime double attack buffs");
assert.equal(bongCombo.players[0].leader.currentHealth, 68, "The Bong should give Garrett Prime double health buffs");
assert.equal(bongCombo.players[0].leader.currentAura, 26, "The Bong should give Garrett Prime double aura buffs");

let rifleCombo = comboState(
  { ...unit("american-target", 2, 3, "AMERICAN"), aura: 0 },
  testItem("assault-rifle", 10, 3, 2),
);
rifleCombo = equipFirstItem(rifleCombo, rifleCombo.players[0].board[0].instanceId);
assert.equal(rifleCombo.players[0].board[0].currentAttack, 22, "assault rifle should give American characters double attack buffs");
assert.equal(rifleCombo.players[0].board[0].currentHealth, 9, "assault rifle should give American characters double health buffs");
assert.equal(rifleCombo.players[0].board[0].currentAura, 4, "assault rifle should give American characters double aura buffs");

let rifleNormal = comboState(
  { ...unit("non-american-target", 2, 3, "BASED"), aura: 0 },
  testItem("assault-rifle", 10, 3, 2),
);
rifleNormal = equipFirstItem(rifleNormal, rifleNormal.players[0].board[0].instanceId);
assert.equal(rifleNormal.players[0].board[0].currentAttack, 12, "assault rifle should stay normal on non-American characters");
assert.equal(rifleNormal.players[0].board[0].currentHealth, 6, "assault rifle should stay normal health on non-American characters");
assert.equal(rifleNormal.messages.some((message) => message.startsWith("Combo!")), false, "normal item attachment should not log a combo");

let wokeDeployState = createMatchState(
  "woke-deploy-safe",
  {
    id: "a",
    name: "A",
    deck: [
      leader,
      wokeDeployable(0),
      unit("deploy-board-a", 3, 4),
      unit("deploy-board-b", 2, 5),
      ...Array.from({ length: 4 }, (_, index) => unit(`deploy-extra-${index}`)),
    ],
  },
  { id: "b", name: "B", deck: deck("b-deploy") },
  { seed: "woke-deploy-safe-seed", deterministic: true },
);
for (const slug of ["deploy-board-a", "deploy-board-b"]) {
  putCardOnBoard(wokeDeployState, 0, slug);
}
wokeDeployState.players[0].energyCurrent = 10;
const safeWokeItem = putCardInHand(wokeDeployState, 0, "woke-deployable-0");
wokeDeployState = applyAction(wokeDeployState, {
  type: "PLAY_CARD",
  playerId: "a",
  cardInstanceId: safeWokeItem.instanceId,
  targetInstanceId: wokeDeployState.players[0].leader.instanceId,
});
assert.equal(wokeDeployState.players[0].leader.currentAttack, 3, "Woke deployable should buff the friendly leader attack");
assert.equal(wokeDeployState.players[0].leader.currentHealth, 29, "Woke deployable should buff the friendly leader health");
assert.equal(wokeDeployState.players[0].leader.currentAura, 2, "Woke deployable should buff the friendly leader aura");
assert.equal(wokeDeployState.players[0].board[0].currentAttack, 5, "Woke deployable should buff current board attack");
assert.equal(wokeDeployState.players[0].board[1].currentHealth, 9, "Woke deployable should buff current board health");
assert.equal(wokeDeployState.phase, "MAIN", "0% Woke deployable should not destroy anything");

let wokeDeployDoomState = createMatchState(
  "woke-deploy-doom",
  {
    id: "a",
    name: "A",
    deck: [
      leader,
      wokeDeployable(1),
      unit("doom-board-a", 3, 4),
      unit("doom-board-b", 2, 5),
      ...Array.from({ length: 4 }, (_, index) => unit(`doom-extra-${index}`)),
    ],
  },
  { id: "b", name: "B", deck: deck("b-doom") },
  { seed: "woke-deploy-doom-seed", deterministic: true },
);
for (const slug of ["doom-board-a", "doom-board-b"]) {
  putCardOnBoard(wokeDeployDoomState, 0, slug);
}
wokeDeployDoomState.players[0].energyCurrent = 10;
const doomWokeItem = putCardInHand(wokeDeployDoomState, 0, "woke-deployable-1");
wokeDeployDoomState = applyAction(wokeDeployDoomState, {
  type: "PLAY_CARD",
  playerId: "a",
  cardInstanceId: doomWokeItem.instanceId,
  targetInstanceId: wokeDeployDoomState.players[0].leader.instanceId,
});
assert.equal(wokeDeployDoomState.phase, "FINISHED", "100% Woke deployable should be able to destroy the leader");
assert.equal(wokeDeployDoomState.winnerId, "b", "destroying your own leader should lose the match");
assert.equal(wokeDeployDoomState.players[0].graveyard.some((card) => card.template.slug === "doom-board-a"), true, "Woke deployable should roll destruction for each board card");
assert.equal(wokeDeployDoomState.players[0].graveyard.some((card) => card.template.slug === "doom-board-b"), true, "Woke deployable should roll destruction independently for all current board cards");

const protectedState = createMatchState(
  "building-protect",
  { id: "a", name: "A", deck: [leader, unit("attacker", 3, 3), ...Array.from({ length: 9 }, (_, index) => unit(`a-extra-${index}`))] },
  { id: "b", name: "B", deck: [leader, building("wall", 0, 5), ...Array.from({ length: 9 }, (_, index) => unit(`b-extra-${index}`))] },
  { seed: "building-protect-seed", deterministic: true },
);
const attacker = putCardOnBoard(protectedState, 0, "attacker");
attacker.enteredTurn = 0;
attacker.exhausted = false;
const wall = putCardOnBoard(protectedState, 1, "wall");
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

let botState = createMatchState(
  "story-bot-play",
  { id: "story-player", name: "Player", deck: deck("story-player") },
  { id: "story-bot", name: "Bot", deck: [leader, unit("bot-playable", 4, 4), ...Array.from({ length: 9 }, (_, index) => unit(`bot-extra-${index}`))] },
  { seed: "story-bot-play-seed", deterministic: true },
);
botState = applyAction(botState, { type: "END_TURN", playerId: "story-player" });
const botPlayAction = chooseBotAction(botState, "story-bot", "NORMAL");
assert.equal(validateAction(botState, botPlayAction).ok, true, "bot should choose a legal action");
botState = applyAction(botState, botPlayAction);
assert.equal(botState.players[1].board.length > 0 || botPlayAction.type === "END_TURN", true, "bot should be able to play or pass legally");

const botProtectedState = createMatchState(
  "story-bot-building-protect",
  { id: "story-player", name: "Player", deck: [leader, building("player-wall", 0, 5), ...Array.from({ length: 9 }, (_, index) => unit(`player-wall-extra-${index}`))] },
  { id: "story-bot", name: "Bot", deck: [leader, unit("bot-attacker", 6, 5), ...Array.from({ length: 9 }, (_, index) => unit(`bot-wall-extra-${index}`))] },
  { seed: "story-bot-building-protect-seed", deterministic: true },
);
const botWall = putCardOnBoard(botProtectedState, 0, "player-wall");
const botAttacker = putCardOnBoard(botProtectedState, 1, "bot-attacker");
botProtectedState.players[1].hand = [];
botAttacker.enteredTurn = 0;
botAttacker.exhausted = false;
botProtectedState.activePlayerId = "story-bot";
botProtectedState.players[1].energyCurrent = 3;
const botAttackAction = chooseBotAction(botProtectedState, "story-bot", "HARD");
assert.equal(botAttackAction.type, "ATTACK", "bot should attack when it has a legal attacker");
assert.equal(botAttackAction.type === "ATTACK" ? botAttackAction.targetInstanceId : "", botWall.instanceId, "bot should attack protecting buildings before leader");

const stunnedBotState = structuredClone(botProtectedState);
stunnedBotState.players[1].board[0].stunnedUntilTurn = stunnedBotState.turn + 3;
const stunnedBotAction = chooseBotAction(stunnedBotState, "story-bot", "HARD");
assert.notEqual(stunnedBotAction.type === "ATTACK" ? stunnedBotAction.attackerInstanceId : "", stunnedBotState.players[1].board[0].instanceId, "bot should not attack with stunned cards");

let onceBotState = createMatchState(
  "story-bot-once-per-game",
  { id: "story-bot", name: "Bot", deck: [oncePerGameLeader()] },
  { id: "story-player", name: "Player", deck: [leader] },
  { seed: "story-bot-once-per-game-seed", deterministic: true },
);
onceBotState.players[0].leader.currentHealth -= 1;
const onceBotAction = chooseBotAction(onceBotState, "story-bot", "NORMAL");
assert.equal(onceBotAction.type, "USE_ABILITY", "bot should use an available once-per-game ability");
onceBotState = applyAction(onceBotState, onceBotAction);
onceBotState = applyAction(onceBotState, { type: "END_TURN", playerId: "story-bot" });
onceBotState = applyAction(onceBotState, { type: "END_TURN", playerId: "story-player" });
assert.deepEqual(validateAction(onceBotState, {
  type: "USE_ABILITY",
  playerId: "story-bot",
  sourceInstanceId: onceBotState.players[0].leader.instanceId,
  abilityId: "once-leader-heal",
}), { ok: false, reason: "Ability was already used this game." }, "once-per-game abilities should stay blocked on later turns");
assert.equal(chooseBotAction(onceBotState, "story-bot", "NORMAL").type, "END_TURN", "bot should pass instead of repeating a spent once-per-game ability forever");

let randomCharacterDestroyState = createMatchState(
  "random-character-destroy",
  { id: "a", name: "A", deck: [randomEnemyCharacterDestroyLeader()] },
  { id: "b", name: "B", deck: [leader, unit("random-destroy-target", 1, 6), building("random-destroy-building", 0, 10), ...Array.from({ length: 8 }, (_, index) => unit(`random-destroy-extra-${index}`))] },
  { seed: "random-character-destroy-seed", deterministic: true },
);
putCardOnBoard(randomCharacterDestroyState, 1, "random-destroy-target");
putCardOnBoard(randomCharacterDestroyState, 1, "random-destroy-building");
const randomDestroyLeaderHealth = randomCharacterDestroyState.players[1].leader.currentHealth;
randomCharacterDestroyState = applyAction(randomCharacterDestroyState, {
  type: "USE_ABILITY",
  playerId: "a",
  sourceInstanceId: randomCharacterDestroyState.players[0].leader.instanceId,
  abilityId: "random-character-destroy",
});
assert.equal(randomCharacterDestroyState.players[1].leader.currentHealth, randomDestroyLeaderHealth, "random enemy character destroy should not hit leaders");
assert.equal(randomCharacterDestroyState.players[1].board.some((card) => card.template.slug === "random-destroy-building"), true, "random enemy character destroy should not hit buildings");
assert.equal(randomCharacterDestroyState.players[1].graveyard.some((card) => card.template.slug === "random-destroy-target"), true, "random enemy character destroy should remove a board character");

const bossEncounter = storyEncounters.find((encounter) => encounter.slug === "woke-mind-virus")!;
const bossDeck = buildStoryEnemyDeck(cardCatalog, bossEncounter);
const bossState = createMatchState(
  "story-boss",
  { id: "story-player", name: "Player", deck: deck("story-boss-player") },
  { id: "story-bot", name: bossEncounter.name, deck: bossDeck },
  { seed: "story-boss-seed", deterministic: true },
);
assert.equal(bossState.players[1].leader.template.slug, "woke-mind-virus", "story final boss should use the Woke Mind Virus leader");

const chapterTwoFirst = storyEncounters.find((encounter) => encounter.slug === "chapter-2-ada-printa")!;
assert.equal(chapterTwoFirst.chapter, 2, "chapter 2 first fight should be marked as chapter 2");
assert.equal(chapterTwoFirst.requiredPreviousSlug, "woke-mind-virus", "chapter 2 should unlock after the first Woke Mind Virus fight");
const chapterTwoFinal = storyEncounters.find((encounter) => encounter.slug === "chapter-2-woke-mind-virus")!;
const chapterTwoTom = storyEncounters.find((encounter) => encounter.slug === "chapter-2-tom-macdonald-blacked")!;
assert.equal(chapterTwoTom.requiredPreviousSlug, "chapter-2-vanessa", "Tom gate should unlock after Vanessa");
assert.equal(chapterTwoTom.rewardSlug, "tom-macdonald-blacked-chapter-2-reward", "Tom gate should grant its story reward");
assert.equal(chapterTwoFinal.requiredPreviousSlug, "chapter-2-tom-macdonald-blacked", "ascended Woke should unlock after Tom gate");
assert.equal(chapterTwoFinal.rewardSlug, "woke-mind-virus-deployable", "chapter 2 final boss should grant the deployable Woke Mind Virus");
const chapterTwoTomDeck = buildStoryEnemyDeck(cardCatalog, chapterTwoTom);
const chapterTwoTomState = createMatchState(
  "story-chapter-2-tom",
  { id: "story-player", name: "Player", deck: deck("story-chapter-2-tom-player") },
  { id: "story-bot", name: chapterTwoTom.name, deck: chapterTwoTomDeck },
  { seed: "story-chapter-2-tom-seed", deterministic: true },
);
assert.equal(chapterTwoTomState.players[1].leader.template.slug, "tom-macdonald-blacked-chapter-2-leader", "Tom gate should use the Tom story leader");
const chapterTwoBossDeck = buildStoryEnemyDeck(cardCatalog, chapterTwoFinal);
const chapterTwoBossState = createMatchState(
  "story-chapter-2-boss",
  { id: "story-player", name: "Player", deck: deck("story-chapter-2-player") },
  { id: "story-bot", name: chapterTwoFinal.name, deck: chapterTwoBossDeck },
  { seed: "story-chapter-2-boss-seed", deterministic: true },
);
assert.equal(chapterTwoBossState.players[1].leader.template.slug, "woke-mind-virus-ascended-story-leader", "chapter 2 final boss should use the ascended Woke leader");
assert.equal(cardCatalog.find((card) => card.slug === "woke-mind-virus-deployable")?.dropEnabled, false, "chapter 2 final reward should not drop from packs");
assert.equal(cardCatalog.find((card) => card.slug === "tom-macdonald-blacked-chapter-2-leader")?.dropEnabled, false, "Tom story leader should not drop from packs");
assert.equal(cardCatalog.find((card) => card.slug === "tom-macdonald-blacked-chapter-2-reward")?.dropEnabled, false, "Tom story reward should not drop from packs");

const chapterThreeFirst = storyEncounters.find((encounter) => encounter.slug === "chapter-3-woke-charlie-kirk")!;
const chapterThreeFinal = storyEncounters.find((encounter) => encounter.slug === "chapter-3-anarchy-gluttonous")!;
assert.equal(chapterThreeFirst.chapter, 3, "chapter 3 first fight should be marked as chapter 3");
assert.equal(chapterThreeFirst.requiredPreviousSlug, "chapter-2-woke-mind-virus", "chapter 3 should unlock after chapter 2 final boss");
assert.equal(chapterThreeFinal.rewardSlug, "anarchy-gluttonous-chapter-3-reward", "chapter 3 final boss should grant the gluttonous Anarchy reward");
const chapterThreeFinalDeck = buildStoryEnemyDeck(cardCatalog, chapterThreeFinal);
const chapterThreeFinalState = createMatchState(
  "story-chapter-3-boss",
  { id: "story-player", name: "Player", deck: deck("story-chapter-3-player") },
  { id: "story-bot", name: chapterThreeFinal.name, deck: chapterThreeFinalDeck },
  { seed: "story-chapter-3-boss-seed", deterministic: true },
);
assert.equal(chapterThreeFinalState.players[1].leader.template.slug, "anarchy-gluttonous-chapter-3-leader", "chapter 3 final boss should use gluttonous Anarchy");
for (const slug of [
  "woke-charlie-kirk-chapter-3-leader",
  "king-von-chapter-3-leader",
  "shrekel-not-in-poland-chapter-3-leader",
  "kanye-west-chapter-3-leader",
  "suicide-bomber-chapter-3-leader",
  "anarchy-gluttonous-chapter-3-leader",
  "anarchy-gluttonous-chapter-3-reward",
  "necrps-very-drunken-dad",
]) {
  assert.equal(cardCatalog.find((card) => card.slug === slug)?.dropEnabled, false, `${slug} should not drop from packs`);
}

let wokeCharlieState = createMatchState(
  "woke-charlie-feature",
  { id: "a", name: "A", deck: [cardCatalog.find((card) => card.slug === "woke-charlie-kirk-chapter-3-leader")!, ...Array.from({ length: 10 }, (_, index) => unit(`a-woke-charlie-extra-${index}`))] },
  { id: "b", name: "B", deck: [leader, unit("woke-charlie-target-a", 1, 8), unit("woke-charlie-target-b", 1, 8), ...Array.from({ length: 10 }, (_, index) => unit(`b-woke-charlie-extra-${index}`))] },
  { seed: "woke-charlie-feature-seed", deterministic: true },
);
putCardOnBoard(wokeCharlieState, 1, "woke-charlie-target-a");
putCardOnBoard(wokeCharlieState, 1, "woke-charlie-target-b");
wokeCharlieState = applyAction(wokeCharlieState, {
  type: "USE_ABILITY",
  playerId: "a",
  sourceInstanceId: wokeCharlieState.players[0].leader.instanceId,
  abilityId: "woke-charlie-kirk-platform-shift",
});
assert.equal(wokeCharlieState.players[1].board.every((card) => card.currentHealth === 5), true, "Platform Shift should damage every enemy character");
assert.equal(wokeCharlieState.players[1].board.some((card) => (card.blindedUntilTurn ?? 0) > wokeCharlieState.turn), true, "Platform Shift should blind one enemy character");
assert.equal(wokeCharlieState.players[0].leader.currentAura, 14, "Platform Shift should permanently increase Woke Charlie aura");

let kingVonState = createMatchState(
  "king-von-feature",
  { id: "a", name: "A", deck: [cardCatalog.find((card) => card.slug === "king-von-chapter-3-leader")!, ...Array.from({ length: 10 }, (_, index) => unit(`a-king-von-extra-${index}`))] },
  { id: "b", name: "B", deck: [leader, unit("king-von-target", 1, 10), ...Array.from({ length: 10 }, (_, index) => unit(`b-king-von-extra-${index}`))] },
  { seed: "king-von-feature-seed", deterministic: true },
);
const kingTarget = putCardOnBoard(kingVonState, 1, "king-von-target");
kingVonState = applyAction(kingVonState, {
  type: "USE_ABILITY",
  playerId: "a",
  sourceInstanceId: kingVonState.players[0].leader.instanceId,
  abilityId: "king-von-pressure-story",
  targetInstanceId: kingTarget.instanceId,
});
assert.equal(kingVonState.players[1].board[0].currentHealth, 2, "Story Pressure should heavily damage the selected enemy character");
assert.equal(kingVonState.players[0].leader.currentAttack, 15, "Story Pressure should increase King Von attack");

let shrekelState = createMatchState(
  "shrekel-feature",
  { id: "a", name: "A", deck: [cardCatalog.find((card) => card.slug === "shrekel-not-in-poland-chapter-3-leader")!, ...Array.from({ length: 10 }, (_, index) => unit(`a-shrekel-extra-${index}`))] },
  { id: "b", name: "B", deck: [leader, unit("shrekel-target", 1, 10), ...Array.from({ length: 10 }, (_, index) => unit(`b-shrekel-extra-${index}`))] },
  { seed: "shrekel-feature-seed", deterministic: true },
);
putCardOnBoard(shrekelState, 1, "shrekel-target");
shrekelState.players[0].leader.currentHealth -= 20;
shrekelState = applyAction(shrekelState, {
  type: "USE_ABILITY",
  playerId: "a",
  sourceInstanceId: shrekelState.players[0].leader.instanceId,
  abilityId: "shrekel-not-in-poland-swamp-tax",
});
assert.equal(shrekelState.players[0].leader.currentHealth, shrekelState.players[0].leader.currentMaxHealth - 10, "Swamp Tax should heal Shrekel");
assert.equal(shrekelState.players[0].leader.shielded, true, "Swamp Tax should shield Shrekel");
assert.equal(shrekelState.players[1].board.some((card) => (card.stunnedUntilTurn ?? 0) > shrekelState.turn), true, "Swamp Tax should stun one enemy character");

let consumeState = createMatchState(
  "consume",
  { id: "a", name: "A", deck: [cardCatalog.find((card) => card.slug === "anarchy-gluttonous-chapter-3-leader")!, ...Array.from({ length: 10 }, (_, index) => unit(`a-consume-extra-${index}`))] },
  { id: "b", name: "B", deck: [leader, building("consume-building", 0, 7), ...Array.from({ length: 10 }, (_, index) => unit(`b-consume-extra-${index}`))] },
  { seed: "consume-seed", deterministic: true },
);
const consumeTarget = putCardOnBoard(consumeState, 1, "consume-building");
const consumeHealthBefore = consumeState.players[0].leader.currentHealth;
consumeState = applyAction(consumeState, {
  type: "USE_ABILITY",
  playerId: "a",
  sourceInstanceId: consumeState.players[0].leader.instanceId,
  abilityId: "anarchy-gluttonous-devour",
  targetInstanceId: consumeTarget.instanceId,
});
assert.equal(consumeState.players[1].graveyard.some((card) => card.template.slug === "consume-building"), true, "CONSUME should destroy the selected enemy board card");
assert.equal(consumeState.players[0].leader.currentHealth, consumeHealthBefore + 7, "CONSUME should add the target max HP to source current HP");
assert.equal(consumeState.players[0].leader.currentMaxHealth, cardCatalog.find((card) => card.slug === "anarchy-gluttonous-chapter-3-leader")!.health * 5 + 7, "CONSUME should add the target max HP to source max HP");

let transformState = createMatchState(
  "kanye-transform",
  { id: "a", name: "A", deck: [cardCatalog.find((card) => card.slug === "kanye-west-chapter-3-leader")!, ...Array.from({ length: 10 }, (_, index) => unit(`a-transform-extra-${index}`))] },
  { id: "b", name: "B", deck: deck("b-transform") },
  { seed: "kanye-transform-seed", deterministic: true },
);
transformState = applyAction(transformState, {
  type: "USE_ABILITY",
  playerId: "a",
  sourceInstanceId: transformState.players[0].leader.instanceId,
  abilityId: "kanye-west-become-ye",
});
assert.equal(transformState.players[0].leader.currentAttack, 20, "TEMP_TRANSFORM should apply the temporary attack buff immediately");
assert.equal(transformState.players[0].leader.currentMaxHealth, 240, "TEMP_TRANSFORM should apply the temporary health buff immediately");
assert.equal(transformState.players[0].leader.currentAura, 15, "TEMP_TRANSFORM should apply the temporary aura buff immediately");
transformState = applyAction(transformState, { type: "END_TURN", playerId: "a" });
transformState = applyAction(transformState, { type: "END_TURN", playerId: "b" });
assert.equal(transformState.players[0].leader.currentAttack, 9, "TEMP_TRANSFORM should expire and apply the weaker-afterward attack penalty");
assert.equal(transformState.players[0].leader.currentMaxHealth, 217, "TEMP_TRANSFORM should expire and apply the weaker-afterward health penalty");
assert.equal(transformState.players[0].leader.currentAura, 11, "TEMP_TRANSFORM should expire and apply the weaker-afterward aura penalty");

let bomberSafeState = createMatchState(
  "bomber-safe",
  { id: "a", name: "A", deck: [leader, leaderDamageUnit("safe-damager", 230), ...Array.from({ length: 10 }, (_, index) => unit(`a-safe-extra-${index}`))] },
  { id: "b", name: "B", deck: [cardCatalog.find((card) => card.slug === "suicide-bomber-chapter-3-leader")!, unit("safe-board", 1, 3), ...Array.from({ length: 10 }, (_, index) => unit(`b-safe-extra-${index}`))] },
  { seed: "bomber-safe-seed", deterministic: true },
);
const safeDamager = putCardOnBoard(bomberSafeState, 0, "safe-damager");
putCardOnBoard(bomberSafeState, 1, "safe-board");
bomberSafeState = applyAction(bomberSafeState, {
  type: "USE_ABILITY",
  playerId: "a",
  sourceInstanceId: safeDamager.instanceId,
  abilityId: "safe-damager-leader-damage",
});
assert.equal(bomberSafeState.phase, "MAIN", "bomber should not detonate at exactly 20 HP");
assert.equal(bomberSafeState.players[1].board.some((card) => card.template.slug === "safe-board"), true, "bomber should not wipe the board above the threshold");

let bomberDoomState = createMatchState(
  "bomber-doom",
  { id: "a", name: "A", deck: [leader, leaderDamageUnit("doom-damager", 231), unit("enemy-board", 1, 3), ...Array.from({ length: 10 }, (_, index) => unit(`a-doom-extra-${index}`))] },
  { id: "b", name: "B", deck: [cardCatalog.find((card) => card.slug === "suicide-bomber-chapter-3-leader")!, unit("bomber-board", 1, 3), ...Array.from({ length: 10 }, (_, index) => unit(`b-doom-extra-${index}`))] },
  { seed: "bomber-doom-seed", deterministic: true },
);
const doomDamager = putCardOnBoard(bomberDoomState, 0, "doom-damager");
putCardOnBoard(bomberDoomState, 0, "enemy-board");
putCardOnBoard(bomberDoomState, 1, "bomber-board");
bomberDoomState = applyAction(bomberDoomState, {
  type: "USE_ABILITY",
  playerId: "a",
  sourceInstanceId: doomDamager.instanceId,
  abilityId: "doom-damager-leader-damage",
});
assert.equal(bomberDoomState.phase, "FINISHED", "bomber detonation should be able to end the match by destroying the enemy leader");
assert.equal(bomberDoomState.winnerId, "b", "bomber should survive its own detonation and win if the enemy leader dies");
assert.equal(bomberDoomState.players[1].leader.currentHealth, 19, "bomber source should not destroy itself");
assert.equal(bomberDoomState.players[1].oncePerGameUsed.includes("suicide-bomber-critical-detonation"), true, "bomber detonation should be once per game");

let coinHeadsState = createMatchState(
  "coin-heads",
  { id: "a", name: "A", deck: [leader, coinUnit("coin-heads-unit"), ...Array.from({ length: 9 }, (_, index) => unit(`a-coin-heads-extra-${index}`))] },
  { id: "b", name: "B", deck: [leader, unit("enemy-heads-target"), ...Array.from({ length: 9 }, (_, index) => unit(`b-coin-heads-extra-${index}`))] },
  { seed: "coin-tails", deterministic: true },
);
const headsSource = putCardOnBoard(coinHeadsState, 0, "coin-heads-unit");
headsSource.enteredTurn = 0;
putCardOnBoard(coinHeadsState, 1, "enemy-heads-target");
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
const tailsSource = putCardOnBoard(coinTailsState, 0, "coin-tails-unit");
tailsSource.enteredTurn = 0;
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
const cooldownSource = putCardOnBoard(cooldownState, 0, "cooldown-unit");
cooldownSource.enteredTurn = 0;
putCardOnBoard(cooldownState, 1, "cooldown-target");
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
putCardOnBoard(tuffState, 1, "enemy-character-a");
putCardOnBoard(tuffState, 1, "enemy-character-b");
putCardOnBoard(tuffState, 1, "enemy-building");
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

const basementBlockedState = createMatchState(
  "jpjs-basement-blocked",
  { id: "a", name: "A", deck: [leader, jpjsBasement(), ...Array.from({ length: 10 }, (_, index) => unit(`a-basement-blocked-extra-${index}`))] },
  { id: "b", name: "B", deck: [leader, unit("trap-target", 1, 6), ...Array.from({ length: 10 }, (_, index) => unit(`b-basement-blocked-extra-${index}`))] },
  { seed: "jpjs-basement-blocked-seed", deterministic: true },
);
const blockedBasement = putCardOnBoard(basementBlockedState, 0, "jpjs-basement");
const blockedTrapTarget = putCardOnBoard(basementBlockedState, 1, "trap-target");
assert.deepEqual(validateAction(basementBlockedState, {
  type: "USE_ABILITY",
  playerId: basementBlockedState.players[0].playerId,
  sourceInstanceId: blockedBasement.instanceId,
  abilityId: "jpjs-basement-trap",
  targetInstanceId: blockedTrapTarget.instanceId,
}), { ok: false, reason: "Trap needs jpj in hand." }, "JPJ's Basement trap should require jpj in hand");

let basementState = createMatchState(
  "jpjs-basement",
  { id: "a", name: "A", deck: [leader, jpjsBasement(), unit("jpj"), ...Array.from({ length: 10 }, (_, index) => unit(`a-basement-extra-${index}`))] },
  { id: "b", name: "B", deck: [leader, unit("trap-target", 1, 6), ...Array.from({ length: 10 }, (_, index) => unit(`b-basement-extra-${index}`))] },
  { seed: "jpjs-basement-seed", deterministic: true },
);
const basement = putCardOnBoard(basementState, 0, "jpjs-basement");
const trapTarget = putCardOnBoard(basementState, 1, "trap-target");
basementState = applyAction(basementState, {
  type: "USE_ABILITY",
  playerId: basementState.players[0].playerId,
  sourceInstanceId: basement.instanceId,
  abilityId: "jpjs-basement-trap",
  targetInstanceId: trapTarget.instanceId,
});
assert.equal(basementState.players[1].board[0].stunnedUntilTurn, 4, "JPJ's Basement should trap the target for 3 turns");
assert.equal(basementState.players[0].board[0].abilityCooldowns["jpjs-basement-trap"], 5, "JPJ's Basement trap should have a 3-turn cooldown");

let vanessaState = createMatchState(
  "vanessa-heartbroken",
  { id: "a", name: "A", deck: [garrettPrimeLeader(), vanessaCard(), ...Array.from({ length: 10 }, (_, index) => unit(`a-vanessa-extra-${index}`))] },
  { id: "b", name: "B", deck: deck("b-vanessa") },
  { seed: "vanessa-heartbroken-seed", deterministic: true },
);
const vanessa = putCardOnBoard(vanessaState, 0, "vanessa");
vanessaState = applyAction(vanessaState, {
  type: "USE_ABILITY",
  playerId: vanessaState.players[0].playerId,
  sourceInstanceId: vanessa.instanceId,
  abilityId: "vanessa-heartbroken",
});
assert.equal(vanessaState.players[0].board[0].currentAttack, 5, "Heartbroken should increase Vanessa's attack by 3 with Garrett as leader");
assert.equal(vanessaState.players[0].board[0].abilityCooldowns["vanessa-heartbroken"], 5, "Heartbroken should have a 3-turn cooldown");

const vanessaBlockedState = createMatchState(
  "vanessa-heartbroken-blocked",
  { id: "a", name: "A", deck: [leader, vanessaCard(), ...Array.from({ length: 10 }, (_, index) => unit(`a-vanessa-blocked-extra-${index}`))] },
  { id: "b", name: "B", deck: deck("b-vanessa-blocked") },
  { seed: "vanessa-heartbroken-blocked-seed", deterministic: true },
);
const blockedVanessa = putCardOnBoard(vanessaBlockedState, 0, "vanessa");
assert.deepEqual(validateAction(vanessaBlockedState, {
  type: "USE_ABILITY",
  playerId: vanessaBlockedState.players[0].playerId,
  sourceInstanceId: blockedVanessa.instanceId,
  abilityId: "vanessa-heartbroken",
}), { ok: false, reason: "Heartbroken needs the required leader active." }, "Heartbroken should require Garrett Current or Garrett Prime as leader");

let flexState = createMatchState(
  "garrett-flex",
  { id: "a", name: "A", deck: [garrettPrimeLeader(), ...Array.from({ length: 10 }, (_, index) => unit(`a-flex-extra-${index}`))] },
  { id: "b", name: "B", deck: [leader, unit("flex-target", 2, 6), ...Array.from({ length: 9 }, (_, index) => unit(`b-flex-extra-${index}`))] },
  { seed: "garrett-flex-seed", deterministic: true },
);
const flexTarget = putCardOnBoard(flexState, 1, "flex-target");
flexTarget.enteredTurn = 0;
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
