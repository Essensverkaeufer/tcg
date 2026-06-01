import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { PackOpeningClient } from "@/components/packs/PackOpeningClient";
import { cardCatalog } from "@/lib/game/cards";
import { openPack } from "@/lib/game/packs/openPack";
import { getPackDefinition } from "@/lib/game/packs/packs";

export default async function PackOpeningPage({ searchParams }: { searchParams: Promise<{ pack?: string; source?: string; reroll?: string }> }) {
  await connection();
  const { pack: packSlug, source, reroll } = await searchParams;
  const packDefinition = getPackDefinition(packSlug ?? "core-pack") ?? getPackDefinition("core-pack")!;
  const pack = openPack(cardCatalog, packDefinition.cardCount, packDefinition.rarityWeights);

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black">{packDefinition.name}</h1>
        <p className="mt-2 text-slate-600">{source === "purchase" ? "Purchased cards from your account roll." : "Preview animation only. Previewed cards are not saved to your account."}</p>
        <div className="mt-6">
          <PackOpeningClient fallbackCards={pack.cards} packSlug={packDefinition.slug} preview={source !== "purchase"} rerollKey={reroll ?? ""} />
        </div>
      </main>
    </AppShell>
  );
}
