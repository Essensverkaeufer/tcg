"use client";

import dynamic from "next/dynamic";

const BattleBoard = dynamic(() => import("@/components/battle/BattleBoard").then((module) => module.BattleBoard), {
  ssr: false,
  loading: () => (
    <section className="grid min-h-80 place-items-center rounded-lg border border-slate-200 bg-white p-4 text-sm font-bold text-slate-600">
      Preparing local battle sandbox
    </section>
  ),
});

export function BattleClient() {
  return <BattleBoard />;
}
