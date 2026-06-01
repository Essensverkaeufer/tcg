import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

let browserClient: ReturnType<typeof createClient<Database>> | undefined;

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }

  browserClient ??= createClient<Database>(url, publishableKey);
  return browserClient;
}
