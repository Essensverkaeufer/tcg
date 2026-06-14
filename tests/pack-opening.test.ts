import assert from "node:assert/strict";
import { openPack } from "@/lib/game/packs/openPack";
import { gachaBanners, getFeaturedChanceForNextPull, getGachaBanner, getGuaranteedIn } from "@/lib/game/gacha";
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

const tateBanner = getGachaBanner("tate-brothers-constellation");
assert.ok(tateBanner, "Tate Brothers gacha banner should exist");
assert.deepEqual(tateBanner.featuredSlugs, ["andrew-tate", "tristan-tate"], "Tate banner should have two featured cards");
assert.equal(getGuaranteedIn(99, tateBanner), 1, "dual-feature banner should use normal hard pity math");
assert.equal(getFeaturedChanceForNextPull(99, tateBanner), 1, "dual-feature banner should guarantee a featured card at hard pity");
assert.equal(gachaBanners.every((banner) => banner.featuredSlugs.length >= 1), true, "every gacha banner should declare at least one featured card");
assert.equal(gachaBanners.filter((banner) => banner.featuredSlugs.length === 1).length >= 3, true, "existing single-feature banners should stay represented");

console.log("pack opening tests passed");
