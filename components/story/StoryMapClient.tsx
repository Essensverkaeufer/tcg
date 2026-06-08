"use client";

import clsx from "clsx";
import Link from "next/link";
import { Castle, Check, Lock, Skull, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import type { StoryDifficulty, StoryProgressStatus } from "@/lib/game/story/config";

type StoryProgressEncounter = {
  slug: string;
  name: string;
  description: string;
  chapter: 1 | 2;
  difficulty: StoryDifficulty;
  position: { x: number; y: number };
  status: StoryProgressStatus;
  wins: number;
  losses: number;
  bestTurns: number | null;
  boss?: boolean;
};

export function StoryMapClient() {
  const [encounters, setEncounters] = useState<StoryProgressEncounter[]>([]);
  const [message, setMessage] = useState("Loading story path...");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/story/progress", { cache: "no-store" });
      const payload = await response.json();
      if (cancelled) return;
      if (!response.ok) {
        setMessage(payload.error ?? "Could not load story progress.");
        return;
      }
      setEncounters(payload.encounters ?? []);
      setMessage("Choose an unlocked fight and clear the path.");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthGate>
      <main className="min-h-[calc(100vh-78px)] bg-slate-950 text-white">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-300">Story Mode</p>
              <h1 className="mt-2 text-4xl font-black">Story Chapters</h1>
              <p className="mt-2 max-w-2xl text-sm font-bold text-slate-400">{message}</p>
            </div>
            <Link href="/decks" className="rounded-md border border-white/15 px-4 py-2 text-sm font-black hover:bg-white/10">
              Edit Active Deck
            </Link>
          </div>

          <div className="mt-8 grid gap-8">
            <ChapterPath title="Chapter 1: Road to the Woke Mind Virus" encounters={encounters.filter((encounter) => encounter.chapter === 1)} />
            <ChapterPath title="Chapter 2: Viral Aftermath" encounters={encounters.filter((encounter) => encounter.chapter === 2)} />
          </div>
        </section>
      </main>
    </AuthGate>
  );
}

function ChapterPath({ title, encounters }: { title: string; encounters: StoryProgressEncounter[] }) {
  if (!encounters.length) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_center,#451a35_0%,#111827_48%,#020617_100%)] p-4 shadow-2xl shadow-rose-950/30 sm:p-6">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="relative mt-6">
        <div className="absolute bottom-8 left-8 top-8 w-1 rounded-full bg-gradient-to-b from-emerald-400/30 via-amber-300/50 to-rose-500/50 md:left-8 md:right-8 md:top-1/2 md:h-1 md:w-auto md:-translate-y-1/2 md:bg-gradient-to-r" />
        <div className="relative grid gap-4 md:grid-cols-3 xl:grid-cols-6 xl:gap-5">
          {encounters.map((encounter, index) => (
            <EncounterNode key={encounter.slug} encounter={encounter} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function EncounterNode({ encounter, index }: { encounter: StoryProgressEncounter; index: number }) {
  const locked = encounter.status === "LOCKED";
  const completed = encounter.status === "COMPLETED";
  const Icon = encounter.boss ? Skull : completed ? Check : locked ? Lock : Swords;

  const content = (
    <article
      className={clsx(
        "w-full min-w-0 rounded-lg border p-3 shadow-xl backdrop-blur",
        encounter.boss ? "border-rose-400 bg-rose-950/70 shadow-rose-500/20" : completed ? "border-emerald-300/50 bg-emerald-950/50" : locked ? "border-white/10 bg-black/60 opacity-70" : "border-amber-300/60 bg-slate-950/85 shadow-amber-500/20",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-black">{encounter.name}</h2>
          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{encounter.difficulty}</div>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <p className="mt-3 line-clamp-3 text-xs font-semibold text-slate-300">{encounter.description}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase text-slate-400">
        <span>Wins {encounter.wins}</span>
        <span>Losses {encounter.losses}</span>
        {encounter.bestTurns ? <span>Best {encounter.bestTurns}T</span> : null}
      </div>
      <div className="mt-3 rounded-md bg-white/10 px-3 py-2 text-center text-xs font-black">
        {locked ? "Locked" : completed ? "Replay" : encounter.boss ? "Final Boss" : "Start"}
      </div>
    </article>
  );

  return (
    <div className={clsx(
      "relative z-10 flex min-w-0 items-center gap-3 md:block",
      index % 2 === 0 ? "xl:-translate-y-10" : "xl:translate-y-12",
    )}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-slate-950 shadow-lg md:mx-auto md:mb-3">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      {locked ? content : <Link href={`/story/${encounter.slug}`} className="min-w-0 flex-1 md:block">{content}</Link>}
      {encounter.boss ? <Castle className="mx-auto mt-2 h-8 w-8 text-rose-200" aria-hidden /> : null}
    </div>
  );
}
