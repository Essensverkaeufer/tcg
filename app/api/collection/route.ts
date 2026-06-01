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

  return NextResponse.json({
    entries,
    ownedTemplates: entries.length,
    totalQuantity: entries.reduce((sum, entry) => sum + entry.quantity, 0),
  });
}
