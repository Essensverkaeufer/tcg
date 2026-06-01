import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureProfileForUser } from "@/lib/supabase/profile";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { normalizeUsername, usernameToAuthEmail } from "@/lib/supabase/username";

export const runtime = "nodejs";

const registerSchema = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_]{3,24}$/),
  password: z.string().min(6).max(128),
});

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registration data." }, { status: 400 });
  }

  const username = normalizeUsername(parsed.data.username);
  const supabase = createServiceSupabaseClient();
  const email = usernameToAuthEmail(username);

  const created = await supabase.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (created.error || !created.data.user) {
    const message = created.error?.message.toLowerCase().includes("already")
      ? "Username is already taken."
      : created.error?.message ?? "Could not create account.";
    return NextResponse.json({ error: message }, { status: created.error?.message.toLowerCase().includes("already") ? 409 : 400 });
  }

  const { profile, error: profileError } = await ensureProfileForUser(supabase, created.data.user);
  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? "Could not create profile." }, { status: 500 });
  }

  return NextResponse.json({ user: { id: created.data.user.id, username }, profile }, { status: 201 });
}
