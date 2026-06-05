import { NextResponse } from "next/server";
import { isAdminUsername } from "@/lib/admin";
import { requireSupabaseUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const profile = await auth.supabase.from("profiles").select("username").eq("id", auth.user.id).single();
  if (profile.error) return NextResponse.json({ error: profile.error.message }, { status: 500 });
  if (!isAdminUsername(profile.data.username)) {
    return NextResponse.json({ error: "Card review is only available for essens and essens2." }, { status: 403 });
  }

  const submissions = await auth.supabase
    .from("card_template_submissions")
    .select("*")
    .eq("status", "PENDING")
    .order("submitted_at", { ascending: true });

  if (submissions.error) {
    return NextResponse.json({ error: submissions.error.message }, { status: 500 });
  }

  const submitterIds = [...new Set((submissions.data ?? []).map((entry) => entry.submitter_id))];
  const profiles = submitterIds.length
    ? await auth.supabase.from("profiles").select("id, username").in("id", submitterIds)
    : { data: [], error: null };

  if (profiles.error) {
    return NextResponse.json({ error: profiles.error.message }, { status: 500 });
  }

  const usernames = new Map((profiles.data ?? []).map((entry) => [entry.id, entry.username]));
  return NextResponse.json({
    submissions: (submissions.data ?? []).map((entry) => ({
      ...entry,
      submitterUsername: usernames.get(entry.submitter_id) ?? "Unknown",
    })),
  });
}
