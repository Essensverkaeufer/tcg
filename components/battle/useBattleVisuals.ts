"use client";

import { useEffect, useMemo, useState } from "react";
import type { BattleVisualEvent, MatchState } from "@/types/match";

type Floater = {
  id: string;
  label: string;
  tone: "damage" | "heal" | "buff" | "status" | "combo";
};

const eventDurationMs = 980;

export function useBattleVisuals(lastEvent: MatchState["lastEvent"] | undefined) {
  const [expiredEventId, setExpiredEventId] = useState("");
  const eventId = lastEvent?.id ?? "";
  const eventCount = lastEvent?.visualEvents?.length ?? 0;

  useEffect(() => {
    if (!eventId || eventCount === 0) return;
    const timer = window.setTimeout(() => setExpiredEventId(eventId), eventDurationMs);
    return () => window.clearTimeout(timer);
  }, [eventCount, eventId]);

  const events = useMemo(
    () => expiredEventId === eventId ? [] : lastEvent?.visualEvents ?? [],
    [eventId, expiredEventId, lastEvent?.visualEvents],
  );

  const eventsByCard = useMemo(() => {
    const byCard = new Map<string, BattleVisualEvent[]>();
    for (const event of events) {
      for (const instanceId of [event.sourceInstanceId, event.targetInstanceId]) {
        if (!instanceId) continue;
        const current = byCard.get(instanceId) ?? [];
        current.push(event);
        byCard.set(instanceId, current);
      }
    }
    return byCard;
  }, [events]);

  return {
    events,
    arenaClass: events.some((event) => event.type === "VICTORY") ? "battle-arena-victory" : "",
    bannerClass: events.some((event) => event.type === "TURN") ? "battle-banner-turn" : "",
    controlsClass: events.some((event) => event.type === "ENERGY") ? "battle-controls-energy" : "",
    hasServerWait: events.some((event) => event.type === "ERROR"),
    classForCard(instanceId?: string) {
      if (!instanceId) return "";
      return classNamesForEvents(eventsByCard.get(instanceId) ?? []);
    },
    floatersForCard(instanceId?: string): Floater[] {
      if (!instanceId) return [];
      return (eventsByCard.get(instanceId) ?? []).flatMap((event) => floaterForEvent(event));
    },
  };
}

function classNamesForEvents(events: BattleVisualEvent[]) {
  const classes = new Set<string>();
  for (const event of events) {
    if (event.type === "PLAY" || event.type === "DRAW") classes.add("battle-anim-play");
    if (event.type === "ITEM_ATTACH") classes.add("battle-anim-equip");
    if (event.type === "COMBO") classes.add("battle-anim-combo");
    if (event.type === "ATTACK" && event.sourceInstanceId) classes.add("battle-anim-attack");
    if (event.type === "DAMAGE") classes.add("battle-anim-damage");
    if (event.type === "HEAL") classes.add("battle-anim-heal");
    if (event.type === "BUFF") classes.add("battle-anim-buff");
    if (event.type === "STATUS") classes.add("battle-anim-status");
    if (event.type === "ABILITY") classes.add("battle-anim-ability");
    if (event.type === "DEATH") classes.add("battle-anim-death");
    if (event.type === "VICTORY") classes.add("battle-anim-victory");
  }
  return [...classes].join(" ");
}

function floaterForEvent(event: BattleVisualEvent): Floater[] {
  if (!event.targetInstanceId && !event.sourceInstanceId) return [];
  if (event.type === "DAMAGE" && event.amount) return [{ id: event.id, label: `-${event.amount}`, tone: "damage" }];
  if (event.type === "HEAL" && event.amount) return [{ id: event.id, label: `+${event.amount}`, tone: "heal" }];
  if (event.type === "BUFF" && event.amount) return [{ id: event.id, label: `+${event.amount} ${event.label ?? ""}`.trim(), tone: "buff" }];
  if (event.type === "STATUS" && event.label) return [{ id: event.id, label: event.label, tone: "status" }];
  if (event.type === "COMBO") return [{ id: event.id, label: event.label ?? "Combo", tone: "combo" }];
  if (event.type === "DEATH") return [{ id: event.id, label: event.label ?? "KO", tone: "damage" }];
  return [];
}
