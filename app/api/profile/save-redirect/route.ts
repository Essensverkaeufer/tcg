import { NextResponse } from "next/server";
import { requireSupabaseUser } from "@/lib/supabase/auth";
import { getSiteUrl } from "@/lib/site-url";

export async function POST(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) {
    return NextResponse.redirect(getSiteUrl("/auth/login", request));
  }

  const formData = await request.formData();
  const bio = String(formData.get("bio") ?? "").slice(0, 280);
  await auth.supabase.from("profiles").update({ bio }).eq("id", auth.user.id);
  return NextResponse.redirect(getSiteUrl("/profile", request));
}
