import type { SupabaseClient } from "@supabase/supabase-js";
import { cardCatalog } from "@/lib/game/cards";
import { defaultGachaBanner, type GachaBanner } from "@/lib/game/gacha";
import { cardTemplateToInsert } from "@/lib/game/mapping";
import type { Database } from "@/types/supabase";

export async function ensureFeaturedGachaCards(supabase: SupabaseClient<Database>, banner: GachaBanner = defaultGachaBanner) {
  const existing = await supabase
    .from("card_templates")
    .select("*")
    .in("slug", [...banner.featuredSlugs]);

  if (existing.error) throw new Error(existing.error.message);
  const rowsBySlug = new Map((existing.data ?? []).map((row) => [row.slug, row]));
  const missingSlugs = banner.featuredSlugs.filter((slug) => !rowsBySlug.has(slug));

  if (missingSlugs.length) {
    const localCards = missingSlugs.map((slug) => cardCatalog.find((card) => card.slug === slug));
    if (localCards.some((card) => !card)) throw new Error("A featured gacha card is missing from the local catalog.");

    const inserted = await supabase
      .from("card_templates")
      .upsert(localCards.map((card) => cardTemplateToInsert(card!)), { onConflict: "slug" })
      .select("*");

    if (inserted.error) throw new Error(inserted.error.message);
    for (const row of inserted.data ?? []) rowsBySlug.set(row.slug, row);
  }

  return banner.featuredSlugs.map((slug) => rowsBySlug.get(slug)).filter((row): row is Database["public"]["Tables"]["card_templates"]["Row"] => Boolean(row));
}

export async function ensureFeaturedGachaCard(supabase: SupabaseClient<Database>, banner: GachaBanner = defaultGachaBanner) {
  const cards = await ensureFeaturedGachaCards(supabase, banner);
  const first = cards[0];
  if (!first) throw new Error("Featured gacha card is missing.");
  return first;
}
