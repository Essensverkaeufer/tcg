import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function requireSupabaseUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cookieToken = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("friend_tcg_access_token="))
    ?.split("=")[1];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : cookieToken ? decodeURIComponent(cookieToken) : undefined;

  if (!token) {
    return { error: NextResponse.json({ error: "Missing auth token." }, { status: 401 }) };
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { error: NextResponse.json({ error: "Invalid auth token." }, { status: 401 }) };
  }

  return { supabase, user: data.user };
}
