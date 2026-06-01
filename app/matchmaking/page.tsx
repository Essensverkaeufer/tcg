import { AppShell } from "@/components/AppShell";
import { MatchmakingClient } from "@/components/matchmaking/MatchmakingClient";

export default function MatchmakingPage() {
  return (
    <AppShell>
      <MatchmakingClient />
    </AppShell>
  );
}
