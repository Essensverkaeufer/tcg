import type { CardInstance, MatchPlayerState, MatchState, PlayerId } from "@/types/match";

export type HiddenCard = {
  instanceId: string;
  ownerId: PlayerId;
  zone: "HAND" | "DECK";
  hidden: true;
};

export type MatchPlayerView = Omit<MatchPlayerState, "deck" | "hand"> & {
  deck: HiddenCard[];
  hand: Array<CardInstance | HiddenCard>;
  deckCount: number;
  handCount: number;
  isYou: boolean;
};

export type MatchView = Omit<MatchState, "players"> & {
  players: [MatchPlayerView, MatchPlayerView];
  you: PlayerId;
  legalActionPlayerId: PlayerId;
};

export function createMatchView(state: MatchState, viewerId: PlayerId): MatchView {
  return {
    ...state,
    you: viewerId,
    legalActionPlayerId: state.activePlayerId,
    players: state.players.map((player) => createPlayerView(player, viewerId)) as [MatchPlayerView, MatchPlayerView],
  };
}

function createPlayerView(player: MatchPlayerState, viewerId: PlayerId): MatchPlayerView {
  const isYou = player.playerId === viewerId;
  return {
    ...player,
    deckCount: player.deck.length,
    handCount: player.hand.length,
    isYou,
    deck: player.deck.map((card) => hideCard(card, "DECK")),
    hand: isYou ? player.hand : player.hand.map((card) => hideCard(card, "HAND")),
  };
}

function hideCard(card: CardInstance, zone: "HAND" | "DECK"): HiddenCard {
  return {
    instanceId: card.instanceId,
    ownerId: card.ownerId,
    zone,
    hidden: true,
  };
}

export function isHiddenCard(card: CardInstance | HiddenCard): card is HiddenCard {
  return "hidden" in card && card.hidden;
}
