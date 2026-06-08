import { cardCatalog } from "@/lib/game/cards";
import type { CardTemplate } from "@/types/cards";

export type StoryDifficulty = "EASY" | "NORMAL" | "HARD" | "BOSS";

export type StoryEncounter = {
  slug: string;
  name: string;
  description: string;
  chapter: 1 | 2;
  difficulty: StoryDifficulty;
  position: { x: number; y: number };
  requiredPreviousSlug?: string;
  enemyDeck: string[];
  rewardSlug?: string;
  boss?: boolean;
};

export type StoryProgressStatus = "LOCKED" | "UNLOCKED" | "COMPLETED";

export const wokeMindVirusLeader: CardTemplate = {
  slug: "woke-mind-virus",
  name: "The Woke Mind Virus",
  description: "The final boss. A spreading status nightmare with way too much influence.",
  flavorText: "It was in the algorithm the whole time.",
  rarity: "DIVINE",
  cardType: "LEADER",
  attack: 10,
  health: 18,
  size: 5,
  aura: 12,
  category: "BOSS",
  imageUrl: "/card-art/woke-mind-virus.webp",
  abilityData: [
    {
      id: "woke-mind-virus-brainrot",
      label: "Brainrot Cascade",
      trigger: "ACTIVATED",
      requiresTarget: false,
      cooldownTurns: 3,
      effects: [
        { type: "DAMAGE", target: "ENEMY_BOARD_CHARACTERS", amount: 4 },
        { type: "BLIND", target: "ENEMY_CHARACTER", amount: 1, duration: "TURN" },
      ],
    },
  ],
};

export const storyEncounters: StoryEncounter[] = [
  {
    slug: "tutorial-garrett-current",
    name: "Tutorial Garrett",
    description: "A soft opener with low stats and simple plays.",
    chapter: 1,
    difficulty: "EASY",
    position: { x: 8, y: 64 },
    enemyDeck: [
      "garrett-prime",
      "garrett-current",
      "garrett-current",
      "ada-printa",
      "ada-printa",
      "kyu-sugardust",
      "kyu-sugardust",
      "white-monster",
      "hunie-pop-speedrunning",
      "the-group-chat",
    ],
  },
  {
    slug: "rowlet-study-session",
    name: "gay Little Puppygirl",
    description: "A chaotic early boss that starts using ability pressure.",
    chapter: 1,
    difficulty: "NORMAL",
    requiredPreviousSlug: "tutorial-garrett-current",
    position: { x: 25, y: 40 },
    rewardSlug: "gay-little-puppygirl-story-reward",
    enemyDeck: [
      "gay-little-puppygirl-story-leader",
      "rowletforsenator",
      "rowletforsenator",
      "white-monster",
      "white-monster",
      "florida",
      "ada-printa",
      "frenchplaty",
      "pacmanpowerghost",
      "huniepotheads",
    ],
  },
  {
    slug: "jpj-basement-trap",
    name: "buurazu",
    description: "A bulky boss fight with JPJ support and basement pressure.",
    chapter: 1,
    difficulty: "NORMAL",
    requiredPreviousSlug: "rowlet-study-session",
    position: { x: 43, y: 68 },
    rewardSlug: "buurazu-story-reward",
    enemyDeck: [
      "buurazu-story-leader",
      "buurazu",
      "jpj",
      "jpjs-basement",
      "jpjs-basement",
      "the-group-chat",
      "poland",
      "zubr-beer",
      "charlie-kirk",
      "vanessa",
      "rowletforsenator",
    ],
  },
  {
    slug: "necrp-tuff-wall",
    name: "Anarchy",
    description: "A volatile boss with safe random character removal and defensive support.",
    chapter: 1,
    difficulty: "HARD",
    requiredPreviousSlug: "jpj-basement-trap",
    position: { x: 61, y: 44 },
    rewardSlug: "anarchy-story-reward",
    enemyDeck: [
      "anarchy-story-leader",
      "anarchy",
      "necrp",
      "necrps-drunken-dad",
      "pillow-necrp",
      "pillow-necrp",
      "zubr-beer",
      "zubr-beer",
      "white-monster",
      "jpjs-basement",
      "poland",
    ],
  },
  {
    slug: "pillow-necrp-rest-stop",
    name: "pacmanpowerghost (corrupted)",
    description: "A corrupted miniboss that blinds key characters and hides behind big walls.",
    chapter: 1,
    difficulty: "HARD",
    requiredPreviousSlug: "necrp-tuff-wall",
    position: { x: 76, y: 66 },
    rewardSlug: "pacmanpowerghost-corrupted-story-reward",
    enemyDeck: [
      "pacmanpowerghost-corrupted-story-leader",
      "pacmanpowerghost",
      "pillow-necrp",
      "pillow-necrp",
      "necrp",
      "necrps-drunken-dad",
      "zubr-beer",
      "the-bong",
      "jpjs-basement",
      "poland",
      "texas",
    ],
  },
  {
    slug: "woke-mind-virus",
    name: "The Woke Mind Virus",
    description: "Final boss of the first path. Strong deck, ruthless bot.",
    chapter: 1,
    difficulty: "BOSS",
    requiredPreviousSlug: "pillow-necrp-rest-stop",
    position: { x: 92, y: 32 },
    boss: true,
    enemyDeck: [
      "woke-mind-virus",
      "garrett-current",
      "garrett-current",
      "vanessa",
      "vanessa",
      "charlie-kirk",
      "jpjs-basement",
      "pillow-necrp",
      "the-bong",
      "assault-rifle",
      "white-monster",
      "zubr-beer",
    ],
  },
  {
    slug: "chapter-2-ada-printa",
    name: "Ada Printa",
    description: "The continuation begins with a printer that learned how to swing back.",
    chapter: 2,
    difficulty: "HARD",
    requiredPreviousSlug: "woke-mind-virus",
    position: { x: 8, y: 64 },
    rewardSlug: "ada-printa-chapter-2-reward",
    enemyDeck: [
      "ada-printa-chapter-2-leader",
      "rowletforsenator",
      "frenchplaty",
      "kyu-sugardust",
      "benjamin-netanyahu",
      "white-monster",
      "zubr-beer",
      "florida",
      "the-group-chat",
      "huniepotheads",
    ],
  },
  {
    slug: "chapter-2-eth22",
    name: "eth22",
    description: "A sharper second fight with more pressure and fewer free turns.",
    chapter: 2,
    difficulty: "HARD",
    requiredPreviousSlug: "chapter-2-ada-printa",
    position: { x: 28, y: 40 },
    rewardSlug: "eth22-chapter-2-reward",
    enemyDeck: [
      "eth22-chapter-2-leader",
      "eth22",
      "eth22",
      "charlie-kirk",
      "tyler-robinson",
      "rowletforsenator",
      "assault-rifle",
      "texas",
      "poland",
      "white-monster",
      "vanessa",
    ],
  },
  {
    slug: "chapter-2-mwyi-corrupted",
    name: "mwyi (corrupted)",
    description: "A corrupted wall fight built around huge aura and bad coin-flip energy.",
    chapter: 2,
    difficulty: "BOSS",
    requiredPreviousSlug: "chapter-2-eth22",
    position: { x: 48, y: 68 },
    rewardSlug: "mwyi-corrupted-chapter-2-reward",
    enemyDeck: [
      "mwyi-corrupted-chapter-2-leader",
      "mwyi",
      "mwyi-inactive",
      "white-monster",
      "white-monster",
      "pillow-necrp",
      "huniepotheads",
      "florida",
      "frenchplaty",
      "necrp",
      "zubr-beer",
    ],
  },
  {
    slug: "chapter-2-vanessa",
    name: "Vanessa",
    description: "The late chapter gatekeeper brings American pressure and item spikes.",
    chapter: 2,
    difficulty: "BOSS",
    requiredPreviousSlug: "chapter-2-mwyi-corrupted",
    position: { x: 68, y: 44 },
    rewardSlug: "vanessa-chapter-2-reward",
    enemyDeck: [
      "vanessa-chapter-2-leader",
      "vanessa",
      "vanessa",
      "charlie-kirk",
      "rowletforsenator",
      "tyler-robinson",
      "assault-rifle",
      "the-bong",
      "texas",
      "florida",
      "the-group-chat",
      "white-monster",
    ],
  },
  {
    slug: "chapter-2-woke-mind-virus",
    name: "The Woke Mind Virus (Ascended)",
    description: "The rematch is stronger, cooler, and much less polite.",
    chapter: 2,
    difficulty: "BOSS",
    requiredPreviousSlug: "chapter-2-vanessa",
    position: { x: 92, y: 32 },
    rewardSlug: "woke-mind-virus-deployable",
    boss: true,
    enemyDeck: [
      "woke-mind-virus-ascended-story-leader",
      "pacmanpowerghost-corrupted-story-reward",
      "anarchy-story-reward",
      "buurazu-story-reward",
      "gay-little-puppygirl-story-reward",
      "pillow-necrp",
      "jpjs-basement",
      "poland",
      "texas",
      "vanessa",
      "the-bong",
      "assault-rifle",
      "white-monster",
      "zubr-beer",
    ],
  },
];

export function getStoryEncounter(slug: string) {
  return storyEncounters.find((encounter) => encounter.slug === slug);
}

export function getNextStoryEncounter(slug: string) {
  const index = storyEncounters.findIndex((encounter) => encounter.slug === slug);
  return index >= 0 ? storyEncounters[index + 1] : undefined;
}

export function getStoryStatus(encounter: StoryEncounter, completed: Set<string>): StoryProgressStatus {
  if (completed.has(encounter.slug)) return "COMPLETED";
  if (!encounter.requiredPreviousSlug || completed.has(encounter.requiredPreviousSlug)) return "UNLOCKED";
  return "LOCKED";
}

export function buildStoryEnemyDeck(catalog: CardTemplate[], encounter: StoryEncounter) {
  const bySlug = new Map<string, CardTemplate>();
  for (const card of [...cardCatalog, ...catalog, wokeMindVirusLeader]) {
    bySlug.set(card.slug, card);
  }

  const deck = encounter.enemyDeck.flatMap((slug) => {
    const card = bySlug.get(slug);
    return card ? [card] : [];
  });

  const leader = deck.find((card) => card.cardType === "LEADER") ?? wokeMindVirusLeader;
  const nonLeaders = deck.filter((card) => card.cardType !== "LEADER");
  const fillers = [...nonLeaders, ...cardCatalog.filter((card) => card.cardType !== "LEADER")];
  const finalDeck = [leader, ...nonLeaders];

  let index = 0;
  while (finalDeck.length < 10 && fillers.length > 0) {
    finalDeck.push(fillers[index % fillers.length]);
    index += 1;
  }

  return finalDeck;
}
