import assert from "node:assert/strict";
import { openPack } from "@/lib/game/packs/openPack";
import type { CardTemplate } from "@/types/cards";

const commonLeader: CardTemplate = {
  slug: "leader",
  name: "Leader",
  description: "",
  flavorText: "",
  rarity: "COMMON",
  cardType: "LEADER",
  attack: 1,
  health: 1,
  size: 1,
  aura: 1,
  imageUrl: "",
  abilityData: [],
};

const rareLeader: CardTemplate = {
  ...commonLeader,
  slug: "rare-leader",
  name: "Rare Leader",
  rarity: "RARE",
};

const onlyCommon = openPack([commonLeader], 3, {
  COMMON: 1,
  RARE: 0,
  EPIC: 0,
  LEGENDARY: 0,
  MYTHIC: 0,
  ULTRA_LEGENDARY: 0,
});

assert.equal(onlyCommon.cards.length, 3, "pack should still fill slots from a leader-only pool");
assert.equal(onlyCommon.cards.every((card) => card.cardType === "LEADER"), true, "leaders should be eligible pack rewards");

const forcedRare = openPack([commonLeader, rareLeader], 1, {
  COMMON: 0,
  RARE: 1,
  EPIC: 0,
  LEGENDARY: 0,
  MYTHIC: 0,
  ULTRA_LEGENDARY: 0,
});

assert.equal(forcedRare.cards[0].slug, "rare-leader", "rarity rolls should be able to choose a leader of that rarity");

const storyOnlyRare = {
  ...rareLeader,
  slug: "story-only-rare",
  dropEnabled: false,
};
const forcedRareWithStoryCard = openPack([commonLeader, storyOnlyRare], 5, {
  COMMON: 0,
  RARE: 1,
  EPIC: 0,
  LEGENDARY: 0,
  MYTHIC: 0,
  ULTRA_LEGENDARY: 0,
});

assert.equal(
  forcedRareWithStoryCard.cards.every((card) => card.slug !== "story-only-rare"),
  true,
  "drop-disabled story cards should not appear in packs",
);

console.log("pack opening tests passed");
