"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";

export function DashboardClient() {
  const { profile, user, accessToken, refreshProfile } = useAuth();
  const [ownedCards, setOwnedCards] = useState(0);
  const [deckCount, setDeckCount] = useState(0);
  const [onlineReady, setOnlineReady] = useState(false);
  const [realtimeUrl, setRealtimeUrl] = useState("");

  useEffect(() => {
    if (!user) return;
    void refreshProfile();
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
    void fetch("/api/collection", { headers, cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json())
      .then((payload) => setOwnedCards(payload.totalQuantity ?? 0))
      .catch(() => setOwnedCards(0));
    void fetch("/api/decks", { headers, cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json())
      .then((payload) => setDeckCount(payload.decks?.length ?? 0))
      .catch(() => setDeckCount(0));
    void fetch("/api/multiplayer/status", { headers, cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json())
      .then((payload) => {
        setOnlineReady(Boolean(payload.hasActiveDeck));
        setRealtimeUrl(payload.realtimeUrl ?? "");
      })
      .catch(() => setOnlineReady(false));
  }, [accessToken, refreshProfile, user]);

  const stats = [
    ["Coins", profile?.coins ?? 0],
    ["Owned Cards", ownedCards],
    ["Decks", deckCount],
    ["Wins", profile?.wins ?? 0],
  ];

  return (
    <AuthGate>
      <main className="page-enter mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">Dashboard</h1>
            <p className="mt-2 text-slate-600">Logged in as {profile?.username ?? "Player"}.</p>
          </div>
          <div className="version-pulse rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">
            Version 1.0
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([label, value]) => (
            <section key={label} className="dashboard-stat-count rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-black">{value}</p>
            </section>
          ))}
        </div>
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">Next Actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/packs" className="rounded-md bg-rose-600 px-4 py-2 text-sm font-black text-white">Open Packs</Link>
            <Link href="/decks" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-black">Build Deck</Link>
            <Link href="/collection" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-black">View Collection</Link>
          </div>
        </section>
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">Online Status</h2>
          <p className="mt-2 text-sm font-bold text-slate-600">
            {onlineReady ? "Ready for closed-alpha multiplayer." : "Save one legal active deck before queueing online."}
          </p>
          {realtimeUrl ? <p className="mt-1 text-xs font-bold text-slate-500">Realtime server: {realtimeUrl}</p> : null}
        </section>
      </main>
    </AuthGate>
  );
}
