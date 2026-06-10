import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { isAdminUsername } from "@/lib/admin";
import { validateAbilityData } from "@/lib/game/card-submissions";
import { rarityValues } from "@/lib/game/rarities";
import { normalizeTraits } from "@/lib/game/traits";
import { requireSupabaseUser } from "@/lib/supabase/auth";
import type { Database, Json } from "@/types/supabase";

export const dynamic = "force-dynamic";

const reviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("deny") }),
  z.object({
    action: z.literal("approve"),
    card: z.object({
      slug: z.string().min(1),
      name: z.string().min(1).max(80),
      description: z.string().default(""),
      rarity: z.enum(rarityValues),
      cardType: z.enum(["CHARACTER", "BUILDING", "ITEM", "LEADER"]),
      attack: z.number().int().min(0),
      health: z.number().int().min(0),
      size: z.number().int().min(0),
      aura: z.number().int().min(0),
      imageUrl: z.string().default(""),
      soundEffectUrl: z.string().default(""),
      flavorText: z.string().default(""),
      traits: z.array(z.string()).default([]),
      abilityData: z.array(z.unknown()).default([]),
    }),
  }),
]);

export async function PATCH(request: Request, context: RouteContext<"/api/admin/card-submissions/[id]">) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const profile = await auth.supabase.from("profiles").select("username").eq("id", auth.user.id).single();
  if (profile.error) return NextResponse.json({ error: profile.error.message }, { status: 500 });
  if (!isAdminUsername(profile.data.username)) {
    return NextResponse.json({ error: "Card review is only available for essens and essens2." }, { status: 403 });
  }

  const { id } = await context.params;
  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review payload." }, { status: 400 });
  }

  const submission = await auth.supabase
    .from("card_template_submissions")
    .select("*")
    .eq("id", id)
    .eq("status", "PENDING")
    .maybeSingle();

  if (submission.error) return NextResponse.json({ error: submission.error.message }, { status: 500 });
  if (!submission.data) return NextResponse.json({ error: "Pending submission not found." }, { status: 404 });

  if (parsed.data.action === "deny") {
    const deleted = await auth.supabase.from("card_template_submissions").delete().eq("id", id);
    if (deleted.error) return NextResponse.json({ error: deleted.error.message }, { status: 500 });
    await removeSubmissionFiles(auth.supabase, submission.data);
    return NextResponse.json({ ok: true });
  }

  let abilityData;
  try {
    abilityData = validateAbilityData(parsed.data.card.abilityData);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid ability JSON." }, { status: 400 });
  }

  const card = parsed.data.card;
  let approvedImage;
  let approvedSound;
  try {
    approvedImage = card.imageUrl === submission.data.image_url
      ? await finalizeSubmissionFile(auth.supabase, submission.data.image_path, card.slug, "image")
      : undefined;
    approvedSound = card.soundEffectUrl === submission.data.sound_effect_url
      ? await finalizeSubmissionFile(auth.supabase, submission.data.sound_effect_path, card.slug, "sound")
      : undefined;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not finalize submitted files." }, { status: 500 });
  }

  const saved = await auth.supabase.from("card_templates").upsert(
    {
      slug: card.slug,
      name: card.name,
      description: card.description,
      rarity: card.rarity,
      card_type: card.cardType,
      attack: card.attack,
      health: card.health,
      size: card.size,
      aura: card.aura,
      image_url: approvedImage?.publicUrl ?? card.imageUrl,
      sound_effect_url: approvedSound?.publicUrl ?? card.soundEffectUrl ?? "",
      flavor_text: card.flavorText,
      traits: normalizeTraits(card.traits),
      ability_data: abilityData as Json,
      balance_version: "prototype-0.1",
    },
    { onConflict: "slug" },
  );

  if (saved.error) {
    return NextResponse.json({ error: saved.error.message }, { status: 500 });
  }

  const reviewed = await auth.supabase
    .from("card_template_submissions")
    .update({
      status: "APPROVED",
      reviewer_id: auth.user.id,
      reviewed_at: new Date().toISOString(),
      slug: card.slug,
      name: card.name,
      description: card.description,
      rarity: card.rarity,
      card_type: card.cardType,
      attack: card.attack,
      health: card.health,
      size: card.size,
      aura: card.aura,
      image_url: approvedImage?.publicUrl ?? card.imageUrl,
      image_path: approvedImage?.path ?? (card.imageUrl === submission.data.image_url ? submission.data.image_path : null),
      sound_effect_url: approvedSound?.publicUrl ?? card.soundEffectUrl ?? "",
      sound_effect_path: approvedSound?.path ?? (card.soundEffectUrl === submission.data.sound_effect_url ? submission.data.sound_effect_path : null),
      traits: normalizeTraits(card.traits),
      flavor_text: card.flavorText,
      ability_data: abilityData as Json,
    })
    .eq("id", id);

  if (reviewed.error) {
    return NextResponse.json({ error: reviewed.error.message }, { status: 500 });
  }

  await removeSubmissionFiles(auth.supabase, submission.data);
  return NextResponse.json({ ok: true });
}

async function finalizeSubmissionFile(
  supabase: SupabaseClient<Database>,
  sourcePath: string | null,
  slug: string,
  kind: "image" | "sound",
) {
  if (!sourcePath) return undefined;
  const extension = sourcePath.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || (kind === "image" ? "webp" : "mp3");
  const targetPath = kind === "image" ? `cards/${slug}.${extension}` : `sounds/${slug}.${extension}`;
  const downloaded = await supabase.storage.from("card-art").download(sourcePath);
  if (downloaded.error) throw new Error(downloaded.error.message);
  const uploaded = await supabase.storage.from("card-art").upload(targetPath, Buffer.from(await downloaded.data.arrayBuffer()), {
    cacheControl: "3600",
    contentType: downloaded.data.type || (kind === "image" ? "image/webp" : "audio/mpeg"),
    upsert: true,
  });
  if (uploaded.error) throw new Error(uploaded.error.message);
  const { data } = supabase.storage.from("card-art").getPublicUrl(targetPath);
  return { path: targetPath, publicUrl: data.publicUrl };
}

async function removeSubmissionFiles(
  supabase: SupabaseClient<Database>,
  submission: Database["public"]["Tables"]["card_template_submissions"]["Row"],
) {
  const paths = [submission.image_path, submission.sound_effect_path].filter((path): path is string => Boolean(path?.startsWith("submissions/")));
  if (paths.length === 0) return;
  await supabase.storage.from("card-art").remove(paths).catch(() => undefined);
}
