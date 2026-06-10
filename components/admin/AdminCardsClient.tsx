"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { CardFrame } from "@/components/cards/CardFrame";
import { isAdminUsername } from "@/lib/admin";
import { parseAbilityJson } from "@/lib/game/card-submissions";
import { cardRowToTemplate } from "@/lib/game/mapping";
import { rarityValues } from "@/lib/game/rarities";
import { formatTraitsForInput, parseTraitInput } from "@/lib/game/traits";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
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

type SubmissionRow = Database["public"]["Tables"]["card_template_submissions"]["Row"] & {
  submitterUsername?: string;
};

export function AdminCardsClient() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { accessToken, profile } = useAuth();
  const [cards, setCards] = useState<CardTemplate[]>([]);
  const [form, setForm] = useState<CardTemplate>(blankCard);
  const [abilityJson, setAbilityJson] = useState("[]");
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [grantBusy, setGrantBusy] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);

  const isAdmin = isAdminUsername(profile?.username);

  const loadCards = useCallback(async () => {
    const { data } = await supabase.from("card_templates").select("*").order("name");
    setCards((data ?? []).map(cardRowToTemplate));
  }, [supabase]);

  const loadSubmissions = useCallback(async () => {
    if (!accessToken) return;
    const response = await fetch("/api/admin/card-submissions", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const result = await response.json();
    if (response.ok) {
      setSubmissions(result.submissions ?? []);
    }
  }, [accessToken]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadCards();
      void loadSubmissions();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadCards, loadSubmissions]);

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

  async function uploadSound(file: File) {
    if (!["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/webm"].includes(file.type)) {
      setMessage("Sound must be MP3, OGG, WAV, M4A, or WEBM.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Sound must be 10 MB or smaller.");
      return;
    }

    const extension = file.name.split(".").pop() ?? "mp3";
    const safeSlug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const path = `sounds/${safeSlug}-${Date.now()}.${extension}`;
    const upload = await supabase.storage.from("card-art").upload(path, file, { upsert: true });
    if (upload.error) {
      setMessage(upload.error.message);
      return;
    }
    const { data } = supabase.storage.from("card-art").getPublicUrl(path);
    setForm((current) => ({ ...current, soundEffectUrl: data.publicUrl }));
  }

  async function saveCard() {
    if (!accessToken) return;
    let parsedAbilities: AbilityDefinition[];
    try {
      parsedAbilities = parseAbilityJson(abilityJson);
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

  async function approveSubmission() {
    if (!accessToken || !selectedSubmissionId || reviewBusy) return;
    let parsedAbilities: AbilityDefinition[];
    try {
      parsedAbilities = parseAbilityJson(abilityJson);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid ability JSON.");
      return;
    }

    setReviewBusy(true);
    const response = await fetch(`/api/admin/card-submissions/${selectedSubmissionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: "approve",
        card: { ...form, abilityData: parsedAbilities },
      }),
    });
    const result = await response.json();
    setReviewBusy(false);
    setMessage(response.ok ? "Submission approved and card saved." : result.error ?? "Could not approve submission.");
    if (response.ok) {
      setSelectedSubmissionId(null);
      setForm(blankCard);
      setAbilityJson("[]");
      await Promise.all([loadCards(), loadSubmissions()]);
    }
  }

  async function denySubmission() {
    if (!accessToken || !selectedSubmissionId || reviewBusy) return;
    setReviewBusy(true);
    const response = await fetch(`/api/admin/card-submissions/${selectedSubmissionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ action: "deny" }),
    });
    const result = await response.json();
    setReviewBusy(false);
    setMessage(response.ok ? "Submission denied and deleted." : result.error ?? "Could not deny submission.");
    if (response.ok) {
      setSelectedSubmissionId(null);
      setForm(blankCard);
      setAbilityJson("[]");
      await loadSubmissions();
    }
  }

  async function fillMissingCollection() {
    if (!accessToken || grantBusy) return;
    setGrantBusy(true);
    setMessage("Checking your collection...");
    const response = await fetch("/api/admin/collection/fill-missing", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const result = await response.json();
    setGrantBusy(false);
    setMessage(response.ok ? result.message ?? "Collection updated." : result.error ?? "Could not update collection.");
  }

  return (
    <AuthGate>
      {!isAdmin ? (
        <main className="page-enter mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <section className="rounded-lg border border-slate-200 bg-white p-8">
            <h1 className="text-2xl font-black">Admin locked</h1>
            <p className="mt-2 text-sm font-bold text-slate-600">Card editing is only available for essens and essens2.</p>
          </section>
        </main>
      ) : (
      <main className="page-enter mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px]">
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
            <input className="md:col-span-2 rounded-md border border-slate-300 px-3 py-2" placeholder="Traits, comma separated" value={formatTraitsForInput(form.traits)} onChange={(event) => setForm({ ...form, traits: parseTraitInput(event.target.value) })} />
            <input className="md:col-span-2 rounded-md border border-slate-300 px-3 py-2" placeholder="Image URL" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} />
            <input className="md:col-span-2 rounded-md border border-slate-300 px-3 py-2" placeholder="Sound Effect URL" value={form.soundEffectUrl ?? ""} onChange={(event) => setForm({ ...form, soundEffectUrl: event.target.value })} />
            <input className="md:col-span-2 rounded-md border border-slate-300 px-3 py-2" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && void uploadImage(event.target.files[0])} />
            <input className="md:col-span-2 rounded-md border border-slate-300 px-3 py-2" type="file" accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/x-wav,audio/mp4,audio/webm" onChange={(event) => event.target.files?.[0] && void uploadSound(event.target.files[0])} />
            <textarea className="md:col-span-2 min-h-40 rounded-md border border-slate-300 px-3 py-2 font-mono text-xs" value={abilityJson} onChange={(event) => setAbilityJson(event.target.value)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => void saveCard()} className="save-button-glow rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white">Save Card</button>
            {selectedSubmissionId ? (
              <>
                <button type="button" onClick={() => void approveSubmission()} disabled={reviewBusy} className="approve-stamp rounded-md bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
                  {reviewBusy ? "Reviewing..." : "Approve Suggestion"}
                </button>
                <button type="button" onClick={() => void denySubmission()} disabled={reviewBusy} className="deny-stamp rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-black text-rose-900 disabled:cursor-not-allowed disabled:opacity-50">
                  Deny Suggestion
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => void fillMissingCollection()}
              disabled={grantBusy}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {grantBusy ? "Checking..." : "Add Missing Cards x2"}
            </button>
          </div>
          {message ? <p className="mt-3 rounded-md bg-slate-100 p-3 text-sm font-bold text-slate-700">{message}</p> : null}
          <div className="mt-8 overflow-hidden rounded-lg border border-slate-200">
            <div className="bg-slate-100 p-4 text-sm font-black">Pending Suggestions</div>
            {submissions.length ? submissions.map((submission) => (
              <button
                key={submission.id}
                type="button"
                onClick={() => {
                  setSelectedSubmissionId(submission.id);
                  setForm(submissionToCard(submission));
                  setAbilityJson(JSON.stringify(Array.isArray(submission.ability_data) ? submission.ability_data : [], null, 2));
                }}
                className="grid w-full gap-2 border-b border-slate-100 p-4 text-left text-sm last:border-b-0 sm:grid-cols-[1fr_120px_120px_100px]"
              >
                <strong>{submission.name}</strong>
                <span>{submission.rarity}</span>
                <span>{submission.card_type}</span>
                <span>{submission.submitterUsername ?? "Unknown"}</span>
              </button>
            )) : (
              <p className="p-4 text-sm font-bold text-slate-500">No pending suggestions.</p>
            )}
          </div>
          <div className="mt-8 overflow-hidden rounded-lg border border-slate-200">
            {cards.map((card) => (
              <button key={card.slug} type="button" onClick={() => { setSelectedSubmissionId(null); setForm(card); setAbilityJson(JSON.stringify(card.abilityData, null, 2)); }} className="history-row-slide grid w-full gap-2 border-b border-slate-100 p-4 text-left text-sm last:border-b-0 sm:grid-cols-[1fr_120px_120px_80px]">
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
          <div className="preview-crossfade">
            <CardFrame card={form.name ? form : { ...blankCard, name: "Preview Card", slug: "preview" }} />
          </div>
        </aside>
      </main>
      )}
    </AuthGate>
  );
}

function submissionToCard(submission: SubmissionRow): CardTemplate {
  return {
    slug: submission.slug,
    name: submission.name,
    description: submission.description,
    flavorText: submission.flavor_text ?? "",
    rarity: submission.rarity,
    cardType: submission.card_type,
    attack: submission.attack,
    health: submission.health,
    size: submission.size,
    aura: submission.aura,
    traits: Array.isArray(submission.traits) ? submission.traits : [],
    imageUrl: submission.image_url,
    soundEffectUrl: submission.sound_effect_url,
    abilityData: Array.isArray(submission.ability_data) ? submission.ability_data as CardTemplate["abilityData"] : [],
  };
}
