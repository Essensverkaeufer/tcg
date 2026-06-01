import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CardFrame } from "@/components/cards/CardFrame";
import { getCardBySlug } from "@/lib/game/cards";
import { cardRowToTemplate } from "@/lib/game/mapping";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let card = getCardBySlug(id);
  try {
    const supabase = createServiceSupabaseClient();
    const { data } = await supabase.from("card_templates").select("*").eq("slug", id).maybeSingle();
    if (data) card = cardRowToTemplate(data);
  } catch {
    card = getCardBySlug(id);
  }
  if (!card) notFound();

  return (
    <AppShell>
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[320px_1fr]">
        <CardFrame card={card} />
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h1 className="text-3xl font-black">{card.name}</h1>
          <p className="mt-2 text-slate-600">{card.description}</p>
          <h2 className="mt-6 text-lg font-black">Ability Data</h2>
          <pre className="mt-3 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(card.abilityData, null, 2)}</pre>
        </section>
      </main>
    </AppShell>
  );
}
