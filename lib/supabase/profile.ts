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

    if (retry.error || !retry.data) return { profile: retry.data ?? null, error: retry.error };
    const starterError = await ensureStarterLeaderForUser(supabase, user.id);
    return { profile: retry.data, error: starterError };
  }

  if (insert.error || !insert.data) return { profile: insert.data ?? null, error: insert.error };
  const starterError = await ensureStarterLeaderForUser(supabase, user.id);
  return { profile: insert.data, error: starterError };
}

export async function ensureStarterLeaderForUser(supabase: ServiceSupabaseClient, userId: string) {
  const starter = await supabase
    .from("card_templates")
    .select("id")
    .eq("slug", "ada-printa")
    .eq("card_type", "LEADER")
    .maybeSingle();

  if (starter.error) return starter.error;
  if (!starter.data) return null;

  const owned = await supabase
    .from("user_card_collection")
    .select("id")
    .eq("user_id", userId)
    .eq("card_template_id", starter.data.id)
    .maybeSingle();

  if (owned.error) return owned.error;
  if (owned.data) return null;

  const inserted = await supabase
    .from("user_card_collection")
    .insert({
      user_id: userId,
      card_template_id: starter.data.id,
      quantity: 1,
    });

  return inserted.error;
}

export async function claimDailyLoginRewardForUser(supabase: ServiceSupabaseClient, userId: string) {
  const result = await supabase
    .rpc("claim_daily_login_reward", {
      p_user_id: userId,
    })
    .select()
    .maybeSingle();

  if (result.error) return { claimed: false, coins: null, error: result.error };
  return {
    claimed: Boolean(result.data?.claimed),
    coins: result.data?.coins ?? null,
    error: null,
  };
}
