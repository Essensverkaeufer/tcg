"use client";

import Link from "next/link";
import { Boxes, CircleUserRound, Coins, Swords } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  ["Dashboard", "/dashboard"],
  ["Collection", "/collection"],
  ["Decks", "/decks"],
  ["Packs", "/packs"],
  ["Gacha", "/gacha"],
  ["Battle", "/matchmaking"],
  ["Admin", "/admin/cards"],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, user, signOut } = useAuth();

  async function handleLogout() {
    await signOut();
    window.location.assign("/auth/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-black">
            <Swords className="h-5 w-5 text-rose-600" aria-hidden />
            Cards and Pedophiles
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
            {navItems.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-950">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <ThemeToggle />
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-bold text-amber-800">
              <Coins className="h-4 w-4" aria-hidden />
              {profile?.coins ?? 0}
            </span>
            {user ? (
              <button type="button" onClick={() => void handleLogout()} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-black hover:bg-slate-100">
                Logout
              </button>
            ) : (
              <Link href="/auth/login" className="rounded-md border border-slate-200 px-3 py-2 text-xs font-black hover:bg-slate-100">
                Login
              </Link>
            )}
            <Link href="/profile" aria-label="Profile" className="rounded-md border border-slate-200 p-2 hover:bg-slate-100">
              <CircleUserRound className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/collection" aria-label="Collection" className="rounded-md border border-slate-200 p-2 hover:bg-slate-100">
              <Boxes className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
