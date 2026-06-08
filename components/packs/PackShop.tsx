"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Coins, Gift, Shuffle } from "lucide-react";
import clsx from "clsx";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { packDefinitions } from "@/lib/game/packs/packs";

const accentStyles: Record<string, string> = {
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
};

export function PackShop() {
  const router = useRouter();
  const { accessToken, profile, refreshProfile } = useAuth();
  const [busyPack, setBusyPack] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function buyPack(packSlug: string) {
    if (!accessToken) return;
    setBusyPack(packSlug);
    setMessage("");
    const response = await fetch("/api/packs/open", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ packSlug }),
    });
    const payload = await response.json();
    setBusyPack(null);

    if (!response.ok) {
      setMessage(payload.error ?? "Could not open pack.");
      return;
    }

    sessionStorage.setItem("lastPackOpening", JSON.stringify({ packSlug, cards: payload.cards }));
    await refreshProfile();
    router.push(`/packs/opening?pack=${packSlug}&source=purchase`);
  }

  return (
    <AuthGate>
      <section className="page-enter space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">Pack Shop</h1>
            <p className="mt-2 text-slate-600">Available packs and coin prices. Every slot is a weighted roll.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-black text-amber-800">
            <Coins className="h-4 w-4" aria-hidden />
            {profile?.coins ?? 0}
          </span>
        </div>
        {message ? <div className="soft-shake rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{message}</div> : null}
        <div className="animated-grid grid gap-4 md:grid-cols-3">
          {packDefinitions.map((pack) => {
            const canAfford = (profile?.coins ?? 0) >= pack.priceCoins;
            return (
              <article key={pack.slug} className="stagger-card pack-shop-card foil-hover rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className={clsx("pack-icon-burst mb-4 grid aspect-[4/3] place-items-center rounded-md border-2", accentStyles[pack.accent])}>
                  <Gift className="h-12 w-12" aria-hidden />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">{pack.name}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{pack.description}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-sm font-black text-amber-800">
                    <Coins className="h-4 w-4" aria-hidden />
                    {pack.priceCoins}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-md bg-slate-100 p-3 text-xs font-bold text-slate-600">
                  <Shuffle className="h-4 w-4 shrink-0" aria-hidden />
                  Weighted rolls only. No guaranteed rarity.
                </div>
                {canAfford ? (
                  <a
                    href={`/api/packs/open-redirect?pack=${pack.slug}`}
                    onClick={(event) => {
                      event.preventDefault();
                      void buyPack(pack.slug);
                      window.setTimeout(() => {
                        if (busyPack === pack.slug) window.location.href = `/api/packs/open-redirect?pack=${pack.slug}`;
                      }, 800);
                    }}
                    className="pack-buy-burst mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
                  >
                    <Gift className="h-4 w-4" aria-hidden />
                    {busyPack === pack.slug ? "Opening..." : "Buy & Open"}
                  </a>
                ) : (
                  <span className="mt-4 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md bg-slate-300 px-4 py-2 text-sm font-black text-white">
                    <Gift className="h-4 w-4" aria-hidden />
                    Not Enough Coins
                  </span>
                )}
                <Link href={`/packs/opening?pack=${pack.slug}`} className="mt-2 block text-center text-xs font-bold text-slate-500 hover:text-slate-950">
                  Preview animation without buying
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </AuthGate>
  );
}
