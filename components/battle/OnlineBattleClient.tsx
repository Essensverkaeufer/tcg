"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
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
