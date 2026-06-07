import { NextResponse } from "next/server";
import { z } from "zod";
import { getStoryEncounter } from "@/lib/game/story/config";
import { requireSupabaseUser } from "@/lib/supabase/auth";

const completeSchema = z.object({
  encounterSlug: z.string().min(1),
  result: z.enum(["WIN", "LOSS"]),
  turns: z.number().int().positive().max(500).optional(),
});

export async function POST(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const parsed = completeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid story completion payload." }, { status: 400 });
  }

  const encounter = getStoryEncounter(parsed.data.encounterSlug);
  if (!encounter) {
    return NextResponse.json({ error: "Unknown story encounter." }, { status: 404 });
  }

  if (encounter.requiredPreviousSlug) {
    const previous = await auth.supabase
      .from("story_progress")
      .select("status")
      .eq("user_id", auth.user.id)
      .eq("encounter_slug", encounter.requiredPreviousSlug)
      .eq("status", "COMPLETED")
      .maybeSingle();

    if (previous.error) {
      return NextResponse.json({ error: previous.error.message }, { status: 500 });
    }
    if (!previous.data) {
      return NextResponse.json({ error: "Previous story encounter is not complete yet." }, { status: 403 });
    }
  }

  const existing = await auth.supabase
    .from("story_progress")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("encounter_slug", encounter.slug)
    .maybeSingle();

  if (existing.error) {
    return NextResponse.json({ error: existing.error.message }, { status: 500 });
  }

  const current = existing.data;
  const won = parsed.data.result === "WIN";
  const bestTurns = won && parsed.data.turns
    ? current?.best_turns
      ? Math.min(current.best_turns, parsed.data.turns)
      : parsed.data.turns
    : current?.best_turns ?? null;

  const payload = {
    user_id: auth.user.id,
    encounter_slug: encounter.slug,
    status: won || current?.status === "COMPLETED" ? "COMPLETED" as const : "ATTEMPTED" as const,
    wins: (current?.wins ?? 0) + (won ? 1 : 0),
    losses: (current?.losses ?? 0) + (won ? 0 : 1),
    best_turns: bestTurns,
    completed_at: won ? current?.completed_at ?? new Date().toISOString() : current?.completed_at ?? null,
  };

  const saved = await auth.supabase
    .from("story_progress")
    .upsert(payload, { onConflict: "user_id,encounter_slug" })
    .select("*")
    .single();

  if (saved.error) {
    return NextResponse.json({ error: saved.error.message }, { status: 500 });
  }

  return NextResponse.json({ progress: saved.data });
}
