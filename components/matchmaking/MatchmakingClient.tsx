"use client";

import Link from "next/link";
import { RadioTower } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";

export function MatchmakingClient() {
  const { user, accessToken } = useAuth();
  const [hasActiveDeck, setHasActiveDeck] = useState(false);
  const [realtimeUrl, setRealtimeUrl] = useState("http://localhost:3001");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    const id = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        const response = await fetch("/api/multiplayer/status", {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload = await response.json();
        if (!response.ok) {
          setMessage(payload.error ?? "Could not check multiplayer status.");
          setHasActiveDeck(false);
          setLoading(false);
          return;
        }
        setHasActiveDeck(Boolean(payload.hasActiveDeck));
        setRealtimeUrl(payload.realtimeUrl ?? "http://localhost:3001");
        setLoading(false);
      })();
    }, 0);
    return () => window.clearTimeout(id);
  }, [accessToken, user]);

  return (
    <AuthGate>
      <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <RadioTower className="mx-auto h-12 w-12 text-rose-600" aria-hidden />
        <h1 className="mt-4 text-3xl font-black">Matchmaking</h1>
        <p className="mt-3 text-slate-600">Closed-alpha online matchmaking uses your active saved deck and the realtime server at {realtimeUrl}.</p>
        {loading ? <p className="mt-4 text-sm font-bold text-slate-500">Checking active deck...</p> : null}
        {message ? <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm font-bold text-rose-700">{message}</p> : null}
        {!hasActiveDeck && !loading ? (
          <Link href="/decks" className="mt-8 inline-block rounded-md bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Build Active Deck
          </Link>
        ) : (
          <Link href="/battle" className="mt-8 inline-block rounded-md bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Queue Online Battle
          </Link>
        )}
        <Link href="/battle/local" className="ml-3 mt-8 inline-block rounded-md border border-slate-300 px-5 py-3 text-sm font-black">
          Local Sandbox
        </Link>
      </main>
    </AuthGate>
  );
}
