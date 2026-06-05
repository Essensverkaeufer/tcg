import { AppShell } from "@/components/AppShell";
import { GachaClient } from "@/components/gacha/GachaClient";

export default async function GachaBannerPage({ params }: { params: Promise<{ bannerSlug: string }> }) {
  const { bannerSlug } = await params;

  return (
    <AppShell>
      <GachaClient key={bannerSlug} bannerSlug={bannerSlug} />
    </AppShell>
  );
}
