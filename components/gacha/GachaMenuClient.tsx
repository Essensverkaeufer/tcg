"use client";

import clsx from "clsx";
import { Coins, LoaderCircle, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { CardFrame } from "@/components/cards/CardFrame";
import { gachaBanners, type GachaBanner } from "@/lib/game/gacha";
import type { CardTemplate } from "@/types/cards";

type BannerStatus = {
  banner: GachaBanner & { nextFeaturedChance: number };
  coins: number;
  featuredCard: CardTemplate;
  featuredCards: CardTemplate[];
  pity: {
    pullsSinceFeatured: number;
    totalPulls: number;
    featuredCopies: number;
    featuredOwned: number;
    featuredOwnedBySlug?: Record<string, number>;
    guaranteedIn: number;
  };
};

type BannerState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: BannerStatus };

export function GachaMenuClient() {
  const { accessToken } = useAuth();
  const [bannerStates, setBannerStates] = useState<Record<string, BannerState>>(() =>
    Object.fromEntries(gachaBanners.map((banner) => [banner.slug, { status: "loading" as const }])),
  );

  const loadBanners = useCallback(async () => {
    if (!accessToken) return;

    const results = await Promise.all(gachaBanners.map(async (banner) => {
      try {
        const response = await fetch(`/api/gacha/status?bannerSlug=${encodeURIComponent(banner.slug)}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Could not load banner.");
        return [banner.slug, { status: "ready", data: payload } satisfies BannerState] as const;
      } catch (error) {
        return [banner.slug, {
          status: "error",
          error: error instanceof Error ? error.message : "Could not load banner.",
        } satisfies BannerState] as const;
      }
    }));

    setBannerStates(Object.fromEntries(results));
  }, [accessToken]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadBanners();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadBanners]);

  const firstReady = Object.values(bannerStates).find((state): state is { status: "ready"; data: BannerStatus } => state.status === "ready");

  return (
    <AuthGate>
      <main className="page-enter min-h-[calc(100vh-76px)] overflow-hidden bg-slate-950 text-white">
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="gacha-starfield absolute inset-0 opacity-60" aria-hidden />
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-cyan-500/20 via-violet-500/15 to-transparent blur-3xl" aria-hidden />

          <section className="relative z-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100">Gacha</p>
                <h1 className="mt-2 text-4xl font-black">Pick a Constellation</h1>
                <p className="mt-2 max-w-2xl text-sm font-bold text-slate-300">
                  Each banner has separate pity, separate history, and the same server-side pull rules.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-md border border-amber-200/40 bg-amber-200/15 px-4 py-3 text-sm font-black text-amber-100">
                <Coins className="h-4 w-4" aria-hidden />
                {firstReady?.data.coins ?? "--"}
              </div>
            </div>

            <div className="animated-grid mt-8 grid gap-5 lg:grid-cols-2">
              {gachaBanners.map((banner) => {
                const state = bannerStates[banner.slug] ?? { status: "loading" as const };
                const ready = state.status === "ready" ? state.data : null;
                const pity = ready?.pity;

                return (
                  <article key={banner.slug} className={clsx(
                    "gacha-banner-shimmer stagger-card grid gap-5 rounded-lg border bg-black/40 p-4 shadow-2xl backdrop-blur md:grid-cols-[260px_minmax(0,1fr)]",
                    banner.featuredSlugs.includes("pillow-necrp") ? "border-cyan-200/35 shadow-cyan-500/10" : "border-violet-200/30 shadow-violet-500/10",
                  )}>
                    <div className={clsx("grid gap-3", (ready?.featuredCards?.length ?? banner.featuredSlugs.length) > 1 && "sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2")}>
                      {ready?.featuredCards?.length ? (
                        ready.featuredCards.map((card) => <CardFrame key={card.slug} card={card} />)
                      ) : (
                        <div className="grid aspect-[2/3] place-items-center rounded-lg border border-white/10 bg-slate-950/80 text-sm font-black text-white/50">
                          {state.status === "loading" ? <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden /> : "Unavailable"}
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-col justify-between gap-5">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
                          <Sparkles className="h-4 w-4" aria-hidden />
                          DIVINE Banner
                        </div>
                        <h2 className="mt-2 text-3xl font-black">{banner.name}</h2>
                        <p className="mt-2 text-sm font-bold text-slate-300">{banner.subtitle}</p>

                        {state.status === "error" ? (
                          <div className="mt-4 rounded-md border border-rose-300/40 bg-rose-500/15 p-3 text-sm font-black text-rose-100">
                            {state.error}
                          </div>
                        ) : null}

                        <div className="mt-5 grid gap-2 text-sm font-black sm:grid-cols-2">
                          <div className="rounded-md border border-white/10 bg-white/5 p-3">
                            <div className="text-xs uppercase tracking-widest text-slate-400">Price</div>
                            <div className="mt-1">{banner.pricePerPull} coins</div>
                          </div>
                          <div className="rounded-md border border-white/10 bg-white/5 p-3">
                            <div className="text-xs uppercase tracking-widest text-slate-400">Hard Pity</div>
                            <div className="mt-1">{banner.hardPity} pulls</div>
                          </div>
                          <div className="rounded-md border border-white/10 bg-white/5 p-3">
                            <div className="text-xs uppercase tracking-widest text-slate-400">Current Pity</div>
                            <div className="mt-1">{pity ? `${pity.pullsSinceFeatured} / ${banner.hardPity}` : "--"}</div>
                          </div>
                          <div className="rounded-md border border-white/10 bg-white/5 p-3">
                            <div className="text-xs uppercase tracking-widest text-slate-400">Owned</div>
                            <div className="mt-1">{pity?.featuredOwned ?? "--"}</div>
                          </div>
                        </div>
                        {ready?.featuredCards?.length && pity?.featuredOwnedBySlug ? (
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase text-cyan-100">
                            {ready.featuredCards.map((card) => (
                              <span key={card.slug} className="rounded-full border border-cyan-200/30 bg-cyan-200/10 px-2 py-1">
                                {card.name}: {pity.featuredOwnedBySlug?.[card.slug] ?? 0}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <Link
                        href={`/gacha/${banner.slug}`}
                        className="next-encounter-glow inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-200 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-100"
                      >
                        <Star className="h-4 w-4" aria-hidden />
                        Open Banner
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </AuthGate>
  );
}
