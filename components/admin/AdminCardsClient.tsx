"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { CardFrame } from "@/components/cards/CardFrame";
import { cardRowToTemplate } from "@/lib/game/mapping";
import { rarityValues } from "@/lib/game/rarities";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { AbilityDefinition, CardTemplate, CardType, Rarity } from "@/types/cards";

const blankCard: CardTemplate = {
  slug: "",
  name: "",
  description: "",
  flavorText: "",
  rarity: "COMMON",
  cardType: "CHARACTER",
  attack: 0,
  health: 0,
  size: 0,
  aura: 0,
  imageUrl: "",
  abilityData: [],
};

export function AdminCardsClient() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { accessToken, profile } = useAuth();
  const [cards, setCards] = useState<CardTemplate[]>([]);
  const [form, setForm] = useState<CardTemplate>(blankCard);
  const [abilityJson, setAbilityJson] = useState("[]");
  const [message, setMessage] = useState("");

  const loadCards = useCallback(async () => {
    const { data } = await supabase.from("card_templates").select("*").order("name");
    setCards((data ?? []).map(cardRowToTemplate));
  }, [supabase]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadCards();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadCards]);

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setMessage("Card art must be an image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Card art must be 10 MB or smaller.");
      return;
    }

    const extension = file.name.split(".").pop() ?? "webp";
    const safeSlug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const path = `cards/${safeSlug}-${Date.now()}.${extension}`;
    const upload = await supabase.storage.from("card-art").upload(path, file, { upsert: true });
    if (upload.error) {
      setMessage(upload.error.message);
      return;
    }
    const { data } = supabase.storage.from("card-art").getPublicUrl(path);
    setForm((current) => ({ ...current, imageUrl: data.publicUrl }));
  }

  async function saveCard() {
    if (!accessToken) return;
    let parsedAbilities: AbilityDefinition[];
    try {
      parsedAbilities = JSON.parse(abilityJson) as AbilityDefinition[];
      if (!Array.isArray(parsedAbilities)) throw new Error("Ability JSON must be an array.");
      for (const ability of parsedAbilities) {
        if (!ability || typeof ability !== "object") throw new Error("Each ability must be an object.");
        if (typeof ability.id !== "string" || typeof ability.label !== "string" || typeof ability.trigger !== "string") {
          throw new Error("Each ability needs id, label, and trigger.");
        }
        if (!Array.isArray(ability.effects)) throw new Error("Each ability needs an effects array.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid ability JSON.");
      return;
    }

    const payload = { ...form, abilityData: parsedAbilities };
    const response = await fetch("/api/admin/cards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setMessage(response.ok ? "Card saved." : result.error ?? "Could not save card.");
    if (response.ok) {
      await loadCards();
    }
  }

  return (
    <AuthGate>
      {profile?.username !== "essens" ? (
        <main className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <section className="rounded-lg border border-slate-200 bg-white p-8">
            <h1 className="text-2xl font-black">Admin locked</h1>
            <p className="mt-2 text-sm font-bold text-slate-600">Card editing is only available for essens.</p>
          </section>
        </main>
      ) : (
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h1 className="text-3xl font-black">Admin Card Editor</h1>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            <select className="rounded-md border border-slate-300 px-3 py-2" value={form.cardType} onChange={(event) => setForm({ ...form, cardType: event.target.value as CardType })}>
              {["CHARACTER", "BUILDING", "ITEM", "LEADER"].map((value) => <option key={value}>{value}</option>)}
            </select>
            <select className="rounded-md border border-slate-300 px-3 py-2" value={form.rarity} onChange={(event) => setForm({ ...form, rarity: event.target.value as Rarity })}>
              {rarityValues.map((value) => <option key={value}>{value}</option>)}
            </select>
            {(["attack", "health", "size", "aura"] as const).map((field) => (
              <input key={field} className="rounded-md border border-slate-300 px-3 py-2" type="number" min={0} placeholder={field} value={form[field]} onChange={(event) => setForm({ ...form, [field]: Number(event.target.value) })} />
            ))}
            <textarea className="md:col-span-2 rounded-md border border-slate-300 px-3 py-2" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <textarea className="md:col-span-2 rounded-md border border-slate-300 px-3 py-2" placeholder="Flavor text" value={form.flavorText} onChange={(event) => setForm({ ...form, flavorText: event.target.value })} />
            <input className="md:col-span-2 rounded-md border border-slate-300 px-3 py-2" placeholder="Image URL" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} />
            <input className="md:col-span-2 rounded-md border border-slate-300 px-3 py-2" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && void uploadImage(event.target.files[0])} />
            <textarea className="md:col-span-2 min-h-40 rounded-md border border-slate-300 px-3 py-2 font-mono text-xs" value={abilityJson} onChange={(event) => setAbilityJson(event.target.value)} />
          </div>
          <button type="button" onClick={() => void saveCard()} className="mt-4 rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white">Save Card</button>
          {message ? <p className="mt-3 rounded-md bg-slate-100 p-3 text-sm font-bold text-slate-700">{message}</p> : null}
          <div className="mt-8 overflow-hidden rounded-lg border border-slate-200">
            {cards.map((card) => (
              <button key={card.slug} type="button" onClick={() => { setForm(card); setAbilityJson(JSON.stringify(card.abilityData, null, 2)); }} className="grid w-full gap-2 border-b border-slate-100 p-4 text-left text-sm last:border-b-0 sm:grid-cols-[1fr_120px_120px_80px]">
                <strong>{card.name}</strong>
                <span>{card.cardType}</span>
                <span>{card.rarity}</span>
                <span>Aura {card.aura}</span>
              </button>
            ))}
          </div>
        </section>
        <aside>
          <h2 className="mb-3 text-lg font-black">Preview</h2>
          <CardFrame card={form.name ? form : { ...blankCard, name: "Preview Card", slug: "preview" }} />
        </aside>
      </main>
      )}
    </AuthGate>
  );
}
