import { AppShell } from "@/components/AppShell";
import { CardCreatorClient } from "@/components/cardcreator/CardCreatorClient";

export default function CreateCardPage() {
  return (
    <AppShell>
      <CardCreatorClient />
    </AppShell>
  );
}
