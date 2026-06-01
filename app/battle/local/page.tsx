import { AppShell } from "@/components/AppShell";
import { BattleClient } from "@/components/battle/BattleClient";

export default function LocalBattlePage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <BattleClient />
      </main>
    </AppShell>
  );
}
