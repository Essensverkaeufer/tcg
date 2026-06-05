"use client";

import { ImageUp } from "lucide-react";
import { useMemo, useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function ProfileClient() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { accessToken, profile, refreshProfile, refreshSession, user } = useAuth();
  const [bioDraft, setBioDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const bioValue = bioDraft ?? profile?.bio ?? "";
  const stats = [
    ["Coins", profile?.coins ?? 0],
    ["Wins", profile?.wins ?? 0],
    ["Losses", profile?.losses ?? 0],
    ["Matches", profile?.matches_played ?? 0],
    ["Packs", profile?.packs_opened ?? 0],
  ];

  async function saveBio() {
    if (!user) return;
    setBusy(true);
    setMessage("");
    const result = await supabase.from("profiles").update({ bio: bioValue }).eq("id", user.id);
    setBusy(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setBioDraft(null);
    await refreshProfile();
    setMessage("Profile saved.");
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Profile picture must be an image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Profile picture must be 5 MB or smaller.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.set("avatar", file);
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
        credentials: "same-origin",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not upload profile picture.");
      await refreshSession();
      setMessage("Profile picture updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload profile picture.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGate>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center gap-5">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-3xl font-black uppercase text-slate-500">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                profile?.username.slice(0, 2) ?? "??"
              )}
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-3xl font-black">{profile?.username ?? "Player"}</h1>
              <p className="mt-2 text-sm font-bold text-slate-500">Player account</p>
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-black hover:bg-slate-100">
                <ImageUp className="h-4 w-4" aria-hidden />
                Upload Picture
                <input className="sr-only" type="file" accept="image/*" disabled={busy} onChange={(event) => event.target.files?.[0] && void uploadAvatar(event.target.files[0])} />
              </label>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-5">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-md bg-slate-100 p-4">
                <p className="text-xs font-black uppercase text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>

          <form className="mt-6" method="post" action="/api/profile/save-redirect">
            <label className="text-sm font-black text-slate-600" htmlFor="profile-bio">Bio</label>
            <textarea
              id="profile-bio"
              name="bio"
              className="mt-2 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2"
              maxLength={280}
              value={bioValue}
              onChange={(event) => setBioDraft(event.target.value)}
              placeholder="Say something about your account."
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="submit" onClick={(event) => { event.preventDefault(); void saveBio(); }} disabled={busy} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:bg-slate-300">
                {busy ? "Saving..." : "Save Profile"}
              </button>
              {message ? <span className="text-sm font-bold text-slate-600">{message}</span> : null}
            </div>
          </form>
        </section>
      </main>
    </AuthGate>
  );
}
