import type { User } from "@supabase/supabase-js";
import { normalizeUsername } from "@/lib/supabase/username";
import type { Database } from "@/types/supabase";

type ServiceSupabaseClient = ReturnType<typeof import("@/lib/supabase/server").createServiceSupabaseClient>;
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export function usernameFromUser(user: Pick<User, "id" | "email" | "user_metadata">) {
  const metadataUsername = typeof user.user_metadata?.username === "string" ? user.user_metadata.username : "";
  const emailUsername = user.email?.split("@")[0] ?? "";
  const raw = metadataUsername || emailUsername || `player_${user.id.slice(0, 8)}`;
  const cleaned = normalizeUsername(raw).replace(/[^a-z0-9_]/g, "_").slice(0, 24);
  return cleaned.length >= 3 ? cleaned : `player_${user.id.slice(0, 8)}`;
}

export async function ensureProfileForUser(supabase: ServiceSupabaseClient, user: Pick<User, "id" | "email" | "user_metadata">) {
  const existing = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (existing.error) return { profile: null, error: existing.error };
  if (existing.data) return { profile: existing.data, error: null };

  const baseUsername = usernameFromUser(user);
  const insert = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username: baseUsername,
    })
    .select("*")
    .single();

  if (insert.error?.code === "23505") {
    const retry = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        username: `${baseUsername.slice(0, 15)}_${user.id.slice(0, 8)}`,
      })
      .select("*")
      .single();

    return { profile: retry.data ?? null, error: retry.error };
  }

  return { profile: insert.data ?? null, error: insert.error };
}
