import { NextResponse } from "next/server";
import { requireSupabaseUser } from "@/lib/supabase/auth";
import { ensureProfileForUser } from "@/lib/supabase/profile";

export async function POST(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const { profile, error } = await ensureProfileForUser(auth.supabase, auth.user);
  if (error || !profile) {
    return NextResponse.json({ error: error?.message ?? "Could not repair profile." }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
