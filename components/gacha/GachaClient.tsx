"use client";

import clsx from "clsx";
import { Coins, Gem, History, LoaderCircle, Sparkles, Star, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { CardFrame } from "@/components/cards/CardFrame";
import { gachaRarityRates, getFeaturedChanceForNextPull, getGuaranteedIn, necrpTuffGachaBanner } from "@/lib/game/gacha";
import { getRarityTheme } from "@/lib/game/rarities";
import type { CardTemplate } from "@/types/cards";

type GachaReward = {
  cardTemplateId: string;
  slug: string;
  name: string;
  rarity: string;
  featured: boolean;
  pityAfter: number;
  pullNumber: number;
};

type GachaHistoryEntry = {
  id: string;
  pullCount: number;
  cost: number;
  rewards: unknown;
  pityBefore: number;
  pityAfter: number;
  featuredHits: number;
  createdAt: string;
};

type GachaStatus = {
  banner: typeof necrpTuffGachaBanner & { nextFeaturedChance: number };
  coins: number;
  featuredCard: CardTemplate;
  pity: {
    pullsSinceFeatured: number;
    totalPulls: number;
    featuredCopies: number;
    featuredOwned: number;
    guaranteedIn: number;
  };
  history: GachaHistoryEntry[];
};

function rewardsFromHistory(value: unknown): GachaReward[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is GachaReward => Boolean(entry && typeof entry === "object" && "name" in entry));
}

export function GachaClient() {
  const { accessToken, refreshProfile } = useAuth();
  const [status, setStatus] = useState<GachaStatus | null>(null);
  const [visibleCoins, setVisibleCoins] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyPull, setBusyPull] = useState<1 | 10 | null>(null);
  const [pullCards, setPullCards] = useState<CardTemplate[]>([]);
  const [pullRewards, setPullRewards] = useState<GachaReward[]>([]);
  const [pullStartPity, setPullStartPity] = useState(0);
  const [pullSettled, setPullSettled] = useState(true);
  const [heldFeaturedIndex, setHeldFeaturedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [charging, setCharging] = useState(false);

  const currentCard = revealed > 0 ? pullCards[revealed - 1] : null;
  const currentReward = revealed > 0 ? pullRewards[revealed - 1] : null;
  const hasFeaturedReveal = pullRewards.slice(0, revealed).some((reward) => reward.featured);
  const displayPity = useMemo(() => {
    if (!status) return null;
    if (pullSettled || pullRewards.length === 0) return status.pity;
    if (revealed === 0) {
      return {
        ...status.pity,
        pullsSinceFeatured: pullStartPity,
        guaranteedIn: getGuaranteedIn(pullStartPity),
      };
    }

    const visibleRewards = pullRewards.slice(0, revealed);
    const latest = visibleRewards[visibleRewards.length - 1];
    if (!latest) return status.pity;
    const featuredHits = visibleRewards.filter((reward) => reward.featured).length;
    return {
      ...status.pity,
      pullsSinceFeatured: latest.pityAfter,
      totalPulls: status.pity.totalPulls + revealed,
      featuredCopies: status.pity.featuredCopies + featuredHits,
      featuredOwned: status.pity.featuredOwned + featuredHits,
      guaranteedIn: getGuaranteedIn(latest.pityAfter),
    };
  }, [pullRewards, pullSettled, pullStartPity, revealed, status]);
  const displayCoins = visibleCoins ?? status?.coins ?? 0;
  const revealPausedOnFeatured = heldFeaturedIndex !== null && revealed < pullCards.length;
  const pullLocked = Boolean(busyPull) || !pullSettled;
  const canPullOne = displayCoins >= necrpTuffGachaBanner.pricePerPull;
  const canPullTen = displayCoins >= necrpTuffGachaBanner.pricePerPull * 10;
  const pityPercent = Math.min(100, ((displayPity?.pullsSinceFeatured ?? 0) / necrpTuffGachaBanner.hardPity) * 100);
  const displayedFeaturedChance = getFeaturedChanceForNextPull(displayPity?.pullsSinceFeatured ?? 0);
  const stageGlow = useMemo(() => {
    if (currentReward?.featured) return "from-cyan-300/60 via-white/30 to-amber-200/40";
    if (currentCard) return getRarityTheme(currentCard.rarity).glow;
    return "from-cyan-500/25 via-violet-500/20 to-rose-500/15";
  }, [currentCard, currentReward]);

  const loadStatus = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/gacha/status", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(payload.error ?? "Could not load gacha.");
      return;
    }
    setStatus(payload);
    setVisibleCoins(payload.coins);
  }, [accessToken]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadStatus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadStatus]);

  useEffect(() => {
    if (!charging || revealed >= pullCards.length) return;
    if (currentReward?.featured && revealed < pullCards.length) {
      const id = window.setTimeout(() => {
        setHeldFeaturedIndex(revealed - 1);
        setCharging(false);
      }, 0);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      setRevealed((current) => Math.min(pullCards.length, current + 1));
    }, revealed === 0 ? 760 : 560);
    return () => window.clearTimeout(id);
  }, [charging, currentReward, pullCards.length, revealed]);

  useEffect(() => {
    if (pullCards.length === 0 || revealed < pullCards.length || pullSettled) return;
    const id = window.setTimeout(() => {
      setCharging(false);
      setPullSettled(true);
      void refreshProfile();
      void loadStatus();
    }, 450);
    return () => window.clearTimeout(id);
  }, [loadStatus, pullCards.length, pullSettled, refreshProfile, revealed]);

  function continueRevealing() {
    setHeldFeaturedIndex(null);
    setCharging(true);
    setRevealed((current) => Math.min(pullCards.length, current + 1));
  }

  async function pull(count: 1 | 10) {
    if (!accessToken || pullLocked) return;
    const startingPity = displayPity?.pullsSinceFeatured ?? 0;
    setBusyPull(count);
    setMessage("");
    setPullCards([]);
    setPullRewards([]);
    setPullStartPity(startingPity);
    setPullSettled(false);
    setHeldFeaturedIndex(null);
    setRevealed(0);
    setCharging(true);

    const response = await fetch("/api/gacha/pull", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "same-origin",
      body: JSON.stringify({ bannerSlug: necrpTuffGachaBanner.slug, pullCount: count }),
    });
    const payload = await response.json();
    setBusyPull(null);

    if (!response.ok) {
      setCharging(false);
      setPullSettled(true);
      setMessage(payload.error ?? "Could not pull gacha.");
      return;
    }

    const cards = payload.cards ?? [];
    const rewards = payload.rewards ?? [];
    setVisibleCoins(typeof payload.coins === "number" ? payload.coins : displayCoins - count * necrpTuffGachaBanner.pricePerPull);
    setPullCards(cards);
    setPullRewards(rewards);
    if (cards.length === 0) {
      setCharging(false);
      setPullSettled(true);
      await refreshProfile();
      await loadStatus();
    }
  }

  return (
    <AuthGate>
      <main className="min-h-[calc(100vh-76px)] overflow-hidden bg-slate-950 text-white">
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="gacha-starfield absolute inset-0 opacity-70" aria-hidden />
          <div className={clsx("absolute inset-x-0 top-0 h-80 bg-gradient-to-b blur-3xl", hasFeaturedReveal ? "from-cyan-300/35" : "from-violet-500/20")} aria-hidden />
          <div className="relative z-10 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="rounded-lg border border-cyan-200/30 bg-white/10 p-4 shadow-2xl shadow-cyan-500/10 backdrop-blur">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100">Featured</p>
                    <h1 className="text-2xl font-black">{status?.banner.name ?? "Constellation"}</h1>
                  </div>
                  <span className="rounded-full border border-cyan-200/50 bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-950">DIVINE</span>
                </div>
                {status?.featuredCard ? <CardFrame card={status.featuredCard} /> : (
                  <div className="grid min-h-80 place-items-center rounded-lg border border-white/10 bg-black/30 text-sm font-bold text-white/60">
                    {loading ? "Loading card..." : "Featured card unavailable"}
                  </div>
                )}
              </div>
            </aside>

            <section className="space-y-5">
              <div className="grid gap-4 md:grid-cols-[1fr_280px]">
                <div className="rounded-lg border border-white/10 bg-black/35 p-5 backdrop-blur">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100">Constellation Reward</p>
                      <h2 className="mt-1 text-3xl font-black">necrp (tuff edition)</h2>
                      <p className="mt-2 max-w-2xl text-sm font-bold text-slate-300">
                        Pulls cost 100 coins. Featured pity resets whenever the DIVINE card appears.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-md border border-amber-200/40 bg-amber-200/15 px-3 py-2 text-sm font-black text-amber-100">
                      <Coins className="h-4 w-4" aria-hidden />
                      {displayCoins}
                    </span>
                  </div>

                  <div className="mt-5 rounded-lg border border-white/10 bg-slate-950/80 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm font-black">
                      <span>Pity {displayPity?.pullsSinceFeatured ?? 0} / {necrpTuffGachaBanner.hardPity}</span>
                      <span>Guaranteed in {displayPity?.guaranteedIn ?? necrpTuffGachaBanner.hardPity}</span>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-white to-amber-200 transition-all" style={{ width: `${pityPercent}%` }} />
                    </div>
                    <div className="mt-3 grid gap-2 text-xs font-bold text-slate-300 sm:grid-cols-3">
                      <span>Total pulls: {displayPity?.totalPulls ?? 0}</span>
                      <span>Featured copies: {displayPity?.featuredCopies ?? 0}</span>
                      <span>Owned: {displayPity?.featuredOwned ?? 0}</span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void pull(1)}
                      disabled={!canPullOne || pullLocked}
                      className="inline-flex items-center gap-2 rounded-md bg-cyan-200 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                    >
                      {busyPull === 1 ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Star className="h-4 w-4" aria-hidden />}
                      Pull 1
                      <span className="rounded bg-black/10 px-2 py-0.5">100</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void pull(10)}
                      disabled={!canPullTen || pullLocked}
                      className="inline-flex items-center gap-2 rounded-md bg-amber-200 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                    >
                      {busyPull === 10 ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Zap className="h-4 w-4" aria-hidden />}
                      Pull 10
                      <span className="rounded bg-black/10 px-2 py-0.5">1000</span>
                    </button>
                  </div>
                  {message ? <div className="mt-4 rounded-md border border-rose-300/40 bg-rose-500/15 p-3 text-sm font-black text-rose-100">{message}</div> : null}
                </div>

                <div className="rounded-lg border border-white/10 bg-black/35 p-5 backdrop-blur">
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-cyan-100">
                    <Gem className="h-4 w-4" aria-hidden />
                    Rates
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between rounded-md bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100">
                      <span>Featured DIVINE</span>
                      <span>{(displayedFeaturedChance * 100).toFixed(2)}%</span>
                    </div>
                    {gachaRarityRates.map((rate) => (
                      <div key={rate.rarity} className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">
                        <span>{rate.rarity.replace("_", " ")}</span>
                        <span>{rate.rate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={clsx("relative overflow-hidden rounded-lg border border-white/10 bg-black/50 p-5 shadow-2xl backdrop-blur", currentReward?.featured && "gacha-featured-hit")}>
                <div className={clsx("absolute inset-0 bg-gradient-to-br", stageGlow)} aria-hidden />
                <div className="relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-cyan-100" aria-hidden />
                      <h3 className="text-xl font-black">Pull Chamber</h3>
                    </div>
                    <span className="rounded-md border border-white/10 bg-black/40 px-3 py-1 text-xs font-black uppercase tracking-widest text-white/70">
                      {pullCards.length ? revealPausedOnFeatured ? "unlocked" : `${revealed}/${pullCards.length}` : charging ? "charging" : "ready"}
                    </span>
                  </div>

                  <div className="mt-5 grid min-h-[420px] place-items-center rounded-lg border border-white/10 bg-slate-950/75 p-4">
                    {currentCard ? (
                      <div className={clsx("w-full max-w-sm revealed-card", currentReward?.featured && "gacha-constellation-pop")}>
                        {currentReward?.featured ? (
                          <div className="mb-3 rounded-full border border-cyan-200/60 bg-cyan-200/15 px-4 py-2 text-center text-sm font-black uppercase tracking-[0.18em] text-cyan-50">
                            Constellation Unlocked
                          </div>
                        ) : null}
                        <CardFrame card={currentCard} />
                        {revealPausedOnFeatured ? (
                          <button
                            type="button"
                            onClick={continueRevealing}
                            className="mt-4 w-full rounded-md border border-cyan-200/60 bg-cyan-100 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-cyan-950 shadow-lg shadow-cyan-300/25 hover:bg-white"
                          >
                            Continue Revealing
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <div className={clsx("grid text-center", charging && "gacha-constellation-charge")}>
                        <Sparkles className="mx-auto h-16 w-16 text-cyan-100" aria-hidden />
                        <div className="mt-4 text-2xl font-black uppercase tracking-[0.24em]">{charging ? "Charging" : "Ready"}</div>
                      </div>
                    )}
                  </div>

                  {pullCards.length ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-5">
                      {pullCards.map((card, index) => {
                        const visible = index < revealed;
                        const reward = pullRewards[index];
                        return (
                          <div
                            key={`${card.slug}-${index}`}
                            className={clsx(
                              "rounded-md border p-3 text-sm transition",
                              visible ? "border-white/20 bg-white/15" : "border-white/10 bg-black/30",
                              reward?.featured && visible && "shadow-lg shadow-cyan-300/30",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black">#{index + 1}</span>
                              <span className={clsx("text-xs font-black", visible ? getRarityTheme(card.rarity).text : "text-white/35")}>
                                {visible ? card.rarity.replace("_", " ") : "HIDDEN"}
                              </span>
                            </div>
                            <div className="mt-1 truncate text-xs font-bold text-white/75">{visible ? card.name : "???"}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              <section className="rounded-lg border border-white/10 bg-black/35 p-5 backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-cyan-100">
                  <History className="h-4 w-4" aria-hidden />
                  Recent Pulls
                </div>
                <div className="mt-4 space-y-2">
                  {status?.history.length ? status.history.map((entry) => {
                    const rewards = rewardsFromHistory(entry.rewards);
                    return (
                      <div key={entry.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black text-slate-300">
                          <span>{entry.pullCount} pull{entry.pullCount === 1 ? "" : "s"} - {entry.cost} coins</span>
                          <span>{entry.featuredHits ? `${entry.featuredHits} featured` : `Pity ${entry.pityBefore} -> ${entry.pityAfter}`}</span>
                        </div>
                        <div className="mt-2 truncate text-xs font-bold text-white/70">
                          {rewards.map((reward) => reward.name).join(", ")}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="rounded-md border border-dashed border-white/15 bg-white/5 p-4 text-center text-sm font-bold text-slate-400">
                      No gacha pulls yet.
                    </div>
                  )}
                </div>
              </section>
            </section>
          </div>
        </div>
      </main>
    </AuthGate>
  );
}
