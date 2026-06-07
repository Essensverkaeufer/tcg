import { NextResponse } from "next/server";
import { getStoryStatus, storyEncounters } from "@/lib/game/story/config";
import { isStoryTesterUsername } from "@/lib/game/story/testing";
import { requireSupabaseUser } from "@/lib/supabase/auth";

export async function GET(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const progress = await auth.supabase
    .from("story_progress")
    .select("*")
    .eq("user_id", auth.user.id);

  if (progress.error) {
    return NextResponse.json({ error: progress.error.message }, { status: 500 });
  }

  const rows = progress.data ?? [];
  const completed = new Set(rows.filter((row) => row.status === "COMPLETED").map((row) => row.encounter_slug));
  const bySlug = new Map(rows.map((row) => [row.encounter_slug, row]));
  const profile = await auth.supabase.from("profiles").select("username").eq("id", auth.user.id).maybeSingle();
  const hasTesterAccess = isStoryTesterUsername(profile.data?.username);

  return NextResponse.json({
    encounters: storyEncounters.map((encounter) => {
      const row = bySlug.get(encounter.slug);
      return {
        ...encounter,
        status: hasTesterAccess && row?.status !== "COMPLETED" ? "UNLOCKED" : getStoryStatus(encounter, completed),
        wins: row?.wins ?? 0,
        losses: row?.losses ?? 0,
        bestTurns: row?.best_turns ?? null,
        completedAt: row?.completed_at ?? null,
      };
    }),
    testingAccess: hasTesterAccess,
  });
}
