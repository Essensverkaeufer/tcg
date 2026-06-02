"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { CardFrame } from "@/components/cards/CardFrame";
import { rarityValues } from "@/lib/game/rarities";
import type { CardTemplate, CardType, Rarity } from "@/types/cards";

type CollectionEntry = {
  id: string;
  quantity: number;
  card: CardTemplate;
};

const rarityOptions: Array<Rarity | "ALL"> = ["ALL", ...rarityValues];
const typeOptions: Array<CardType | "ALL"> = ["ALL", "CHARACTER", "BUILDING", "ITEM", "LEADER"];

export function CollectionClient() {
  const { user, accessToken } = useAuth();
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState<Rarity | "ALL">("ALL");
  const [cardType, setCardType] = useState<CardType | "ALL">("ALL");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const id = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch("/api/collection", {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
            cache: "no-store",
            credentials: "same-origin",
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error ?? "Could not load collection.");
          if (!cancelled) setEntries((payload.entries ?? []) as CollectionEntry[]);
        } catch (error) {
          if (!cancelled) {
            setError(error instanceof Error ? error.message : "Could not load collection.");
            setEntries([]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [accessToken, user]);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch = entry.card.name.toLowerCase().includes(search.toLowerCase());
      const matchesRarity = rarity === "ALL" || entry.card.rarity === rarity;
      const matchesType = cardType === "ALL" || entry.card.cardType === cardType;
      return matchesSearch && matchesRarity && matchesType;
    });
  }, [cardType, entries, rarity, search]);

  return (
    <AuthGate>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Collection</h1>
            <p className="mt-2 text-slate-600">Cards you own from pack openings.</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold">{entries.length} owned templates</div>
        </div>
        <div className="mb-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
          <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="Search cards" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="rounded-md border border-slate-300 px-3 py-2" value={rarity} onChange={(event) => setRarity(event.target.value as Rarity | "ALL")}>
            {rarityOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2" value={cardType} onChange={(event) => setCardType(event.target.value as CardType | "ALL")}>
            {typeOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </div>
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-center text-sm font-bold text-rose-700">
            {error}
          </div>
        ) : loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-600">
            Loading collection...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-600">
            No owned cards match this view. Open packs to build your collection.
          </div>
        ) : (
          <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((entry) => (
              <div key={entry.card.slug} className="transition duration-200 hover:-translate-y-1">
                <div className="mb-2 flex justify-end">
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white shadow-sm">Owned x{entry.quantity}</span>
                </div>
                <CardFrame card={entry.card} href={`/cards/${entry.card.slug}`} />
              </div>
            ))}
          </div>
        )}
      </main>
    </AuthGate>
  );
}
