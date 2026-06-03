import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { SiteAudioProvider } from "@/components/audio/SiteAudioProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ensureProfileForUser } from "@/lib/supabase/profile";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cards and Pedophiles",
  description: "Expandable browser TCG framework with Aura, packs, decks, and real-time matches.",
};

async function getInitialAuth() {
  const accessToken = (await cookies()).get("friend_tcg_access_token")?.value;
  if (!accessToken) return {};

  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) return {};
    const { profile } = await ensureProfileForUser(supabase, data.user);
    return {
      initialAccessToken: accessToken,
      initialUser: data.user,
      initialProfile: profile ?? null,
    };
  } catch {
    return {};
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialAuth = await getInitialAuth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme="dark"
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider {...initialAuth}>
          <SiteAudioProvider>{children}</SiteAudioProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
