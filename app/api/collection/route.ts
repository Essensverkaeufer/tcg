import { NextResponse } from "next/server";
import { cardRowToTemplate } from "@/lib/game/mapping";
import { requireSupabaseUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

type CollectionRow = {
  card_template_id: string;
  quantity: number;
  card_templates: Parameters<typeof cardRowToTemplate>[0] | null;
};

export async function GET(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("user_card_collection")
    .select("card_template_id, quantity, card_templates(*)")
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as CollectionRow[];
  const entries = rows
    .filter((row) => row.card_templates)
    .map((row) => ({
      id: row.card_template_id,
      quantity: row.quantity,
      card: cardRowToTemplate(row.card_templates!),
    }));
  const ownedIds = new Set(entries.map((entry) => entry.id));
  const [profileResult, craftableResult] = await Promise.all([
    auth.supabase.from("profiles").select("duplicate_credits").eq("id", auth.user.id).single(),
    auth.supabase
      .from("card_templates")
      .select("*")
      .eq("drop_enabled", true)
      .order("rarity", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error.message }, { status: 500 });
  }
  if (craftableResult.error) {
    return NextResponse.json({ error: craftableResult.error.message }, { status: 500 });
  }

  const craftable = (craftableResult.data ?? [])
    .filter((row) => !ownedIds.has(row.id))
    .map(cardRowToTemplate);

  return NextResponse.json({
    entries,
    craftable,
    duplicateCredits: profileResult.data.duplicate_credits ?? 0,
    ownedTemplates: entries.length,
    totalQuantity: entries.reduce((sum, entry) => sum + entry.quantity, 0),
  });
}
