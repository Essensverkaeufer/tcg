import { AppShell } from "@/components/AppShell";
import { GachaMenuClient } from "@/components/gacha/GachaMenuClient";

export default function GachaPage() {
  return (
    <AppShell>
      <GachaMenuClient />
    </AppShell>
  );
}
