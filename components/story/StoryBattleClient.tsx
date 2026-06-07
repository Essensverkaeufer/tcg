"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSiteAudio } from "@/components/audio/SiteAudioProvider";
import { getAbilityConditionError, getAbilityCooldownRemaining } from "@/lib/game/abilities/engine";
import { resolveCardImageUrl } from "@/lib/game/card-images";
import { applyAction, ATTACK_ENERGY_COST, createMatchState, getCardCost, validateAction } from "@/lib/game/match/state";
import { getNextStoryEncounter, getStoryEncounter, buildStoryEnemyDeck } from "@/lib/game/story/config";
import { chooseBotAction } from "@/lib/game/story/bot";
import type { AbilityDefinition, CardTemplate } from "@/types/cards";
import type { CardInstance, MatchAction, MatchPlayerState, MatchState } from "@/types/match";

type TargetMode = "inspect" | "attack" | "ability" | "item";

export function StoryBattleClient({ encounterSlug }: { encounterSlug: string }) {
  const encounter = useMemo(() => getStoryEncounter(encounterSlug), [encounterSlug]);
  const { user } = useAuth();
  const { playTurnCue } = useSiteAudio();
  const reportedMatchId = useRef("");
  const previousActivePlayer = useRef("");
  const [state, setState] = useState<MatchState | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [targetMode, setTargetMode] = useState<TargetMode>("inspect");
  const [pendingAbilityId, setPendingAbilityId] = useState("");
  const [message, setMessage] = useState("Loading story battle...");
  const [blocked, setBlocked] = useState("");
  const [completionSaved, setCompletionSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!encounter || !user) return;

      setMessage("Checking story progress and loading decks...");
      const progressResponse = await fetch("/api/story/progress", { cache: "no-store" });
      const progressPayload = await progressResponse.json();
      if (cancelled) return;
      if (!progressResponse.ok) {
        setBlocked(progressPayload.error ?? "Could not load story progress.");
        return;
      }

      const progressEncounter = progressPayload.encounters?.find((entry: { slug: string }) => entry.slug === encounter.slug);
      if (!progressEncounter || progressEncounter.status === "LOCKED") {
        setBlocked("This story fight is still locked. Clear the previous fight first.");
        return;
      }

      const deckResponse = await fetch("/api/story/active-deck", { cache: "no-store" });
      const deckPayload = await deckResponse.json();
      if (cancelled) return;

      if (!deckResponse.ok) {
        setBlocked(deckPayload.error ?? "Could not load your active deck.");
        return;
      }

      const catalog = (deckPayload.catalog ?? []) as CardTemplate[];
      const playerDeck = (deckPayload.deck?.cards ?? []) as CardTemplate[];

      const enemyDeck = buildStoryEnemyDeck(catalog, encounter);
      const matchId = `story-${encounter.slug}-${Date.now()}`;
      const nextState = createMatchState(
        matchId,
        { id: "story-player", name: "You", deck: playerDeck },
        { id: "story-bot", name: encounter.name, deck: enemyDeck },
        { seed: matchId },
      );

      setState(nextState);
      setMessage(`Loaded ${deckPayload.deck.name} vs ${encounter.name}.`);
      setBlocked("");
      setSelectedId("");
      setTargetMode("inspect");
      setPendingAbilityId("");
      setCompletionSaved(false);
      reportedMatchId.current = "";
    })();

    return () => {
      cancelled = true;
    };
  }, [encounter, user]);

  useEffect(() => {
    if (!state || state.phase === "FINISHED") return;
    const previous = previousActivePlayer.current;
    if (previous && previous !== state.activePlayerId && state.activePlayerId === "story-player") {
      playTurnCue();
    }
    previousActivePlayer.current = state.activePlayerId;
  }, [playTurnCue, state]);

  useEffect(() => {
    if (!state || !encounter || state.phase === "FINISHED" || state.activePlayerId !== "story-bot") return;
    const timer = window.setTimeout(() => {
      setState((current) => {
        if (!current || current.phase === "FINISHED" || current.activePlayerId !== "story-bot") return current;
        try {
          const action = chooseBotAction(current, "story-bot", encounter.difficulty);
          const next = applyAction(current, action);
          setMessage(next.lastEvent?.message ?? "Enemy acted.");
          return next;
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Enemy action failed, ending turn.");
          return applyAction(current, { type: "END_TURN", playerId: "story-bot" });
        }
      });
    }, 650);

    return () => window.clearTimeout(timer);
  }, [encounter, state]);

  useEffect(() => {
    if (!state || !encounter || state.phase !== "FINISHED" || reportedMatchId.current === state.id) return;
    reportedMatchId.current = state.id;
    const result = state.winnerId === "story-player" ? "WIN" : "LOSS";
    void (async () => {
      const response = await fetch("/api/story/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encounterSlug: encounter.slug, result, turns: state.turn }),
      });
      setCompletionSaved(response.ok);
    })();
  }, [encounter, state]);

  const you = state?.players.find((player) => player.playerId === "story-player");
  const bot = state?.players.find((player) => player.playerId === "story-bot");
  const selected = state && selectedId ? findCard(state, selectedId) : undefined;
  const selectedOwner = selected ? state?.players.find((player) => player.playerId === selected.ownerId) : undefined;
  const isPlayerTurn = state?.activePlayerId === "story-player" && state.phase !== "FINISHED";
  const selectedInHand = Boolean(you?.hand.some((card) => card.instanceId === selectedId));
  const selectedOnPlayerBoard = Boolean(you && selected && [you.leader, ...you.board].some((card) => card.instanceId === selected.instanceId));
  const selectedAbilities = selected?.template.abilityData.filter((ability) => ability.trigger === "ACTIVATED") ?? [];
  const nextEncounter = encounter ? getNextStoryEncounter(encounter.slug) : undefined;

  function dispatch(action: MatchAction) {
    if (!state || !isPlayerTurn) return;
    try {
      const next = applyAction(state, action);
      setState(next);
      setSelectedId("");
      setTargetMode("inspect");
      setPendingAbilityId("");
      setMessage(next.lastEvent?.message ?? "Action resolved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That action is not legal.");
    }
  }

  function choose(card: CardInstance) {
    if (!state || !you || !isPlayerTurn) {
      setSelectedId(card.instanceId);
      return;
    }
    if (targetMode === "attack" && selected && card.ownerId === "story-bot") {
      dispatch({ type: "ATTACK", playerId: "story-player", attackerInstanceId: selected.instanceId, targetInstanceId: card.instanceId });
      return;
    }
    if (targetMode === "ability" && selected && pendingAbilityId) {
      dispatch({ type: "USE_ABILITY", playerId: "story-player", sourceInstanceId: selected.instanceId, abilityId: pendingAbilityId, targetInstanceId: card.instanceId });
      return;
    }
    if (targetMode === "item" && selected && card.ownerId === "story-player") {
      dispatch({ type: "PLAY_CARD", playerId: "story-player", cardInstanceId: selected.instanceId, targetInstanceId: card.instanceId });
      return;
    }
    setSelectedId(card.instanceId);
    setTargetMode("inspect");
    setPendingAbilityId("");
    setMessage(`${card.template.name} selected.`);
  }

  function playSelected() {
    if (!state || !selected || !selectedInHand) return;
    if (selected.template.cardType === "ITEM") {
      setTargetMode("item");
      setMessage("Choose your leader or one of your board cards to equip this item.");
      return;
    }
    dispatch({ type: "PLAY_CARD", playerId: "story-player", cardInstanceId: selected.instanceId });
  }

  function beginAttack() {
    if (!selected || !state || !bot) return;
    setTargetMode("attack");
    setPendingAbilityId("");
    setMessage("Choose an enemy target.");
  }

  function beginAbility(ability: AbilityDefinition) {
    if (!state || !selected) return;
    const conditionError = getAbilityConditionError(state, ability, "story-player");
    if (conditionError) {
      setMessage(conditionError);
      return;
    }
    if (ability.requiresTarget) {
      setPendingAbilityId(ability.id);
      setTargetMode("ability");
      setMessage(`Choose a target for ${ability.label}.`);
      return;
    }
    dispatch({ type: "USE_ABILITY", playerId: "story-player", sourceInstanceId: selected.instanceId, abilityId: ability.id });
  }

  function restart() {
    window.location.reload();
  }

  if (!encounter) {
    return <StoryBlocked title="Unknown story fight" message="That encounter does not exist." />;
  }

  if (blocked) {
    return <StoryBlocked title={encounter.name} message={blocked} />;
  }

  if (!state || !you || !bot) {
    return (
      <AuthGate>
        <main className="grid min-h-[calc(100vh-78px)] place-items-center bg-slate-950 p-6 text-white">
          <div className="rounded-lg border border-white/10 bg-black/40 p-6 text-sm font-black">{message}</div>
        </main>
      </AuthGate>
    );
  }

  const playerWon = state.phase === "FINISHED" && state.winnerId === "story-player";

  return (
    <AuthGate>
      <main className="min-h-[calc(100vh-78px)] bg-slate-950 text-white">
        <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-lg border border-white/10 bg-black/35 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-rose-300">Story Battle</p>
                <h1 className="mt-1 text-3xl font-black">{encounter.name}</h1>
                <p className="mt-1 text-sm font-bold text-slate-400">{encounter.description}</p>
              </div>
              <Link href="/story" className="rounded-md border border-white/15 px-4 py-2 text-sm font-black hover:bg-white/10">Back to Map</Link>
            </div>
          </section>

          <aside className="rounded-lg border border-white/10 bg-black/35 p-4 xl:row-span-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Controls</h2>
            <div className="mt-3 grid gap-2">
              <button type="button" onClick={playSelected} disabled={!isPlayerTurn || !selectedInHand} className="rounded-md bg-amber-300 px-3 py-2 text-sm font-black text-slate-950 disabled:opacity-40">
                Play{selectedInHand && selected ? ` (${getCardCost(selected.template)}E)` : ""}
              </button>
              <button type="button" onClick={beginAttack} disabled={!selected || !selectedOnPlayerBoard || !canAnyAttack(state, selected, bot)} className="rounded-md bg-rose-500 px-3 py-2 text-sm font-black disabled:opacity-40">
                Attack ({ATTACK_ENERGY_COST}E)
              </button>
              {selectedAbilities.length ? selectedAbilities.map((ability) => {
                const cooldown = selected ? getAbilityCooldownRemaining(selected, ability.id, selectedOwner?.turnsStarted ?? 0) : 0;
                return (
                  <button key={ability.id} type="button" onClick={() => beginAbility(ability)} disabled={!isPlayerTurn || !selectedOnPlayerBoard || cooldown > 0} className="rounded-md bg-violet-500 px-3 py-2 text-sm font-black disabled:opacity-40">
                    Use {ability.label}{cooldown > 0 ? ` (CD ${cooldown})` : ""}
                  </button>
                );
              }) : <button type="button" disabled className="rounded-md bg-white/10 px-3 py-2 text-sm font-black text-white/40">No Ability</button>}
              <button type="button" onClick={() => dispatch({ type: "END_TURN", playerId: "story-player" })} disabled={!isPlayerTurn} className="rounded-md border border-fuchsia-400 px-3 py-2 text-sm font-black disabled:opacity-40">End Turn</button>
              <button type="button" onClick={() => { setTargetMode("inspect"); setPendingAbilityId(""); }} disabled={targetMode === "inspect"} className="rounded-md border border-white/20 px-3 py-2 text-sm font-black disabled:opacity-40">Cancel Target</button>
              <button type="button" onClick={restart} className="rounded-md border border-white/20 px-3 py-2 text-sm font-black">Restart</button>
            </div>
            <div className="mt-5 rounded-md bg-white/5 p-3 text-sm font-bold text-slate-300">
              <div>Turn {state.turn}</div>
              <div className="mt-1">Active: {state.activePlayerId === "story-player" ? "You" : encounter.name}</div>
              <div className="mt-3 text-amber-100">{message}</div>
            </div>
            {selected ? (
              <div className="mt-4 rounded-md bg-white/5 p-3 text-sm">
                <div className="font-black">{selected.template.name}</div>
                <div className="text-xs uppercase text-slate-400">{selected.template.rarity} {selected.template.cardType}</div>
                <p className="mt-2 text-slate-300">{selected.template.description || "No description yet."}</p>
              </div>
            ) : null}
          </aside>

          <section className="grid gap-4">
            <PlayerZone title={encounter.name} player={bot} selectedId={selectedId} currentTurn={state.turn} hideHand active={state.activePlayerId === "story-bot"} onChoose={choose} />
            <div className="rounded-lg border border-fuchsia-500/30 bg-black/45 p-4 text-center shadow-xl shadow-fuchsia-950/30">
              <div className="text-2xl font-black">{state.phase === "FINISHED" ? playerWon ? "Victory" : "Defeat" : state.activePlayerId === "story-player" ? "Your Turn" : "Enemy Turn"}</div>
              <div className="mt-2 text-sm font-bold text-amber-100">{state.lastEvent?.message ?? message}</div>
              {state.phase === "FINISHED" ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="rounded-md bg-white/10 px-3 py-2 text-xs font-black">{completionSaved ? "Progress saved" : "Saving progress..."}</span>
                  {playerWon && nextEncounter ? <Link href={`/story/${nextEncounter.slug}`} className="rounded-md bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950">Next Encounter</Link> : null}
                  <button type="button" onClick={restart} className="rounded-md border border-white/20 px-3 py-2 text-xs font-black">Retry</button>
                </div>
              ) : null}
            </div>
            <PlayerZone title="You" player={you} selectedId={selectedId} currentTurn={state.turn} active={state.activePlayerId === "story-player"} onChoose={choose} />
          </section>
        </div>
      </main>
    </AuthGate>
  );
}

function StoryBlocked({ title, message }: { title: string; message: string }) {
  return (
    <AuthGate>
      <main className="grid min-h-[calc(100vh-78px)] place-items-center bg-slate-950 p-6 text-white">
        <section className="max-w-lg rounded-lg border border-white/10 bg-black/40 p-8 text-center">
          <h1 className="text-2xl font-black">{title}</h1>
          <p className="mt-3 text-sm font-bold text-slate-300">{message}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/story" className="rounded-md bg-rose-500 px-4 py-2 text-sm font-black">Story Map</Link>
            <Link href="/decks" className="rounded-md border border-white/15 px-4 py-2 text-sm font-black">Deck Builder</Link>
          </div>
        </section>
      </main>
    </AuthGate>
  );
}

function PlayerZone({ title, player, selectedId, currentTurn, active, hideHand, onChoose }: { title: string; player: MatchPlayerState; selectedId: string; currentTurn: number; active: boolean; hideHand?: boolean; onChoose: (card: CardInstance) => void }) {
  return (
    <section className={clsx("rounded-lg border bg-black/35 p-3", active ? "border-amber-300/70" : "border-white/10")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">{title}</h2>
          <p className="text-xs font-bold text-slate-400">Energy {player.energyCurrent}/{player.energyMax} | Deck {player.deck.length} | Hand {player.hand.length} | Graveyard {player.graveyard.length}</p>
        </div>
        <button type="button" onClick={() => onChoose(player.leader)} className="text-left">
          <MiniCard card={player.leader} selected={selectedId === player.leader.instanceId} currentTurn={currentTurn} leader />
        </button>
      </div>
      <div className="grid gap-2 md:grid-cols-5">
        {player.board.map((card) => (
          <button key={card.instanceId} type="button" onClick={() => onChoose(card)} className="text-left">
            <MiniCard card={card} selected={selectedId === card.instanceId} currentTurn={currentTurn} />
          </button>
        ))}
        {Array.from({ length: Math.max(0, 5 - player.board.length) }).map((_, index) => (
          <div key={index} className="grid min-h-32 place-items-center rounded-lg border border-dashed border-white/10 text-xs font-black uppercase text-white/20">Empty</div>
        ))}
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3">
        {player.hand.map((card) => hideHand ? <CardBack key={card.instanceId} /> : (
          <button key={card.instanceId} type="button" onClick={() => onChoose(card)} className="w-32 shrink-0 text-left">
            <MiniCard card={card} selected={selectedId === card.instanceId} currentTurn={currentTurn} hand />
          </button>
        ))}
      </div>
    </section>
  );
}

function MiniCard({ card, selected, currentTurn, hand, leader }: { card: CardInstance; selected: boolean; currentTurn: number; hand?: boolean; leader?: boolean }) {
  const imageUrl = resolveCardImageUrl(card.template.imageUrl);
  const stunned = (card.stunnedUntilTurn ?? 0) >= currentTurn;
  const blinded = (card.blindedUntilTurn ?? 0) >= currentTurn;
  return (
    <article className={clsx("overflow-hidden rounded-lg border-2 bg-slate-950 shadow-xl", selected ? "border-amber-300 ring-2 ring-amber-100" : "border-white/15", hand ? "min-h-44" : "min-h-36")}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className={clsx("w-full object-cover", hand || leader ? "h-24" : "h-20")} />
      ) : <div className={clsx("grid place-items-center bg-white/10 p-2 text-center text-xs font-black uppercase text-slate-400", hand || leader ? "h-24" : "h-20")}>{card.template.name}</div>}
      <div className="p-2">
        <div className="truncate text-xs font-black">{card.template.name}</div>
        <div className="text-[10px] font-black uppercase text-slate-500">{leader ? "Leader" : card.template.cardType}</div>
        <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px] font-black">
          <span className="rounded bg-orange-500/80 py-1">{card.currentAttack}</span>
          <span className="rounded bg-rose-600/80 py-1">{Math.max(0, card.currentHealth)}</span>
          <span className="rounded bg-slate-700 py-1">{card.currentSize}</span>
          <span className="rounded bg-violet-600/80 py-1">E{getCardCost(card.template)}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1 text-[9px] font-black uppercase text-white/70">
          {card.exhausted ? <span className="rounded bg-white/10 px-1">Exhausted</span> : null}
          {stunned ? <span className="rounded bg-yellow-500/30 px-1">Stun</span> : null}
          {blinded ? <span className="rounded bg-violet-500/30 px-1">Blind</span> : null}
        </div>
      </div>
    </article>
  );
}

function CardBack() {
  return <div className="grid h-40 w-28 shrink-0 place-items-center rounded-lg border border-rose-400/40 bg-slate-950 text-xs font-black uppercase text-rose-200">Hidden</div>;
}

function canAnyAttack(state: MatchState, attacker: CardInstance, opponent: MatchPlayerState) {
  return [opponent.leader, ...opponent.board].some((target) => validateAction(state, {
    type: "ATTACK",
    playerId: "story-player",
    attackerInstanceId: attacker.instanceId,
    targetInstanceId: target.instanceId,
  }).ok);
}

function findCard(state: MatchState, instanceId: string) {
  for (const player of state.players) {
    const found = [player.leader, ...player.board, ...player.hand, ...player.graveyard].find((card) => card.instanceId === instanceId);
    if (found) return found;
  }
}
