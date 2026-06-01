import { AppShell } from "@/components/AppShell";
import { DeckBuilderClient } from "@/components/deckbuilder/DeckBuilderClient";

export default function DecksPage() {
  return (
    <AppShell>
      <DeckBuilderClient />
    </AppShell>
  );
}
