import { NextResponse } from "next/server";
import { z } from "zod";
import { rarityValues } from "@/lib/game/rarities";
import { requireSupabaseUser } from "@/lib/supabase/auth";
import type { Json } from "@/types/supabase";

const cardSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  rarity: z.enum(rarityValues),
  cardType: z.enum(["CHARACTER", "BUILDING", "ITEM", "LEADER"]),
  attack: z.number().int().min(0),
  health: z.number().int().min(0),
  size: z.number().int().min(0),
  aura: z.number().int().min(0),
  imageUrl: z.string().default(""),
  flavorText: z.string().default(""),
  abilityData: z.array(z.unknown()).default([]),
});

export async function POST(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const profile = await auth.supabase.from("profiles").select("username").eq("id", auth.user.id).single();
  if (profile.error) {
    return NextResponse.json({ error: profile.error.message }, { status: 500 });
  }
  if (profile.data.username !== "essens") {
    return NextResponse.json({ error: "Card admin is only available for essens." }, { status: 403 });
  }

  const parsed = cardSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid card payload." }, { status: 400 });
  }

  const card = parsed.data;
  const result = await auth.supabase.from("card_templates").upsert(
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
      image_url: card.imageUrl,
      flavor_text: card.flavorText,
      ability_data: card.abilityData as Json,
      balance_version: "prototype-0.1",
    },
    { onConflict: "slug" },
  );

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
