import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupabaseUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const craftSchema = z.object({
  cardSlug: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const parsed = craftSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid craft request." }, { status: 400 });
  }

  const result = await auth.supabase.rpc("craft_collection_card", {
    p_user_id: auth.user.id,
    p_card_slug: parsed.data.cardSlug,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const crafted = result.data?.[0];
  return NextResponse.json({
    cardTemplateId: crafted?.card_template_id,
    duplicateCredits: crafted?.duplicate_credits ?? 0,
    quantity: crafted?.quantity ?? 0,
    cost: crafted?.cost ?? 0,
  });
}
