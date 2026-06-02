import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { claimDailyLoginRewardForUser, ensureProfileForUser } from "@/lib/supabase/profile";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { usernameToAuthEmail } from "@/lib/supabase/username";
import type { Database } from "@/types/supabase";

const loginSchema = z.object({
  username: z.string().min(3).max(24),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login data." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return NextResponse.json({ error: "Missing Supabase login config." }, { status: 500 });
  }

  const supabase = createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let email: string;
  try {
    email = usernameToAuthEmail(parsed.data.username);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid username." }, { status: 400 });
  }

  const result = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (result.error || !result.data.session) {
    return NextResponse.json({ error: result.error?.message ?? "Could not login." }, { status: 401 });
  }

  const serviceSupabase = createServiceSupabaseClient();
  const { profile: ensuredProfile, error: profileError } = await ensureProfileForUser(serviceSupabase, result.data.user);
  let profile = ensuredProfile;
  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? "Could not load profile." }, { status: 500 });
  }

  const dailyLogin = await claimDailyLoginRewardForUser(serviceSupabase, result.data.user.id);
  if (!dailyLogin.error && dailyLogin.coins !== null) {
    profile = { ...profile, coins: dailyLogin.coins };
  }

  const response = NextResponse.json({
    session: result.data.session,
    user: result.data.user,
    profile,
  });
  response.cookies.set("friend_tcg_access_token", result.data.session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: result.data.session.expires_in,
  });
  response.cookies.set("friend_tcg_refresh_token", result.data.session.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
