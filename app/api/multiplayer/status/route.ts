import { NextResponse } from "next/server";
import { requireSupabaseUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const activeDeck = await auth.supabase
    .from("decks")
    .select("id, name")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (activeDeck.error) {
    return NextResponse.json({ error: activeDeck.error.message }, { status: 500 });
  }

  return NextResponse.json({
    realtimeUrl: process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:3001",
    hasActiveDeck: Boolean(activeDeck.data),
    activeDeck: activeDeck.data ?? null,
  });
}
