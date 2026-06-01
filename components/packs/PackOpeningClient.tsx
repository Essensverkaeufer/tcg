"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PackOpeningAnimation } from "@/components/packs/PackOpeningAnimation";
import type { CardTemplate } from "@/types/cards";

export function PackOpeningClient({ fallbackCards, packSlug, preview, rerollKey }: { fallbackCards: CardTemplate[]; packSlug: string; preview: boolean; rerollKey: string }) {
  const { accessToken, refreshProfile } = useAuth();
  const [animationKey, setAnimationKey] = useState(rerollKey || "initial");
  const [rerolling, setRerolling] = useState(false);
  const [error, setError] = useState("");
  const [cards, setCards] = useState<CardTemplate[]>(() => {
    if (typeof window === "undefined") return fallbackCards;
    if (preview) {
      sessionStorage.removeItem("lastPackOpening");
      document.cookie = "friend_tcg_last_pack=; path=/; max-age=0";
      return fallbackCards;
    }
    const stored = sessionStorage.getItem("lastPackOpening");
    const cookieStored = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("friend_tcg_last_pack="))
      ?.split("=")[1];
    const source = stored ?? (cookieStored ? decodeURIComponent(cookieStored) : "");
    if (!source) return fallbackCards;
    try {
      const parsed = JSON.parse(source) as { packSlug?: string; cards?: CardTemplate[] };
      if (parsed.packSlug === packSlug && Array.isArray(parsed.cards)) {
        document.cookie = "friend_tcg_last_pack=; path=/; max-age=0";
        return parsed.cards;
      }
    } catch {
      sessionStorage.removeItem("lastPackOpening");
    }
    return fallbackCards;
  });

  async function rerollPurchasedPack() {
    if (preview) {
      const url = new URL(window.location.href);
      url.searchParams.set("reroll", String(Date.now()));
      window.location.href = url.toString();
      return;
    }

    setRerolling(true);
    setError("");

    try {
      const response = await fetch("/api/packs/open", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: "same-origin",
        body: JSON.stringify({ packSlug }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not reroll pack.");

      sessionStorage.setItem("lastPackOpening", JSON.stringify({ packSlug, cards: payload.cards }));
      setCards(payload.cards);
      setAnimationKey(String(Date.now()));
      await refreshProfile();

      const url = new URL(window.location.href);
      url.searchParams.set("source", "purchase");
      url.searchParams.set("reroll", String(Date.now()));
      window.history.replaceState(null, "", url.toString());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not reroll pack.");
    } finally {
      setRerolling(false);
    }
  }

  return (
    <>
      {error ? <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div> : null}
      <PackOpeningAnimation key={animationKey} cards={cards} packSlug={packSlug} preview={preview} rerolling={rerolling} onReroll={() => void rerollPurchasedPack()} />
    </>
  );
}
