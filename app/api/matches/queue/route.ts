import { NextResponse } from "next/server";
import { requireSupabaseUser } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const deck = await auth.supabase
    .from("decks")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (deck.error) {
    return NextResponse.json({ error: deck.error.message }, { status: 500 });
  }

  if (!deck.data) {
    return NextResponse.json({ error: "Save an active deck before matchmaking." }, { status: 400 });
  }

  return NextResponse.json({
    status: "not_implemented",
    note: "Online matchmaking is not live yet. Use the local battle sandbox for now.",
  }, { status: 501 });
}
