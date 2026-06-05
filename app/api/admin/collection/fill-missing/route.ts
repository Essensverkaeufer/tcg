import { NextResponse } from "next/server";
import { isAdminUsername } from "@/lib/admin";
import { requireSupabaseUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const profile = await auth.supabase.from("profiles").select("username").eq("id", auth.user.id).single();
  if (profile.error) {
    return NextResponse.json({ error: profile.error.message }, { status: 500 });
  }
  if (!isAdminUsername(profile.data.username)) {
    return NextResponse.json({ error: "Collection admin is only available for essens and essens2." }, { status: 403 });
  }

  const [cardsResult, collectionResult] = await Promise.all([
    auth.supabase.from("card_templates").select("id, name").order("name"),
    auth.supabase
      .from("user_card_collection")
      .select("card_template_id, quantity")
      .eq("user_id", auth.user.id),
  ]);

  if (cardsResult.error) {
    return NextResponse.json({ error: cardsResult.error.message }, { status: 500 });
  }
  if (collectionResult.error) {
    return NextResponse.json({ error: collectionResult.error.message }, { status: 500 });
  }

  const ownedQuantities = new Map((collectionResult.data ?? []).map((row) => [row.card_template_id, row.quantity]));
  const missingCards = (cardsResult.data ?? []).filter((card) => (ownedQuantities.get(card.id) ?? 0) <= 0);

  if (missingCards.length === 0) {
    return NextResponse.json({ addedTemplates: 0, addedCopies: 0, message: "No missing cards found." });
  }

  const rows = missingCards.map((card) => ({
    user_id: auth.user.id,
    card_template_id: card.id,
    quantity: 2,
    updated_at: new Date().toISOString(),
  }));

  const grant = await auth.supabase
    .from("user_card_collection")
    .upsert(rows, { onConflict: "user_id,card_template_id" });

  if (grant.error) {
    return NextResponse.json({ error: grant.error.message }, { status: 500 });
  }

  return NextResponse.json({
    addedTemplates: missingCards.length,
    addedCopies: missingCards.length * 2,
    message: `Added 2 copies each for ${missingCards.length} missing card template(s).`,
  });
}
