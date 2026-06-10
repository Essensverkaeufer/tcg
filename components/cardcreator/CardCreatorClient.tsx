"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { CardFrame } from "@/components/cards/CardFrame";
import { cardCreatorStatSuggestions, parseAbilityJson, slugifyCardName } from "@/lib/game/card-submissions";
import { rarityValues } from "@/lib/game/rarities";
import { formatTraitsForInput, parseTraitInput } from "@/lib/game/traits";
import type { AbilityDefinition, CardTemplate, CardType, Rarity } from "@/types/cards";
import type { Database } from "@/types/supabase";

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
  traits: [],
  imageUrl: "",
  soundEffectUrl: "",
  abilityData: [],
};

type Submission = Database["public"]["Tables"]["card_template_submissions"]["Row"];

export function CardCreatorClient() {
  const { accessToken } = useAuth();
  const [form, setForm] = useState<CardTemplate>(blankCard);
  const [abilityJson, setAbilityJson] = useState("[]");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [soundFile, setSoundFile] = useState<File | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const generatedSlug = slugifyCardName(form.name);
  const previewCard = {
    ...form,
    slug: generatedSlug,
    imageUrl: imageFile ? URL.createObjectURL(imageFile) : form.imageUrl,
  };

  const loadSubmissions = useCallback(async () => {
    if (!accessToken) return;
    const response = await fetch("/api/card-submissions", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const result = await response.json();
    if (response.ok) setSubmissions(result.submissions ?? []);
  }, [accessToken]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadSubmissions();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadSubmissions]);

  async function submitCard() {
    if (!accessToken || busy) return;
    let parsedAbilities: AbilityDefinition[];
    try {
      parsedAbilities = parseAbilityJson(abilityJson);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid ability JSON.");
      return;
    }

    const body = new FormData();
    body.set("name", form.name);
    body.set("description", form.description);
    body.set("rarity", form.rarity);
    body.set("cardType", form.cardType);
    body.set("attack", String(form.attack));
    body.set("health", String(form.health));
    body.set("size", String(form.size));
    body.set("aura", String(form.aura));
    body.set("traits", formatTraitsForInput(form.traits));
    body.set("flavorText", form.flavorText);
    body.set("abilityJson", JSON.stringify(parsedAbilities));
    if (imageFile) body.set("image", imageFile);
    if (soundFile) body.set("sound", soundFile);

    setBusy(true);
    setMessage("Sending card suggestion...");
    const response = await fetch("/api/card-submissions", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error ?? "Could not submit card.");
      return;
    }

    setMessage(`Card suggestion sent as ${result.submission?.slug ?? generatedSlug}.`);
    setForm(blankCard);
    setAbilityJson("[]");
    setImageFile(null);
    setSoundFile(null);
    await loadSubmissions();
  }

  return (
    <AuthGate>
      <main className="page-enter mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div>
            <h1 className="text-3xl font-black">Create Card</h1>
            <p className="mt-2 text-sm font-bold text-slate-600">Suggest a card for admin review. Approved cards enter the live card library.</p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <input className="rounded-md border border-slate-300 px-3 py-2" placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
              Slug: {generatedSlug}
            </div>
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
            <input className="md:col-span-2 rounded-md border border-slate-300 px-3 py-2" placeholder="Traits, comma separated" value={formatTraitsForInput(form.traits)} onChange={(event) => setForm({ ...form, traits: parseTraitInput(event.target.value) })} />
            <label className="md:col-span-2 rounded-md border border-dashed border-slate-300 px-3 py-3 text-sm font-bold text-slate-600">
              Card Art
              <input className="mt-2 block w-full" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} />
            </label>
            <label className="md:col-span-2 rounded-md border border-dashed border-slate-300 px-3 py-3 text-sm font-bold text-slate-600">
              Ability Sound
              <input className="mt-2 block w-full" type="file" accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/x-wav,audio/mp4,audio/webm" onChange={(event) => setSoundFile(event.target.files?.[0] ?? null)} />
            </label>
            <textarea className="md:col-span-2 min-h-40 rounded-md border border-slate-300 px-3 py-2 font-mono text-xs" value={abilityJson} onChange={(event) => setAbilityJson(event.target.value)} />
          </div>

          <section className="mt-6 overflow-hidden rounded-lg border border-slate-200">
            <div className="bg-slate-100 px-4 py-3 text-sm font-black">Rarity stat suggestions</div>
            <div className="grid grid-cols-5 gap-px bg-slate-200 text-center text-xs font-bold">
              <span className="bg-white p-2 text-left">Rarity</span>
              <span className="bg-white p-2">Max Attack</span>
              <span className="bg-white p-2">Max Health</span>
              <span className="bg-white p-2">Max Size</span>
              <span className="bg-white p-2">Max Aura</span>
              {rarityValues.map((rarity) => (
                <RaritySuggestionRow key={rarity} rarity={rarity} />
              ))}
            </div>
          </section>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void submitCard()} disabled={busy} className="save-button-glow rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Sending..." : "Submit Suggestion"}
            </button>
            {message ? <p className="text-sm font-bold text-slate-700">{message}</p> : null}
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-black">Your Suggestions</h2>
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
              {submissions.length ? submissions.map((submission) => (
                <div key={submission.id} className="grid gap-2 border-b border-slate-100 p-4 text-sm last:border-b-0 sm:grid-cols-[1fr_120px_120px]">
                  <strong>{submission.name}</strong>
                  <span>{submission.rarity}</span>
                  <span>{submission.status}</span>
                </div>
              )) : (
                <p className="p-4 text-sm font-bold text-slate-500">No suggestions yet.</p>
              )}
            </div>
          </section>
        </section>
        <aside>
          <h2 className="mb-3 text-lg font-black">Preview</h2>
          <div className="preview-crossfade">
            <CardFrame card={form.name ? previewCard : { ...blankCard, name: "Preview Card", slug: "preview" }} />
          </div>
        </aside>
      </main>
    </AuthGate>
  );
}

function RaritySuggestionRow({ rarity }: { rarity: Rarity }) {
  const stats = cardCreatorStatSuggestions[rarity];
  return (
    <>
      <span className="bg-white p-2 text-left">{rarity}</span>
      <span className="bg-white p-2">{stats.attack}</span>
      <span className="bg-white p-2">{stats.health}</span>
      <span className="bg-white p-2">{stats.size}</span>
      <span className="bg-white p-2">{stats.aura}</span>
    </>
  );
}
