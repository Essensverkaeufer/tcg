"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { CardFrame } from "@/components/cards/CardFrame";
import { cardSortOptions, sortCardEntries, type CardSortKey, type SortDirection } from "@/lib/game/card-sorting";
import { getCraftCost, getConvertibleCopies } from "@/lib/game/duplicates";
import { rarityValues } from "@/lib/game/rarities";
import { getVisibleTraits } from "@/lib/game/traits";
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
  const [craftable, setCraftable] = useState<CardTemplate[]>([]);
  const [duplicateCredits, setDuplicateCredits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState<Rarity | "ALL">("ALL");
  const [cardType, setCardType] = useState<CardType | "ALL">("ALL");
  const [trait, setTrait] = useState("ALL");
  const [sortKey, setSortKey] = useState<CardSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const loadCollection = useCallback(async (cancelled?: () => boolean) => {
    if (!user) return;
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
      if (cancelled?.()) return;
      setEntries((payload.entries ?? []) as CollectionEntry[]);
      setCraftable((payload.craftable ?? []) as CardTemplate[]);
      setDuplicateCredits(payload.duplicateCredits ?? 0);
    } catch (error) {
      if (!cancelled?.()) {
        setError(error instanceof Error ? error.message : "Could not load collection.");
        setEntries([]);
        setCraftable([]);
      }
    } finally {
      if (!cancelled?.()) setLoading(false);
    }
  }, [accessToken, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const id = window.setTimeout(() => {
      void loadCollection(() => cancelled);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [loadCollection, user]);

  const traitOptions = useMemo(() => {
    const values = new Set<string>();
    for (const entry of entries) getVisibleTraits(entry.card).forEach((value) => values.add(value));
    for (const card of craftable) getVisibleTraits(card).forEach((value) => values.add(value));
    return ["ALL", ...Array.from(values).sort()];
  }, [craftable, entries]);

  const filtered = useMemo(() => {
    const matchingEntries = entries.filter((entry) => {
      const matchesSearch = entry.card.name.toLowerCase().includes(search.toLowerCase());
      const matchesRarity = rarity === "ALL" || entry.card.rarity === rarity;
      const matchesType = cardType === "ALL" || entry.card.cardType === cardType;
      const matchesTrait = trait === "ALL" || getVisibleTraits(entry.card).includes(trait);
      return matchesSearch && matchesRarity && matchesType && matchesTrait;
    });
    return sortCardEntries(matchingEntries, sortKey, sortDirection);
  }, [cardType, entries, rarity, search, sortDirection, sortKey, trait]);

  const craftableFiltered = useMemo(() => {
    return craftable
      .filter((card) => {
        const matchesSearch = card.name.toLowerCase().includes(search.toLowerCase());
        const matchesRarity = rarity === "ALL" || card.rarity === rarity;
        const matchesType = cardType === "ALL" || card.cardType === cardType;
        const matchesTrait = trait === "ALL" || getVisibleTraits(card).includes(trait);
        return matchesSearch && matchesRarity && matchesType && matchesTrait;
      })
      .sort((left, right) => getCraftCost(left) - getCraftCost(right))
      .slice(0, 12);
  }, [cardType, craftable, rarity, search, trait]);

  async function convertExtras() {
    if (!accessToken || busy) return;
    setBusy(true);
    setActionMessage("Converting extra copies...");
    const response = await fetch("/api/collection/convert-duplicates", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = await response.json();
    setBusy(false);
    setActionMessage(response.ok ? `Converted extras for ${payload.credits ?? 0} credits.` : payload.error ?? "Could not convert extras.");
    if (response.ok) await loadCollection();
  }

  async function craftCard(card: CardTemplate) {
    if (!accessToken || busy) return;
    setBusy(true);
    setActionMessage(`Crafting ${card.name}...`);
    const response = await fetch("/api/collection/craft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ cardSlug: card.slug }),
    });
    const payload = await response.json();
    setBusy(false);
    setActionMessage(response.ok ? `Crafted ${card.name} for ${payload.cost ?? getCraftCost(card)} credits.` : payload.error ?? "Could not craft card.");
    if (response.ok) await loadCollection();
  }

  return (
    <AuthGate>
      <main className="page-enter mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Collection</h1>
            <p className="mt-2 text-slate-600">Cards you own from pack openings.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold">{entries.length} owned templates</div>
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-black text-amber-900">{duplicateCredits} crafting credits</div>
          </div>
        </div>
        <div className="mb-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-6">
          <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="Search cards" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="rounded-md border border-slate-300 px-3 py-2" value={rarity} onChange={(event) => setRarity(event.target.value as Rarity | "ALL")}>
            {rarityOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2" value={cardType} onChange={(event) => setCardType(event.target.value as CardType | "ALL")}>
            {typeOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2" value={trait} onChange={(event) => setTrait(event.target.value)}>
            {traitOptions.map((option) => <option key={option} value={option}>{option === "ALL" ? "ALL TRAITS" : option.replace(/_/g, " ")}</option>)}
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={sortKey}
            onChange={(event) => {
              const nextSort = event.target.value as CardSortKey;
              setSortKey(nextSort);
              setSortDirection(nextSort === "name" ? "asc" : "desc");
            }}
          >
            {cardSortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2" value={sortDirection} onChange={(event) => setSortDirection(event.target.value as SortDirection)}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Duplicate Progression</h2>
              <p className="mt-1 text-sm font-bold text-slate-600">Convert extra copies into capped crafting credits, then craft missing drop-enabled cards.</p>
            </div>
            <button type="button" onClick={() => void convertExtras()} disabled={busy} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Working..." : "Convert Extras"}
            </button>
          </div>
          {actionMessage ? <p className="mt-3 rounded-md bg-slate-100 p-3 text-sm font-bold text-slate-700">{actionMessage}</p> : null}
          {craftableFiltered.length ? (
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {craftableFiltered.map((card) => {
                const cost = getCraftCost(card);
                return (
                  <div key={card.slug} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div>
                      <div className="font-black">{card.name}</div>
                      <div className="text-xs font-bold text-slate-500">{card.rarity} | {cost} credits</div>
                    </div>
                    <button type="button" onClick={() => void craftCard(card)} disabled={busy || duplicateCredits < cost} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-40">
                      Craft
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-md border border-dashed border-slate-300 p-3 text-sm font-bold text-slate-500">No missing craftable cards match these filters.</p>
          )}
        </section>
        {error ? (
          <div className="soft-shake rounded-lg border border-rose-200 bg-rose-50 p-8 text-center text-sm font-bold text-rose-700">
            {error}
          </div>
        ) : loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-600">
            Loading collection...
          </div>
        ) : filtered.length === 0 ? (
          <div className="soft-shimmer rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-600">
            No owned cards match this view. Open packs to build your collection.
          </div>
        ) : (
          <div className="animated-grid grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((entry, index) => (
              <div key={entry.card.slug} className="stagger-card transition duration-200 hover:-translate-y-1" style={{ animationDelay: `${Math.min(index, 16) * 42}ms` }}>
                <div className="mb-2 flex justify-end">
                  <span className="owned-badge-bump rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white shadow-sm">Owned x{entry.quantity}</span>
                  {getConvertibleCopies(entry.card, entry.quantity) > 0 ? <span className="ml-2 rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-950">Extra x{getConvertibleCopies(entry.card, entry.quantity)}</span> : null}
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
