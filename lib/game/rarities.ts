import type { Rarity } from "@/types/cards";

export const rarityValues = [
  "COMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
  "MYTHIC",
  "ULTRA_LEGENDARY",
  "DIVINE",
] as const satisfies readonly Rarity[];

export const highRarities: Rarity[] = ["LEGENDARY", "MYTHIC", "ULTRA_LEGENDARY", "DIVINE"];

export const rarityThemes: Record<Rarity, {
  card: string;
  glow: string;
  text: string;
  badge: string;
}> = {
  COMMON: {
    card: "border-slate-300 from-slate-100 to-slate-200",
    glow: "from-slate-500/25 via-slate-300/15 to-transparent",
    text: "text-slate-200",
    badge: "bg-slate-100 text-slate-700",
  },
  RARE: {
    card: "border-sky-300 from-sky-100 to-cyan-200",
    glow: "from-sky-400/35 via-cyan-300/20 to-transparent",
    text: "text-sky-200",
    badge: "bg-sky-100 text-sky-700",
  },
  EPIC: {
    card: "border-fuchsia-300 from-fuchsia-100 to-pink-200",
    glow: "from-fuchsia-500/35 via-pink-300/20 to-transparent",
    text: "text-fuchsia-200",
    badge: "bg-fuchsia-100 text-fuchsia-700",
  },
  LEGENDARY: {
    card: "border-amber-300 from-amber-100 to-orange-200",
    glow: "from-amber-400/45 via-yellow-200/25 to-transparent",
    text: "text-amber-200",
    badge: "bg-amber-100 text-amber-800",
  },
  MYTHIC: {
    card: "border-rose-300 from-rose-100 to-indigo-200",
    glow: "from-rose-500/45 via-indigo-300/25 to-transparent",
    text: "text-rose-200",
    badge: "bg-rose-100 text-rose-700",
  },
  ULTRA_LEGENDARY: {
    card: "border-violet-400 from-violet-100 to-yellow-200",
    glow: "from-violet-500/50 via-amber-300/30 to-transparent",
    text: "text-violet-100",
    badge: "bg-violet-100 text-violet-800",
  },
  DIVINE: {
    card: "border-cyan-200 from-cyan-100 via-white to-amber-100",
    glow: "from-cyan-300/60 via-white/35 to-amber-200/40",
    text: "text-cyan-100",
    badge: "bg-cyan-100 text-cyan-900",
  },
};

export function getRarityTheme(rarity: Rarity) {
  return rarityThemes[rarity] ?? rarityThemes.COMMON;
}
