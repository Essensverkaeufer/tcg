import { AppShell } from "@/components/AppShell";
import { LoginClient } from "@/components/auth/LoginClient";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;

  return (
    <AppShell>
      <LoginClient initialMode={mode === "register" ? "register" : "login"} />
    </AppShell>
  );
}
