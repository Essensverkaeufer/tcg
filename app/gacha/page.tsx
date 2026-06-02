import { AppShell } from "@/components/AppShell";
import { GachaClient } from "@/components/gacha/GachaClient";

export default function GachaPage() {
  return (
    <AppShell>
      <GachaClient />
    </AppShell>
  );
}
