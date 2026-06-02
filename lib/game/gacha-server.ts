import type { SupabaseClient } from "@supabase/supabase-js";
import { cardCatalog } from "@/lib/game/cards";
import { necrpTuffGachaBanner } from "@/lib/game/gacha";
import { cardTemplateToInsert } from "@/lib/game/mapping";
import type { Database } from "@/types/supabase";

export async function ensureFeaturedGachaCard(supabase: SupabaseClient<Database>) {
  const existing = await supabase
    .from("card_templates")
    .select("*")
    .eq("slug", necrpTuffGachaBanner.featuredSlug)
    .maybeSingle();

  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data;

  const localCard = cardCatalog.find((card) => card.slug === necrpTuffGachaBanner.featuredSlug);
  if (!localCard) throw new Error("Featured gacha card is missing from the local catalog.");

  const inserted = await supabase
    .from("card_templates")
    .upsert(cardTemplateToInsert(localCard), { onConflict: "slug" })
    .select("*")
    .single();

  if (inserted.error) throw new Error(inserted.error.message);
  return inserted.data;
}
