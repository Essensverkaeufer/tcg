"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, profileError, refreshProfile, user } = useAuth();

  useEffect(() => {
    if (!user || !profileError) return;
    const id = window.setTimeout(() => {
      void refreshProfile();
    }, 0);
    return () => window.clearTimeout(id);
  }, [profileError, refreshProfile, user]);

  if (loading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600">Loading account...</div>;
  }

  if (!user) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <Lock className="mx-auto h-8 w-8 text-rose-600" aria-hidden />
        <h1 className="mt-3 text-2xl font-black">Login required</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to use this part of the game.</p>
        <Link href="/auth/login" className="mt-5 inline-block rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white">
          Login or Register
        </Link>
      </section>
    );
  }

  if (profileError) {
    return (
      <section className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-center">
        <Lock className="mx-auto h-8 w-8 text-rose-600" aria-hidden />
        <h1 className="mt-3 text-2xl font-black">Account needs repair</h1>
        <p className="mt-2 text-sm font-bold text-rose-700">{profileError}</p>
        <button type="button" onClick={() => void refreshProfile()} className="mt-5 rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white">
          Try Again
        </button>
      </section>
    );
  }

  return children;
}
