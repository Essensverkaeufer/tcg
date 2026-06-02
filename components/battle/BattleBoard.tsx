"use client";

import clsx from "clsx";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, BookOpen, Heart, RotateCcw, Skull, Sparkles, Timer } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cardCatalog } from "@/lib/game/cards";
import { validateDeck } from "@/lib/game/decks/validateDeck";
import { cardRowToTemplate } from "@/lib/game/mapping";
import { applyAction, createMatchState, getCardCost, getUsedBoardSize, validateAction } from "@/lib/game/match/state";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { AbilityDefinition, CardTemplate, Rarity } from "@/types/cards";
import type { CardInstance, MatchPlayerState, MatchState } from "@/types/match";

type BattleMode = "inspect" | "attack" | "ability" | "item";

type DeckCardRow = {
  quantity: number;
  card_templates: Parameters<typeof cardRowToTemplate>[0] | null;
};

const minimumBoardSlots = [0, 1, 2, 3, 4];
const maxBoardSize = 30;

const rarityGlow: Record<Rarity, string> = {
  COMMON: "border-slate-500 shadow-slate-950/30",
  RARE: "border-sky-400 shadow-sky-500/20",
  EPIC: "border-fuchsia-400 shadow-fuchsia-500/20",
  LEGENDARY: "border-amber-300 shadow-amber-400/25",
  MYTHIC: "border-rose-400 shadow-rose-500/25",
  ULTRA_LEGENDARY: "border-violet-300 shadow-violet-400/30",
};

function demoDeck(catalog: CardTemplate[] = cardCatalog, offset = 0) {
  const leaders = catalog.filter((card) => card.cardType === "LEADER");
  const leader = leaders[offset % Math.max(1, leaders.length)];
  const pool = rotateCards(catalog.filter((card) => card.cardType !== "LEADER"), offset * 5 + 3);
  if (!leader || pool.length === 0) return [];
  const cards = [leader];
  while (cards.length < 30) cards.push(pool[(cards.length - 1) % pool.length]);
  return cards;
}

function buildMatch(playerDeck?: CardTemplate[], fallbackCatalog: CardTemplate[] = cardCatalog) {
  const variant = Math.floor(Math.random() * 1000);
  const firstDeck = playerDeck && isValidBattleDeck(playerDeck) ? playerDeck : demoDeck(fallbackCatalog, variant);
  const secondDeck = demoDeck(fallbackCatalog, variant + 37);
  if (firstDeck.length === 0 || secondDeck.length === 0) return null;
  return createMatchState(
    `local-${Date.now()}`,
    { id: "player-a", name: "You", deck: firstDeck },
    { id: "player-b", name: "Player 2", deck: secondDeck },
  );
}

function rotateCards(cards: CardTemplate[], offset: number) {
  if (cards.length === 0) return [];
  const start = offset % cards.length;
  return [...cards.slice(start), ...cards.slice(0, start)];
}

function isValidBattleDeck(deck?: CardTemplate[]) {
  if (!deck) return false;
  const grouped = new Map<string, { card: CardTemplate; quantity: number }>();
  for (const card of deck) {
    const current = grouped.get(card.slug);
    grouped.set(card.slug, { card, quantity: (current?.quantity ?? 0) + 1 });
  }
  return validateDeck([...grouped.values()]).valid;
}

export function BattleBoard() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { user } = useAuth();
  const [state, setState] = useState<MatchState | null>(() => buildMatch());
  const [selectedId, setSelectedId] = useState("");
  const [mode, setMode] = useState<BattleMode>("inspect");
  const [pendingAbilityId, setPendingAbilityId] = useState("");
  const [notice, setNotice] = useState("Select a card, then choose an action.");
  const [deckSource, setDeckSource] = useState("Demo decks loaded.");
  const [loadedDeck, setLoadedDeck] = useState<CardTemplate[] | undefined>();
  const [onlineCatalog, setOnlineCatalog] = useState<CardTemplate[]>(cardCatalog);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data: cardRows } = await supabase.from("card_templates").select("*");
      const catalog = cardRows?.length ? cardRows.map(cardRowToTemplate) : cardCatalog;
      if (cancelled) return;

      setOnlineCatalog(catalog);

      if (!user) {
        setLoadedDeck(undefined);
        setState(buildMatch(undefined, catalog));
        setDeckSource(cardRows?.length ? "Different demo decks loaded from online card library." : "Different demo decks loaded from local fallback.");
        return;
      }

      const { data, error } = await supabase
        .from("decks")
        .select("id, name, is_active, deck_cards(quantity, card_templates(*))")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setLoadedDeck(undefined);
        setState(buildMatch(undefined, catalog));
        setDeckSource(error ? `Demo decks loaded. Active deck error: ${error.message}` : "Demo decks loaded. No active deck found.");
        return;
      }

      const rows = (data.deck_cards ?? []) as unknown as DeckCardRow[];
      const deck = rows.flatMap((row) => {
        if (!row.card_templates) return [];
        return Array.from({ length: row.quantity }, () => cardRowToTemplate(row.card_templates!));
      });

      if (!isValidBattleDeck(deck)) {
        setLoadedDeck(undefined);
        setState(buildMatch(undefined, catalog));
        setDeckSource("Demo decks loaded. Active deck is not battle legal.");
        return;
      }

      setLoadedDeck(deck);
      setState(buildMatch(deck, catalog));
      setSelectedId("");
      setMode("inspect");
      setPendingAbilityId("");
      setNotice(`Loaded your active deck: ${data.name}.`);
      setDeckSource(`Using active deck: ${data.name}. Player 2 has a generated opponent deck.`);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  const active = state?.players.find((player) => player.playerId === state.activePlayerId);
  const opponent = state?.players.find((player) => player.playerId !== state.activePlayerId);
  const playerOne = state?.players[0];
  const playerTwo = state?.players[1];
  const selected = state && selectedId ? findInstance(state, selectedId) : undefined;
  const selectedOwner = selected ? state?.players.find((player) => player.playerId === selected.ownerId) : undefined;
  const selectedIsActiveCard = Boolean(selected && selected.ownerId === state?.activePlayerId);
  const selectedInHand = Boolean(active?.hand.some((card) => card.instanceId === selectedId));
  const selectedOnBoard = Boolean(active && [active.leader, ...active.board].some((card) => card.instanceId === selectedId));
  const selectedCanPlay = Boolean(state && active && selected && selectedInHand && canPlayFromHand(state, active, selected));
  const selectedCanAttack = Boolean(state && active && opponent && selected && canAttackAnyTarget(state, active, opponent, selected));
  const activatedAbilities = selected?.template.abilityData.filter((ability) => ability.trigger === "ACTIVATED") ?? [];

  function restartBattle() {
    setState(buildMatch(loadedDeck, onlineCatalog));
    setSelectedId("");
    setMode("inspect");
    setPendingAbilityId("");
    setNotice(loadedDeck ? "Battle restarted with a fresh generated opponent deck." : "Battle restarted with fresh demo decks.");
    setDeckSource(loadedDeck ? "Restarted with active deck vs generated opponent." : "Different demo decks loaded.");
  }

  function dispatch(action: Parameters<typeof applyAction>[1]) {
    try {
      const next = state ? applyAction(state, action) : state;
      setState(next);
      setSelectedId("");
      setMode("inspect");
      setPendingAbilityId("");
      setNotice(next?.lastEvent?.message ?? "Action resolved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "That action is not legal.");
    }
  }

  function endTurn() {
    if (!state) return;
    dispatch({ type: "END_TURN", playerId: state.activePlayerId });
  }

  function playSelected() {
    if (!state || !selected || !selectedInHand) return setNotice("Select a card in hand first.");
    if (!active || !canPlayFromHand(state, active, selected)) {
      const cost = getCardCost(selected.template);
      return setNotice(active && active.energyCurrent < cost ? `Not enough energy. Needs ${cost}.` : "That card cannot be played right now.");
    }
    if (selected.template.cardType === "ITEM") {
      setMode("item");
      setNotice("Choose one of your cards or your leader to equip this item.");
      return;
    }
    dispatch({ type: "PLAY_CARD", playerId: state.activePlayerId, cardInstanceId: selected.instanceId });
  }

  function beginAttack() {
    if (!selectedCanAttack || !selected) return setNotice("Select one of your non-leader board cards first.");
    setMode("attack");
    setPendingAbilityId("");
    setNotice("Choose an enemy card or leader to attack.");
  }

  function beginAbility(ability: AbilityDefinition) {
    if (!state || !selected || !selectedOnBoard) return setNotice("Select one of your board cards first.");
    if (selected.activatedThisTurn.includes(ability.id)) return setNotice("That ability was already used this turn.");
    setPendingAbilityId(ability.id);
    if (ability.requiresTarget) {
      setMode("ability");
      setNotice(`Choose a target for ${ability.label}.`);
      return;
    }
    dispatch({ type: "USE_ABILITY", playerId: state.activePlayerId, sourceInstanceId: selected.instanceId, abilityId: ability.id });
  }

  function chooseCard(card: CardInstance) {
    if (!state) return;
    const clickedEnemy = card.ownerId !== state.activePlayerId;
    if (mode === "attack" && selected && clickedEnemy) {
      dispatch({ type: "ATTACK", playerId: state.activePlayerId, attackerInstanceId: selected.instanceId, targetInstanceId: card.instanceId });
      return;
    }
    if (mode === "ability" && selected && pendingAbilityId) {
      dispatch({ type: "USE_ABILITY", playerId: state.activePlayerId, sourceInstanceId: selected.instanceId, abilityId: pendingAbilityId, targetInstanceId: card.instanceId });
      return;
    }
    if (mode === "item" && selected && card.ownerId === state.activePlayerId) {
      dispatch({ type: "PLAY_CARD", playerId: state.activePlayerId, cardInstanceId: selected.instanceId, targetInstanceId: card.instanceId });
      return;
    }
    setSelectedId(card.instanceId);
    setMode("inspect");
    setPendingAbilityId("");
    setNotice(`${card.template.name} selected.`);
  }

  if (!state || !active || !opponent || !playerOne || !playerTwo) {
    return (
      <section className="grid min-h-96 place-items-center rounded-lg border border-dashed border-slate-700 bg-slate-950 p-4 text-center text-white">
        <div>
          <h2 className="text-lg font-black">Battle needs cards</h2>
          <p className="mt-2 text-sm text-slate-400">Add at least one leader and a few playable cards.</p>
        </div>
      </section>
    );
  }
  const winner = state.winnerId ? state.players.find((player) => player.playerId === state.winnerId) : undefined;

  return (
    <section className="battle-arena -mx-4 -my-8 min-h-[calc(100vh-80px)] overflow-hidden bg-slate-950 text-white sm:-mx-6">
      <div className="relative min-h-[calc(100vh-80px)] bg-[radial-gradient(circle_at_center,#39152f_0%,#111827_48%,#030712_100%)] px-4 py-4">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(244,63,94,.22),transparent_30%,rgba(59,130,246,.14)_65%,transparent)]" aria-hidden />
        <div className="relative z-10 grid min-h-[calc(100vh-112px)] gap-4 xl:grid-cols-[280px_1fr_260px]">
          <InfoPanel selected={selected} ownerName={selectedOwner?.displayName} currentTurn={state.turn} />

          <main className="grid min-h-0 grid-rows-[auto_1fr_auto] gap-3">
            <TopStrip player={playerTwo} handFaceUp={state.activePlayerId === playerTwo.playerId} selectedId={selectedId} currentTurn={state.turn} onChoose={chooseCard} />
            <BoardRow player={playerTwo} selectedId={selectedId} currentTurn={state.turn} onChoose={chooseCard} />

            <section className="grid place-items-center">
              <div className="w-full max-w-2xl rounded-lg border border-rose-500/40 bg-black/45 px-5 py-4 text-center shadow-2xl shadow-rose-950/40">
                <div className="text-2xl font-black uppercase">{state.phase === "FINISHED" ? `${winner?.displayName ?? "Nobody"} Wins` : `${active.displayName}'s Turn`}</div>
                <div className="mt-1 text-sm font-bold text-slate-300">Turn {state.turn}</div>
                <div className="mt-3 min-h-6 text-sm font-semibold text-amber-100">
                  {state.phase === "FINISHED" ? (state.draw ? "Game over. Both leaders fell." : `Game over. ${winner?.displayName ?? "A player"} killed the enemy leader.`) : notice}
                </div>
                {state.phase === "FINISHED" ? (
                  <button type="button" onClick={restartBattle} className="mt-4 rounded-md bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">
                    Restart Battle
                  </button>
                ) : null}
              </div>
            </section>

            <BoardRow player={playerOne} selectedId={selectedId} currentTurn={state.turn} onChoose={chooseCard} />
            <section className="flex items-center justify-between gap-3">
              <PlayerBadge player={playerOne} selected={selectedId === playerOne.leader.instanceId} currentTurn={state.turn} onChoose={chooseCard} />
              <div className="hidden text-right text-xs font-bold uppercase tracking-widest text-slate-400 sm:block">
                {state.activePlayerId === playerOne.playerId ? "Your hand" : "Waiting for Player 2"}
              </div>
            </section>
            <HandRow player={playerOne} faceUp={state.activePlayerId === playerOne.playerId} selectedId={selectedId} currentTurn={state.turn} onChoose={chooseCard} />
          </main>

          <ControlPanel
            state={state}
            active={active}
            opponent={opponent}
            playerOne={playerOne}
            playerTwo={playerTwo}
            selected={selected}
            selectedIsActiveCard={selectedIsActiveCard}
            selectedInHand={selectedInHand}
            selectedOnBoard={selectedOnBoard}
            selectedCanPlay={selectedCanPlay}
            selectedCanAttack={selectedCanAttack}
            activatedAbilities={activatedAbilities}
            mode={mode}
            deckSource={deckSource}
            onPlay={playSelected}
            onAttack={beginAttack}
            onAbility={beginAbility}
            onCancel={() => {
              setMode("inspect");
              setPendingAbilityId("");
              setNotice("Action cancelled.");
            }}
            onEndTurn={endTurn}
            onRestart={restartBattle}
          />
        </div>
      </div>
    </section>
  );
}

function InfoPanel({ selected, ownerName, currentTurn }: { selected?: CardInstance; ownerName?: string; currentTurn: number }) {
  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Selected Card</h2>
        {selected ? (
          <div className="mt-4">
            <BattleCard card={selected} size="large" currentTurn={currentTurn} />
            <div className="mt-4 text-sm">
              <div className="font-black">{ownerName}</div>
              <p className="mt-2 text-slate-300">{selected.template.description || "No description yet."}</p>
              <div className="mt-3 space-y-2">
                {selected.template.abilityData.length ? selected.template.abilityData.map((ability) => (
                  <div key={ability.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                    <div className="font-black text-amber-200">{ability.label}</div>
                    <div className="text-xs uppercase text-slate-400">{ability.trigger}</div>
                    <div className="mt-1 text-xs text-slate-300">{ability.effects.map((effect) => `${effect.type} ${effect.amount ?? ""} ${effect.target}`).join(", ")}</div>
                  </div>
                )) : <div className="text-slate-500">No abilities.</div>}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">Select a card to inspect stats and abilities.</p>
        )}
      </section>
    </aside>
  );
}

function TopStrip({ player, handFaceUp, selectedId, currentTurn, onChoose }: { player: MatchPlayerState; handFaceUp: boolean; selectedId: string; currentTurn: number; onChoose: (card: CardInstance) => void }) {
  return (
    <section className="flex items-start justify-between gap-4 overflow-hidden">
      <PlayerBadge player={player} selected={selectedId === player.leader.instanceId} currentTurn={currentTurn} onChoose={onChoose} />
      <div className="min-w-0 flex-1">
        <HandRow player={player} faceUp={handFaceUp} selectedId={selectedId} currentTurn={currentTurn} compact onChoose={onChoose} />
      </div>
    </section>
  );
}

function BoardRow({ player, selectedId, currentTurn, onChoose }: { player: MatchPlayerState; selectedId: string; currentTurn: number; onChoose: (card: CardInstance) => void }) {
  const emptySlots = Math.max(0, minimumBoardSlots.length - player.board.length);
  const usedSize = getUsedBoardSize(player);
  return (
    <section className="rounded-lg border border-white/10 bg-black/25 p-3 shadow-inner">
      <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400">
        <span>{player.displayName} Board</span>
        <span>Size {usedSize}/{maxBoardSize}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {player.board.map((card) => (
          <button key={card.instanceId} type="button" onClick={() => onChoose(card)} className="text-left">
            <BattleCard card={card} selected={selectedId === card.instanceId} currentTurn={currentTurn} />
          </button>
        ))}
        {Array.from({ length: emptySlots }).map((_, slot) => (
          <div key={slot} className="grid min-h-44 place-items-center rounded-lg border border-dashed border-white/10 bg-white/5 text-xs font-black uppercase tracking-widest text-white/20">
            Empty
          </div>
        ))}
      </div>
    </section>
  );
}

function HandRow({ player, faceUp, selectedId, currentTurn, compact, onChoose }: { player: MatchPlayerState; faceUp: boolean; selectedId: string; currentTurn: number; compact?: boolean; onChoose: (card: CardInstance) => void }) {
  const cards = player.hand;
  return (
    <section className={clsx("flex gap-3 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3", compact ? "min-h-36" : "min-h-52")}>
      {cards.length ? cards.map((card, index) => faceUp ? (
        <button key={card.instanceId} type="button" onClick={() => onChoose(card)} className="w-36 shrink-0 text-left transition hover:-translate-y-2">
          <BattleCard card={card} selected={selectedId === card.instanceId} currentTurn={currentTurn} />
        </button>
      ) : <CardBack key={`${player.playerId}-back-${index}`} />) : <div className="grid flex-1 place-items-center text-sm font-bold text-slate-500">No cards in hand</div>}
    </section>
  );
}

function ControlPanel({
  state,
  active,
  opponent,
  playerOne,
  playerTwo,
  selected,
  selectedIsActiveCard,
  selectedInHand,
  selectedOnBoard,
  selectedCanPlay,
  selectedCanAttack,
  activatedAbilities,
  mode,
  deckSource,
  onPlay,
  onAttack,
  onAbility,
  onCancel,
  onEndTurn,
  onRestart,
}: {
  state: MatchState;
  active: MatchPlayerState;
  opponent: MatchPlayerState;
  playerOne: MatchPlayerState;
  playerTwo: MatchPlayerState;
  selected?: CardInstance;
  selectedIsActiveCard: boolean;
  selectedInHand: boolean;
  selectedOnBoard: boolean;
  selectedCanPlay: boolean;
  selectedCanAttack: boolean;
  activatedAbilities: AbilityDefinition[];
  mode: BattleMode;
  deckSource: string;
  onPlay: () => void;
  onAttack: () => void;
  onAbility: (ability: AbilityDefinition) => void;
  onCancel: () => void;
  onEndTurn: () => void;
  onRestart: () => void;
}) {
  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-white/10 bg-black/45 p-4 backdrop-blur">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Player 2</h2>
        <Counter label="Energy" value={playerTwo.energyCurrent} suffix={`/${playerTwo.energyMax}`} icon={<Sparkles className="h-4 w-4" />} />
        <Counter label="Board Size" value={getUsedBoardSize(playerTwo)} suffix={`/${maxBoardSize}`} icon={<Activity className="h-4 w-4" />} />
        <Counter label="Deck" value={playerTwo.deck.length} icon={<BookOpen className="h-4 w-4" />} />
        <Counter label="Hand" value={playerTwo.hand.length} icon={<Activity className="h-4 w-4" />} />
        <Counter label="Graveyard" value={playerTwo.graveyard.length} icon={<Skull className="h-4 w-4" />} />
      </section>

      <section className="rounded-lg border border-white/10 bg-black/45 p-4 backdrop-blur">
        <button type="button" onClick={onEndTurn} disabled={state.phase === "FINISHED"} className="w-full rounded-lg border border-fuchsia-400 bg-fuchsia-500/20 px-5 py-4 text-lg font-black text-white shadow-lg shadow-fuchsia-500/20 disabled:opacity-40">
          End Turn
        </button>
        <div className="mt-5 grid place-items-center">
          <div className="grid h-24 w-24 place-items-center rounded-full border-8 border-fuchsia-500/70 bg-black text-2xl font-black shadow-lg shadow-fuchsia-500/30">
            <Timer className="h-7 w-7" />
          </div>
          <div className="mt-2 text-xs font-black uppercase text-slate-400">Visual Timer</div>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-black/45 p-4 backdrop-blur">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Actions</h2>
        <div className="mt-3 grid gap-2">
          <button type="button" onClick={onPlay} disabled={!selectedCanPlay || state.phase === "FINISHED"} className="rounded-md bg-amber-300 px-3 py-2 text-sm font-black text-slate-950 disabled:opacity-40">
            {selected?.template.cardType === "ITEM" ? "Equip Item" : "Play"}{selectedInHand && selected ? ` (${getCardCost(selected.template)}E)` : ""}
          </button>
          <button type="button" onClick={onAttack} disabled={!selectedCanAttack || state.phase === "FINISHED"} className="rounded-md bg-rose-500 px-3 py-2 text-sm font-black text-white disabled:opacity-40">Attack</button>
          {activatedAbilities.length ? activatedAbilities.map((ability) => (
            <button
              key={ability.id}
              type="button"
              onClick={() => onAbility(ability)}
              disabled={!selectedIsActiveCard || !selectedOnBoard || selected?.activatedThisTurn.includes(ability.id) || (selected?.stunnedUntilTurn ?? 0) >= state.turn || state.phase === "FINISHED"}
              className="rounded-md bg-violet-500 px-3 py-2 text-sm font-black text-white disabled:opacity-40"
            >
              Use {ability.label}
            </button>
          )) : <button type="button" disabled className="rounded-md bg-white/10 px-3 py-2 text-sm font-black text-white/40">No Ability</button>}
          <button type="button" onClick={onCancel} disabled={mode === "inspect"} className="rounded-md border border-white/15 px-3 py-2 text-sm font-black text-white disabled:opacity-40">Cancel</button>
          <button type="button" onClick={onRestart} className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-black text-white">
            <RotateCcw className="h-4 w-4" />
            Restart Battle
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-black/45 p-4 text-sm backdrop-blur">
        <h2 className="font-black uppercase tracking-widest text-slate-400">You</h2>
        <Counter label="Energy" value={playerOne.energyCurrent} suffix={`/${playerOne.energyMax}`} icon={<Sparkles className="h-4 w-4" />} />
        <Counter label="Board Size" value={getUsedBoardSize(playerOne)} suffix={`/${maxBoardSize}`} icon={<Activity className="h-4 w-4" />} />
        <Counter label="Deck" value={playerOne.deck.length} icon={<BookOpen className="h-4 w-4" />} />
        <Counter label="Hand" value={playerOne.hand.length} icon={<Activity className="h-4 w-4" />} />
        <Counter label="Graveyard" value={playerOne.graveyard.length} icon={<Skull className="h-4 w-4" />} />
        <div className="mt-3 rounded-md bg-white/5 px-3 py-2 text-xs font-black uppercase text-amber-200">Active: {active.displayName}</div>
        <div className="mt-2 rounded-md bg-white/5 px-3 py-2 text-xs text-slate-300">Enemy this turn: {opponent.displayName}</div>
        <div className="mt-3 text-xs text-slate-400">{deckSource}</div>
        <div className="mt-3 max-h-28 space-y-1 overflow-y-auto text-xs text-slate-300">
          {state.messages.map((message, index) => <div key={`${message}-${index}`} className="rounded bg-white/5 px-2 py-1">{message}</div>)}
        </div>
      </section>
    </aside>
  );
}

function PlayerBadge({ player, selected, currentTurn, onChoose }: { player: MatchPlayerState; selected: boolean; currentTurn: number; onChoose: (card: CardInstance) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/45 p-3 shadow-xl backdrop-blur">
      <button type="button" onClick={() => onChoose(player.leader)} className="text-left">
        <BattleCard card={player.leader} selected={selected} currentTurn={currentTurn} size="badge" />
      </button>
      <div>
        <div className="text-lg font-black">{player.displayName}</div>
        <div className="mt-2 flex items-center gap-2 text-sm font-bold text-rose-200">
          <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
          {Math.max(0, player.leader.currentHealth)}
        </div>
        <div className="mt-1 text-xs text-slate-400">Leader: {player.leader.template.name}</div>
      </div>
    </div>
  );
}

function BattleCard({ card, selected, currentTurn, size = "normal" }: { card: CardInstance; selected?: boolean; currentTurn: number; size?: "normal" | "large" | "badge" }) {
  const isLarge = size === "large";
  const isBadge = size === "badge";
  const stunned = (card.stunnedUntilTurn ?? 0) >= currentTurn;
  const blinded = (card.blindedUntilTurn ?? 0) >= currentTurn;
  const disabled = card.exhausted || stunned || blinded;
  return (
    <article
      className={clsx(
        "battle-card relative overflow-hidden rounded-lg border-2 bg-slate-950 shadow-xl transition",
        rarityGlow[card.template.rarity],
        selected && "ring-2 ring-amber-300",
        disabled && "opacity-75",
        isLarge ? "min-h-80" : isBadge ? "h-24 w-20" : "min-h-44",
      )}
    >
      <div className="absolute left-1 top-1 z-10 grid h-7 w-7 place-items-center rounded-full border border-amber-200 bg-slate-950 text-xs font-black text-amber-100">A{card.currentAura}</div>
      {card.template.imageUrl && !card.template.imageUrl.startsWith("/card-art/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.template.imageUrl} alt={card.template.name} className={clsx("h-28 w-full object-cover", isLarge && "h-48", isBadge && "h-full")} />
      ) : (
        <div className={clsx("grid h-28 place-items-center bg-white/10 text-center text-xs font-black uppercase text-slate-400", isLarge && "h-48", isBadge && "h-full")}>{card.template.name}</div>
      )}
      {!isBadge ? (
        <div className="p-2">
          <div className="truncate text-sm font-black">{card.template.name}</div>
          <div className="text-[10px] font-black uppercase text-slate-400">{card.template.rarity} {card.template.cardType}</div>
          <div className="mt-2 grid grid-cols-4 gap-1 text-center text-xs font-black">
            <span className="rounded bg-orange-500/80 py-1">{card.currentAttack}</span>
            <span className="rounded bg-rose-600/80 py-1">{Math.max(0, card.currentHealth)}</span>
            <span className="rounded bg-slate-700 py-1">{card.currentSize}</span>
            <span className="rounded bg-violet-600/80 py-1">E{getCardCost(card.template)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-black uppercase text-white/75">
            {card.exhausted ? <span className="rounded bg-white/10 px-1">Exhausted</span> : null}
            {card.shielded ? <span className="rounded bg-cyan-500/30 px-1">Shield</span> : null}
            {stunned ? <span className="rounded bg-yellow-500/30 px-1">Stun</span> : null}
            {blinded ? <span className="rounded bg-violet-500/30 px-1">Blind</span> : null}
            {card.attachedItems.length ? <span className="rounded bg-emerald-500/30 px-1">Items {card.attachedItems.length}</span> : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function CardBack() {
  return (
    <div className="grid h-28 w-20 place-items-center rounded-lg border border-rose-400/40 bg-slate-950 shadow-lg shadow-rose-500/20">
      <Sparkles className="h-6 w-6 text-rose-300" />
    </div>
  );
}

function Counter({ label, value, icon, suffix = "" }: { label: string; value: number; icon: ReactNode; suffix?: string }) {
  return (
    <div className="mt-3 flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm">
      <span className="inline-flex items-center gap-2 text-slate-300">{icon}{label}</span>
      <span className="font-black">{value}{suffix}</span>
    </div>
  );
}

function findInstance(state: MatchState, instanceId: string) {
  for (const player of state.players) {
    const card = [player.leader, ...player.deck, ...player.hand, ...player.board, ...player.graveyard].find((entry) => entry.instanceId === instanceId);
    if (card) return card;
  }
}

function canPlayFromHand(state: MatchState, player: MatchPlayerState, card: CardInstance) {
  if (card.template.cardType === "ITEM") {
    return player.hand.some((entry) => entry.instanceId === card.instanceId) && player.energyCurrent >= getCardCost(card.template);
  }
  return validateAction(state, { type: "PLAY_CARD", playerId: player.playerId, cardInstanceId: card.instanceId }).ok;
}

function canAttackAnyTarget(state: MatchState, player: MatchPlayerState, opponent: MatchPlayerState, card: CardInstance) {
  if (!player.board.some((entry) => entry.instanceId === card.instanceId)) return false;
  return [opponent.leader, ...opponent.board].some((target) => validateAction(state, {
    type: "ATTACK",
    playerId: player.playerId,
    attackerInstanceId: card.instanceId,
    targetInstanceId: target.instanceId,
  }).ok);
}
