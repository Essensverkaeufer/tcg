import { NextResponse } from "next/server";
import { isAdminUsername } from "@/lib/admin";
import { cardCatalog } from "@/lib/game/cards";
import { cardTemplateToInsert } from "@/lib/game/mapping";
import { requireSupabaseUser } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const profile = await auth.supabase.from("profiles").select("username").eq("id", auth.user.id).single();
  if (profile.error) {
    return NextResponse.json({ error: profile.error.message }, { status: 500 });
  }
  if (!isAdminUsername(profile.data.username)) {
    return NextResponse.json({ error: "Card sync is only available for essens and essens2." }, { status: 403 });
  }

  const rows = cardCatalog.map(cardTemplateToInsert);
  const { error } = await auth.supabase.from("card_templates").upsert(rows, { onConflict: "slug" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ synced: rows.length });
}
