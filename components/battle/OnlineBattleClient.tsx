"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAbilityCooldownRemaining } from "@/lib/game/abilities/engine";
import { resolveCardImageUrl } from "@/lib/game/card-images";
import { isHiddenCard, type HiddenCard, type MatchView } from "@/lib/game/match/view";
import { getCardCost } from "@/lib/game/match/state";
import type { AbilityDefinition } from "@/types/cards";
import type { CardInstance, MatchAction } from "@/types/match";

type SocketStatus = "idle" | "connecting" | "connected" | "queueing" | "matched" | "error";
type TargetMode = "inspect" | "attack" | "ability" | "item";

export function OnlineBattleClient() {
  const { accessToken, user } = useAuth();
  const configuredRealtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL ?? "";
  const realtimeUrl = configuredRealtimeUrl || (process.env.NODE_ENV === "development" ? "http://localhost:3001" : "");
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<SocketStatus>(realtimeUrl ? "idle" : "error");
  const [message, setMessage] = useState(
    realtimeUrl
      ? "Connect to the realtime server, then queue for a live match."
      : "Online battle server is not configured for this deployment yet. Use Local Sandbox for now.",
  );
  const [view, setView] = useState<MatchView | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [targetMode, setTargetMode] = useState<TargetMode>("inspect");
  const [pendingAbilityId, setPendingAbilityId] = useState("");
  const [actionSeq, setActionSeq] = useState(0);

  useEffect(() => {
    if (!accessToken || !realtimeUrl) return;
    const socket = io(realtimeUrl, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      setMessage("Realtime connected. Queue when your active deck is ready.");
      socket.emit("match:reconnect");
    });
    socket.on("connect_error", (error) => {
      setStatus("error");
      setMessage(error.message || "Could not connect to realtime server. Start it with npm run dev:realtime.");
    });
    socket.on("queue:status", (payload: { status: string; position?: number }) => {
      setStatus(payload.status === "QUEUED" ? "queueing" : "connected");
      setMessage(payload.status === "QUEUED" ? `Queueing for a match. Position ${payload.position ?? 1}.` : "Queue cancelled.");
    });
    socket.on("match:ready", () => {
      setStatus("matched");
      setMessage("Match found.");
    });
    socket.on("match:state", (payload: MatchView) => {
      setView(payload);
      setStatus("matched");
      setSelectedId("");
      setTargetMode("inspect");
      setPendingAbilityId("");
      setMessage(payload.lastEvent?.message ?? `${activeName(payload)} is thinking.`);
    });
    socket.on("match:error", (error: string) => {
      setStatus((current) => current === "matched" ? "matched" : "error");
      setMessage(error);
    });
    socket.on("disconnect", () => {
      setStatus("connecting");
      setMessage("Disconnected from realtime server. Reconnecting...");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, realtimeUrl]);

  const selected = useMemo(() => view && selectedId ? findVisibleCard(view, selectedId) : undefined, [selectedId, view]);
  const activePlayer = view?.players.find((player) => player.playerId === view.activePlayerId);
  const you = view?.players.find((player) => player.playerId === view.you);
  const opponent = view?.players.find((player) => player.playerId !== view.you);
  const isYourTurn = Boolean(view && view.activePlayerId === view.you);
  const selectedIsYours = Boolean(selected && selected.ownerId === view?.you);
  const selectedInHand = Boolean(you?.hand.some((card) => !isHiddenCard(card) && card.instanceId === selectedId));
  const selectedOnBoard = Boolean(you && selected && [you.leader, ...you.board].some((card) => card.instanceId === selected.instanceId));
  const activatedAbilities = selected?.template.abilityData.filter((ability) => ability.trigger === "ACTIVATED") ?? [];

  function joinQueue() {
    setView(null);
    setMessage("Joining queue...");
    setStatus("queueing");
    socketRef.current?.emit("queue:join");
  }

  function leaveQueue() {
    socketRef.current?.emit("queue:leave");
  }

  function sendAction(action: MatchAction) {
    if (!view || !socketRef.current || !user) return;
    const nextSeq = actionSeq + 1;
    setActionSeq(nextSeq);
    setMessage("Sending action...");
    socketRef.current.emit("match:action", {
      matchId: view.id,
      action: {
        ...action,
        playerId: view.you,
        actionSeq: nextSeq,
        clientActionId: crypto.randomUUID(),
      },
    });
  }

  function choose(card: CardInstance | HiddenCard) {
    if (isHiddenCard(card) || !view) return;
    if (targetMode === "attack" && selected && card.ownerId !== view.you) {
      sendAction({ type: "ATTACK", playerId: view.you, attackerInstanceId: selected.instanceId, targetInstanceId: card.instanceId });
      return;
    }
    if (targetMode === "ability" && selected && pendingAbilityId) {
      sendAction({ type: "USE_ABILITY", playerId: view.you, sourceInstanceId: selected.instanceId, abilityId: pendingAbilityId, targetInstanceId: card.instanceId });
      return;
    }
    if (targetMode === "item" && selected && card.ownerId === view.you) {
      sendAction({ type: "PLAY_CARD", playerId: view.you, cardInstanceId: selected.instanceId, targetInstanceId: card.instanceId });
      return;
    }
    setSelectedId(card.instanceId);
    setTargetMode("inspect");
    setPendingAbilityId("");
    setMessage(`${card.template.name} selected.`);
  }

  function playSelected() {
    if (!view || !selected || !selectedInHand || !isYourTurn) return;
    if (selected.template.cardType === "ITEM") {
      setTargetMode("item");
      setMessage("Choose one of your cards or your leader to equip the item.");
      return;
    }
    sendAction({ type: "PLAY_CARD", playerId: view.you, cardInstanceId: selected.instanceId });
  }

  function beginAttack() {
    if (!selected || !selectedOnBoard || !isYourTurn) return;
    setTargetMode("attack");
    setPendingAbilityId("");
    setMessage("Choose an enemy card or leader to attack.");
  }

  function beginAbility(ability: AbilityDefinition) {
    if (!view || !selected || !selectedOnBoard || !isYourTurn) return;
    const cooldownRemaining = getAbilityCooldownRemaining(selected, ability.id, view.turn);
    if (cooldownRemaining > 0) {
      setMessage(`${ability.label} is on cooldown for ${cooldownRemaining} more turn(s).`);
      return;
    }
    if (ability.requiresTarget) {
      setPendingAbilityId(ability.id);
      setTargetMode("ability");
      setMessage(`Choose a target for ${ability.label}.`);
      return;
    }
    sendAction({ type: "USE_ABILITY", playerId: view.you, sourceInstanceId: selected.instanceId, abilityId: ability.id });
  }

  function endTurn() {
    if (!view || !isYourTurn) return;
    sendAction({ type: "END_TURN", playerId: view.you });
  }

  function concede() {
    if (!view) return;
    socketRef.current?.emit("match:concede", { matchId: view.id });
  }

  return (
    <AuthGate>
      <main className="min-h-[calc(100vh-78px)] bg-slate-950 text-white">
        <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="min-w-0 rounded-lg border border-white/10 bg-black/35 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-black">Online Battle</h1>
                <p className="mt-1 text-sm font-bold text-slate-400">{message}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {status === "queueing" ? (
                  <button type="button" onClick={leaveQueue} className="rounded-md border border-white/20 px-4 py-2 text-sm font-black">Leave Queue</button>
                ) : status === "matched" ? (
                  <button type="button" disabled className="rounded-md bg-emerald-500/20 px-4 py-2 text-sm font-black text-emerald-100">In Match</button>
                ) : (
                  <button type="button" onClick={joinQueue} disabled={!accessToken || status === "connecting"} className="rounded-md bg-rose-500 px-4 py-2 text-sm font-black text-white disabled:opacity-40">Queue 1v1</button>
                )}
                <Link href="/battle/local" className="rounded-md border border-white/20 px-4 py-2 text-sm font-black">Local Sandbox</Link>
              </div>
            </div>
          </section>

          <aside className="min-w-0 rounded-lg border border-white/10 bg-black/35 p-4 xl:row-span-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Controls</h2>
            <div className="mt-3 grid gap-2">
              <button type="button" onClick={playSelected} disabled={!isYourTurn || !selectedInHand || !selectedIsYours} className="rounded-md bg-amber-300 px-3 py-2 text-sm font-black text-slate-950 disabled:opacity-40">
                Play{selectedInHand && selected ? ` (${getCardCost(selected.template)}E)` : ""}
              </button>
              <button type="button" onClick={beginAttack} disabled={!isYourTurn || !selectedOnBoard || !selectedIsYours} className="rounded-md bg-rose-500 px-3 py-2 text-sm font-black disabled:opacity-40">Attack</button>
              {activatedAbilities.length ? activatedAbilities.map((ability) => {
                const cooldownRemaining = selected && view ? getAbilityCooldownRemaining(selected, ability.id, view.turn) : 0;
                return (
                  <button key={ability.id} type="button" onClick={() => beginAbility(ability)} disabled={!isYourTurn || !selectedOnBoard || !selectedIsYours || cooldownRemaining > 0} className="rounded-md bg-violet-500 px-3 py-2 text-sm font-black disabled:opacity-40">
                    Use {ability.label}{cooldownRemaining > 0 ? ` (CD ${cooldownRemaining})` : ""}
                  </button>
                );
              }) : <button type="button" disabled className="rounded-md bg-white/10 px-3 py-2 text-sm font-black text-white/40">No Ability</button>}
              <button type="button" onClick={endTurn} disabled={!isYourTurn || view?.phase === "FINISHED"} className="rounded-md border border-fuchsia-400 px-3 py-2 text-sm font-black disabled:opacity-40">End Turn</button>
              <button type="button" onClick={() => { setTargetMode("inspect"); setPendingAbilityId(""); }} disabled={targetMode === "inspect"} className="rounded-md border border-white/20 px-3 py-2 text-sm font-black disabled:opacity-40">Cancel Target</button>
              <button type="button" onClick={concede} disabled={!view || view.phase === "FINISHED"} className="rounded-md border border-rose-400 px-3 py-2 text-sm font-black text-rose-100 disabled:opacity-40">Concede</button>
            </div>
            <div className="mt-5 rounded-md bg-white/5 p-3 text-sm">
              <div className="font-black">Status: {status}</div>
              <div className="mt-1 break-words text-slate-400">Server: {realtimeUrl || "not configured"}</div>
              {activePlayer ? (
                <div className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 p-2">
                  <div className="text-xs font-black uppercase tracking-widest text-amber-100">Active Player</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-black">{activePlayer.displayName}</span>
                    <EnergyPill current={activePlayer.energyCurrent} max={activePlayer.energyMax} />
                  </div>
                  <div className="mt-1 text-xs text-slate-400">Turn {view?.turn}</div>
                </div>
              ) : null}
            </div>
            {selected ? (
              <div className="mt-4 rounded-md bg-white/5 p-3 text-sm">
                <div className="font-black">{selected.template.name}</div>
                <div className="mt-1 text-slate-400">{selected.template.rarity} {selected.template.cardType}</div>
                <div className="mt-2 text-slate-300">{selected.template.description}</div>
              </div>
            ) : null}
          </aside>

          {view && opponent && you ? (
            <section className="grid min-w-0 gap-4">
              <PlayerZone title={opponent.displayName} player={opponent} selectedId={selectedId} active={view.activePlayerId === opponent.playerId} onChoose={choose} />
              <div className="rounded-lg border border-fuchsia-500/30 bg-black/45 p-4 text-center shadow-xl shadow-fuchsia-950/30">
                <div className="text-2xl font-black">{view.phase === "FINISHED" ? finishedText(view) : `${activePlayer?.displayName}'s Turn`}</div>
                <div className="mt-2 text-sm font-bold text-amber-100">{view.lastEvent?.message ?? "Waiting for action."}</div>
              </div>
              <PlayerZone title="You" player={you} selectedId={selectedId} active={view.activePlayerId === you.playerId} onChoose={choose} />
            </section>
          ) : (
            <section className="grid min-h-96 place-items-center rounded-lg border border-dashed border-white/10 bg-black/25 p-8 text-center">
              <div>
                <div className="text-2xl font-black">No Active Match</div>
                <p className="mt-2 max-w-xl text-sm font-bold text-slate-400">Start `npm run dev:realtime`, make sure your active deck is legal, then queue for a closed-alpha live match.</p>
              </div>
            </section>
          )}
        </div>
      </main>
    </AuthGate>
  );
}

function PlayerZone({ title, player, selectedId, active, onChoose }: { title: string; player: MatchView["players"][number]; selectedId: string; active: boolean; onChoose: (card: CardInstance | HiddenCard) => void }) {
  const leaderProtected = player.board.some((card) => card.template.cardType === "BUILDING");

  return (
    <section className={clsx("min-w-0 overflow-hidden rounded-lg border bg-black/35 p-3", active ? "border-amber-300/70" : "border-white/10")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 truncate text-lg font-black">{title}</h2>
            <EnergyPill current={player.energyCurrent} max={player.energyMax} />
            {leaderProtected ? <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-100">Leader protected</span> : null}
          </div>
          <p className="mt-1 text-xs font-bold text-slate-400">Deck {player.deckCount} | Hand {player.handCount} | Graveyard {player.graveyard.length}</p>
        </div>
        <LeaderButton card={player.leader} selected={selectedId === player.leader.instanceId} onChoose={onChoose} />
      </div>
      <div className="grid grid-cols-5 gap-2">
        {player.board.map((card) => <CardButton key={card.instanceId} card={card} selected={selectedId === card.instanceId} onChoose={onChoose} />)}
        {Array.from({ length: Math.max(0, 5 - player.board.length) }).map((_, index) => (
          <div key={index} className="grid h-32 min-w-0 place-items-center rounded-lg border border-dashed border-white/10 text-[10px] font-black uppercase text-white/20 sm:h-36">Empty</div>
        ))}
      </div>
      <div className="mt-3 flex max-w-full gap-2 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3 pb-4">
        {player.hand.length ? player.hand.map((card) => <CardButton key={card.instanceId} card={card} selected={!isHiddenCard(card) && selectedId === card.instanceId} onChoose={onChoose} hand />) : (
          <div className="grid min-h-32 flex-1 place-items-center text-sm font-bold text-slate-500">No cards in hand</div>
        )}
      </div>
    </section>
  );
}

function EnergyPill({ current, max }: { current: number; max: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/15 px-2 py-1 text-xs font-black text-amber-100">
      <span className="text-amber-300">E</span>
      {current}/{max}
    </span>
  );
}

function LeaderButton({ card, selected, onChoose }: { card: CardInstance; selected: boolean; onChoose: (card: CardInstance) => void }) {
  const imageUrl = resolveCardImageUrl(card.template.imageUrl);
  return (
    <button type="button" onClick={() => onChoose(card)} aria-label={`Select ${card.template.name}`} className="w-full max-w-sm min-w-0 text-left sm:w-80">
      <article className={clsx("grid grid-cols-[76px_minmax(0,1fr)] overflow-hidden rounded-lg border bg-slate-950 shadow-xl", selected ? "border-amber-300 ring-2 ring-amber-200" : "border-white/15")}>
        <div className="relative h-24 bg-white/10">
          <div className="absolute left-1 top-1 z-10 rounded-full bg-black/80 px-2 py-1 text-[10px] font-black text-amber-100">A{card.currentAura}</div>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : <div className="grid h-full place-items-center p-2 text-center text-[10px] font-black uppercase text-slate-400">{card.template.name}</div>}
        </div>
        <div className="min-w-0 p-2">
          <div className="truncate text-sm font-black">{card.template.name}</div>
          <div className="text-[10px] font-black uppercase text-amber-200">Leader</div>
          <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[11px] font-black">
            <span className="rounded bg-orange-500/80 py-1">{card.currentAttack}</span>
            <span className="rounded bg-rose-600/80 py-1">{Math.max(0, card.currentHealth)}</span>
            <span className="rounded bg-slate-700 py-1">{card.currentSize}</span>
            <span className="rounded bg-violet-600/80 py-1">E{getCardCost(card.template)}</span>
          </div>
        </div>
      </article>
    </button>
  );
}

function CardButton({ card, selected, hand, onChoose }: { card: CardInstance | HiddenCard; selected: boolean; hand?: boolean; onChoose: (card: CardInstance | HiddenCard) => void }) {
  if (isHiddenCard(card)) {
    return (
      <div className="grid h-32 w-24 shrink-0 place-items-center rounded-lg border border-rose-400/40 bg-slate-950 text-[10px] font-black uppercase text-rose-200 shadow-lg sm:h-36 sm:w-28">
        Hidden
      </div>
    );
  }

  const imageUrl = resolveCardImageUrl(card.template.imageUrl);

  return (
    <button type="button" onClick={() => onChoose(card)} aria-label={`Select ${card.template.name}`} className={clsx("min-w-0 shrink-0 text-left transition hover:-translate-y-1", hand ? "w-28 sm:w-32" : "w-full")}>
      <article className={clsx("relative overflow-hidden rounded-lg border-2 bg-slate-950 shadow-xl", selected ? "border-amber-300 ring-2 ring-amber-200" : "border-white/15")}>
        <div className="absolute left-1 top-1 z-10 rounded-full bg-black/80 px-1.5 py-0.5 text-[10px] font-black text-amber-100">A{card.currentAura}</div>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className={clsx("w-full object-cover", hand ? "h-20 sm:h-24" : "h-16 sm:h-20")} />
        ) : <div className={clsx("grid place-items-center bg-white/10 p-2 text-center text-[10px] font-black uppercase text-slate-400", hand ? "h-20 sm:h-24" : "h-16 sm:h-20")}>{card.template.name}</div>}
        <div className="p-2">
          <div className="min-w-0 truncate text-[11px] font-black sm:text-xs">{card.template.name}</div>
          <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px] font-black">
            <span className="rounded bg-orange-500/80 py-1">{card.currentAttack}</span>
            <span className="rounded bg-rose-600/80 py-1">{Math.max(0, card.currentHealth)}</span>
            <span className="rounded bg-slate-700 py-1">{card.currentSize}</span>
            <span className="rounded bg-violet-600/80 py-1">E{getCardCost(card.template)}</span>
          </div>
        </div>
      </article>
    </button>
  );
}

function findVisibleCard(view: MatchView, instanceId: string) {
  for (const player of view.players) {
    const cards = [player.leader, ...player.board, ...player.graveyard, ...player.hand.filter((card): card is CardInstance => !isHiddenCard(card))];
    const found = cards.find((card) => card.instanceId === instanceId);
    if (found) return found;
  }
}

function activeName(view: MatchView) {
  return view.players.find((player) => player.playerId === view.activePlayerId)?.displayName ?? "A player";
}

function finishedText(view: MatchView) {
  if (view.draw) return "Draw";
  return view.winnerId === view.you ? "Victory" : "Defeat";
}
