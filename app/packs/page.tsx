import { AppShell } from "@/components/AppShell";
import { PackShop } from "@/components/packs/PackShop";

export default function PacksPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <PackShop />
      </main>
    </AppShell>
  );
}
