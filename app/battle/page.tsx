import { AppShell } from "@/components/AppShell";
import { OnlineBattleClient } from "@/components/battle/OnlineBattleClient";

export default function BattlePage() {
  return (
    <AppShell>
      <OnlineBattleClient />
    </AppShell>
  );
}
