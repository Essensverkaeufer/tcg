import { NextResponse } from "next/server";
import { claimDailyLoginRewardForUser, ensureProfileForUser } from "@/lib/supabase/profile";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const accessToken = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("friend_tcg_access_token="))
    ?.split("=")[1];

  if (!accessToken) {
    return NextResponse.json({ user: null, profile: null, accessToken: null }, { status: 401 });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.auth.getUser(decodeURIComponent(accessToken));
  if (error || !data.user) {
    return NextResponse.json({ user: null, profile: null, accessToken: null }, { status: 401 });
  }

  const { profile: ensuredProfile, error: profileError } = await ensureProfileForUser(supabase, data.user);
  let profile = ensuredProfile;
  const dailyLogin = profile ? await claimDailyLoginRewardForUser(supabase, data.user.id) : { claimed: false, coins: null, error: null };
  if (!dailyLogin.error && dailyLogin.coins !== null && profile) {
    profile = { ...profile, coins: dailyLogin.coins };
  }

  return NextResponse.json({
    user: data.user,
    profile,
    profileError: profileError?.message ?? "",
    dailyLoginClaimed: dailyLogin.claimed,
    accessToken: decodeURIComponent(accessToken),
  });
}
