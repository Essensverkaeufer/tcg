"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { CardFrame } from "@/components/cards/CardFrame";
import { DeckRulesPanel } from "@/components/deckbuilder/DeckRulesPanel";
import { cardSortOptions, sortCardEntries, type CardSortKey, type SortDirection } from "@/lib/game/card-sorting";
import { validateDeck } from "@/lib/game/decks/validateDeck";
import { rarityValues } from "@/lib/game/rarities";
import type { CardTemplate, CardType, Rarity } from "@/types/cards";

type OwnedCard = {
  id: string;
  quantity: number;
  card: CardTemplate;
};

type SavedDeck = {
  id: string;
  name: string;
  is_active: boolean;
  deck_cards?: Array<{ card_template_id: string; quantity: number }>;
};

const rarityOptions: Array<Rarity | "ALL"> = ["ALL", ...rarityValues];
const typeOptions: Array<CardType | "ALL"> = ["ALL", "CHARACTER", "BUILDING", "ITEM", "LEADER"];
const deckSortOptions = [...cardSortOptions, { value: "deck" as const, label: "Deck Count" }];

export function DeckBuilderClient() {
  const { user, accessToken } = useAuth();
  const [ownedCards, setOwnedCards] = useState<OwnedCard[]>([]);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [deckId, setDeckId] = useState("");
  const [deckName, setDeckName] = useState("My Deck");
  const [isActive, setIsActive] = useState(true);
  const [deck, setDeck] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState<Rarity | "ALL">("ALL");
  const [cardType, setCardType] = useState<CardType | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<CardSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const id = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setLoadError("");
        try {
          const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
          const [collectionResponse, decksResponse] = await Promise.all([
            fetch("/api/collection", { headers, cache: "no-store", credentials: "same-origin" }),
            fetch("/api/decks", { headers, cache: "no-store", credentials: "same-origin" }),
          ]);
          const collectionPayload = await collectionResponse.json();
          const decksPayload = await decksResponse.json();
          if (!collectionResponse.ok) throw new Error(collectionPayload.error ?? "Could not load owned cards.");
          if (!decksResponse.ok) throw new Error(decksPayload.error ?? "Could not load saved decks.");
          if (cancelled) return;
          setOwnedCards((collectionPayload.entries ?? []) as OwnedCard[]);
          const decks = (decksPayload.decks ?? []) as SavedDeck[];
          setSavedDecks(decks);
          const activeDeck = decks.find((saved) => saved.is_active) ?? decks[0];
          if (activeDeck) {
            loadSavedDeck(activeDeck);
          }
        } catch (error) {
          if (!cancelled) {
            setLoadError(error instanceof Error ? error.message : "Could not load deck builder.");
            setOwnedCards([]);
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

  const selectedCards = useMemo(() => {
    return Object.entries(deck)
      .map(([id, quantity]) => {
        const owned = ownedCards.find((card) => card.id === id);
        return owned ? { card: owned.card, quantity } : undefined;
      })
      .filter((entry): entry is { card: CardTemplate; quantity: number } => Boolean(entry));
  }, [deck, ownedCards]);

  const validation = validateDeck(selectedCards);
  const totalCards = selectedCards.reduce((sum, entry) => sum + entry.quantity, 0);
  const visibleOwnedCards = useMemo(() => {
    const matchingCards = ownedCards
      .filter((owned) => {
        const matchesSearch = owned.card.name.toLowerCase().includes(search.toLowerCase());
        const matchesRarity = rarity === "ALL" || owned.card.rarity === rarity;
        const matchesType = cardType === "ALL" || owned.card.cardType === cardType;
        return matchesSearch && matchesRarity && matchesType;
      })
      .map((owned) => ({ ...owned, deckQuantity: deck[owned.id] ?? 0 }));
    return sortCardEntries(matchingCards, sortKey, sortDirection);
  }, [cardType, deck, ownedCards, rarity, search, sortDirection, sortKey]);

  function addCard(id: string) {
    const owned = ownedCards.find((card) => card.id === id);
    if (!owned) return;
    setDeck((current) => {
      const next = Math.min(owned.quantity, (current[id] ?? 0) + 1);
      return { ...current, [id]: next };
    });
  }

  function removeCard(id: string) {
    setDeck((current) => {
      const next = Math.max(0, (current[id] ?? 0) - 1);
      const copy = { ...current };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  function loadSavedDeck(saved: SavedDeck) {
    setDeckId(saved.id);
    setDeckName(saved.name);
    setIsActive(saved.is_active);
    setDeck(Object.fromEntries((saved.deck_cards ?? []).map((card) => [card.card_template_id, card.quantity])));
    setMessage("");
  }

  async function saveDeck() {
    if (!accessToken) return;
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/decks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: deckName,
        deckId: deckId || undefined,
        isActive,
        cards: Object.entries(deck).map(([cardTemplateId, quantity]) => ({ cardTemplateId, quantity })),
      }),
    });
    const payload = await response.json();
    setSaving(false);
    setMessage(response.ok ? "Deck saved." : payload.error ?? "Could not save deck.");
    if (response.ok && payload.deck?.id) {
      setDeckId(payload.deck.id);
    }
  }

  return (
    <AuthGate>
      <main className="page-enter mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_340px]">
        <section>
          <h1 className="text-3xl font-black">Deck Builder</h1>
          <p className="mt-2 text-slate-600">Build from owned cards. Save validates ownership and deck legality on the server.</p>
          {loadError ? <div className="soft-shake mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{loadError}</div> : null}
          {loading ? <div className="mt-4 rounded-md border border-slate-200 bg-white p-3 text-sm font-bold text-slate-600">Loading deck builder...</div> : null}
          {savedDecks.length ? (
            <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
              <label className="text-sm font-black text-slate-600" htmlFor="saved-deck">Saved Deck</label>
              <select
                id="saved-deck"
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
                value={deckId}
                onChange={(event) => {
                  const saved = savedDecks.find((item) => item.id === event.target.value);
                  if (saved) loadSavedDeck(saved);
                }}
              >
                {savedDecks.map((saved) => (
                  <option key={saved.id} value={saved.id}>{saved.name}{saved.is_active ? " (active)" : ""}</option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto_auto]">
            <input className="rounded-md border border-slate-300 px-3 py-2" value={deckName} onChange={(event) => setDeckName(event.target.value)} />
            <label className="inline-flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Active
            </label>
            <button type="button" onClick={() => void saveDeck()} disabled={saving} className="save-button-glow rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:bg-slate-300">
              {saving ? "Saving..." : "Save Deck"}
            </button>
          </div>
          <button type="button" onClick={() => { setDeckId(""); setDeckName("My Deck"); setDeck({}); setIsActive(true); setMessage(""); }} className="mt-3 rounded-md border border-slate-300 px-4 py-2 text-sm font-black">
            New Deck
          </button>
          {message ? <div className="toast-slide mt-3 rounded-md bg-slate-100 p-3 text-sm font-bold text-slate-700">{message}</div> : null}
          <div className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-5">
            <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="Search cards" value={search} onChange={(event) => setSearch(event.target.value)} />
            <select className="rounded-md border border-slate-300 px-3 py-2" value={rarity} onChange={(event) => setRarity(event.target.value as Rarity | "ALL")}>
              {rarityOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
            <select className="rounded-md border border-slate-300 px-3 py-2" value={cardType} onChange={(event) => setCardType(event.target.value as CardType | "ALL")}>
              {typeOptions.map((option) => <option key={option}>{option}</option>)}
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
              {deckSortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select className="rounded-md border border-slate-300 px-3 py-2" value={sortDirection} onChange={(event) => setSortDirection(event.target.value as SortDirection)}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div className="animated-grid mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
            {visibleOwnedCards.map((owned, index) => (
              <div key={owned.id} className="stagger-card rounded-lg border border-slate-200 bg-white p-3 transition duration-200 hover:-translate-y-1" style={{ animationDelay: `${Math.min(index, 16) * 42}ms` }}>
                <CardFrame card={owned.card} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="deck-count-bump text-sm font-black">Owned {owned.quantity} | Deck {deck[owned.id] ?? 0}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => removeCard(owned.id)} className="bump-action h-8 w-8 rounded-md border border-slate-300 font-black">-</button>
                    <button type="button" onClick={() => addCard(owned.id)} className="bump-action h-8 w-8 rounded-md bg-slate-950 font-black text-white">+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-black">Current Deck</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">{totalCards} cards, minimum 10</p>
            <div className="mt-4 space-y-2">
              {selectedCards.map((entry) => (
                <div key={entry.card.slug} className="deck-row-pop flex items-center justify-between rounded-md bg-slate-100 p-2 text-sm">
                  <span className="font-bold">{entry.card.name}</span>
                  <span>x{entry.quantity}</span>
                </div>
              ))}
            </div>
            <div className={validation.valid ? "valid-deck-glow mt-4 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-700" : "soft-shake mt-4 rounded-md bg-rose-50 p-3 text-sm font-bold text-rose-700"}>
              {validation.valid ? "Deck is legal." : validation.errors[0] ?? "Deck needs cards."}
            </div>
          </section>
          <DeckRulesPanel />
        </aside>
      </main>
    </AuthGate>
  );
}
