import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { extensionFromFile, imageMimeTypes, maxCardMediaBytes, parseAbilityJson, slugifyCardName, soundMimeTypes } from "@/lib/game/card-submissions";
import { rarityValues } from "@/lib/game/rarities";
import { requireSupabaseUser } from "@/lib/supabase/auth";
import type { Database, Json } from "@/types/supabase";

export const dynamic = "force-dynamic";

const cardFormSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().default(""),
  rarity: z.enum(rarityValues),
  cardType: z.enum(["CHARACTER", "BUILDING", "ITEM", "LEADER"]),
  attack: z.coerce.number().int().min(0),
  health: z.coerce.number().int().min(0),
  size: z.coerce.number().int().min(0),
  aura: z.coerce.number().int().min(0),
  flavorText: z.string().default(""),
  abilityJson: z.string().default("[]"),
});

export async function GET(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("card_template_submissions")
    .select("*")
    .eq("submitter_id", auth.user.id)
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ submissions: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid card submission." }, { status: 400 });
  }

  const parsed = cardFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid card submission fields." }, { status: 400 });
  }

  let abilityData;
  try {
    abilityData = parseAbilityJson(parsed.data.abilityJson);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid ability JSON." }, { status: 400 });
  }

  const slug = await generateUniqueSlug(auth.supabase, parsed.data.name);
  const imageFile = readOptionalFile(formData, "image");
  const soundFile = readOptionalFile(formData, "sound");
  const uploadedPaths: string[] = [];

  try {
    const image = imageFile ? await uploadSubmissionFile(auth.supabase, auth.user.id, slug, imageFile, "image") : undefined;
    if (image?.path) uploadedPaths.push(image.path);
    const sound = soundFile ? await uploadSubmissionFile(auth.supabase, auth.user.id, slug, soundFile, "sound") : undefined;
    if (sound?.path) uploadedPaths.push(sound.path);

    const insert = await auth.supabase
      .from("card_template_submissions")
      .insert({
        submitter_id: auth.user.id,
        slug,
        name: parsed.data.name.trim(),
        description: parsed.data.description,
        rarity: parsed.data.rarity,
        card_type: parsed.data.cardType,
        attack: parsed.data.attack,
        health: parsed.data.health,
        size: parsed.data.size,
        aura: parsed.data.aura,
        image_url: image?.publicUrl ?? "",
        image_path: image?.path ?? null,
        sound_effect_url: sound?.publicUrl ?? "",
        sound_effect_path: sound?.path ?? null,
        flavor_text: parsed.data.flavorText,
        ability_data: abilityData as Json,
      })
      .select("*")
      .single();

    if (insert.error) {
      await removeUploaded(uploadedPaths, auth.supabase);
      return NextResponse.json({ error: insert.error.message }, { status: 500 });
    }

    return NextResponse.json({ submission: insert.data });
  } catch (error) {
    await removeUploaded(uploadedPaths, auth.supabase);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not submit card." }, { status: 500 });
  }
}

function readOptionalFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : undefined;
}

async function uploadSubmissionFile(
  supabase: SupabaseClient<Database>,
  userId: string,
  slug: string,
  file: File,
  kind: "image" | "sound",
) {
  if (file.size > maxCardMediaBytes) throw new Error(`${kind === "image" ? "Card art" : "Sound file"} must be 10 MB or smaller.`);
  if (kind === "image" && !imageMimeTypes.has(file.type)) throw new Error("Card art must be a PNG, JPG, WEBP, or GIF.");
  if (kind === "sound" && !soundMimeTypes.has(file.type)) throw new Error("Sound file must be MP3, OGG, WAV, M4A, or WEBM.");

  const extension = extensionFromFile(file, kind === "image" ? "webp" : "mp3");
  const folder = kind === "image" ? "images" : "sounds";
  const path = `submissions/${userId}/${folder}/${slug}-${Date.now()}.${extension}`;
  const upload = await supabase.storage.from("card-art").upload(path, Buffer.from(await file.arrayBuffer()), {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) throw new Error(upload.error.message);

  const { data } = supabase.storage.from("card-art").getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

async function generateUniqueSlug(
  supabase: SupabaseClient<Database>,
  name: string,
) {
  const baseSlug = slugifyCardName(name);
  const [cards, submissions] = await Promise.all([
    supabase.from("card_templates").select("slug").ilike("slug", `${baseSlug}%`),
    supabase.from("card_template_submissions").select("slug").ilike("slug", `${baseSlug}%`),
  ]);

  if (cards.error) throw new Error(cards.error.message);
  if (submissions.error) throw new Error(submissions.error.message);

  const existing = new Set([
    ...(cards.data ?? []).map((entry) => entry.slug),
    ...(submissions.data ?? []).map((entry) => entry.slug),
  ]);

  if (!existing.has(baseSlug)) return baseSlug;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${baseSlug}-${index}`;
    if (!existing.has(candidate)) return candidate;
  }
  throw new Error("Could not create a unique slug for this card name.");
}

async function removeUploaded(
  paths: string[],
  supabase: SupabaseClient<Database>,
) {
  if (paths.length === 0) return;
  await supabase.storage.from("card-art").remove(paths).catch(() => undefined);
}
