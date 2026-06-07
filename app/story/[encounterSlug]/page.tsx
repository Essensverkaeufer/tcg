import { AppShell } from "@/components/AppShell";
import { StoryBattleClient } from "@/components/story/StoryBattleClient";

export default async function StoryEncounterPage({ params }: { params: Promise<{ encounterSlug: string }> }) {
  const { encounterSlug } = await params;

  return (
    <AppShell>
      <StoryBattleClient encounterSlug={encounterSlug} />
    </AppShell>
  );
}
