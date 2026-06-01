"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileError: string;
  accessToken?: string;
  refreshSession: () => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  initialAccessToken,
  initialProfile = null,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialAccessToken?: string;
  initialProfile?: Profile | null;
  initialUser?: User | null;
}) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [profileError, setProfileError] = useState("");
  const [cookieAccessToken, setCookieAccessToken] = useState<string | undefined>(initialAccessToken);
  const [loading, setLoading] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!response.ok) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setCookieAccessToken(undefined);
        setProfileError("");
        return false;
      }

      const payload = await response.json();
      setUser(payload.user ?? null);
      setProfile(payload.profile ?? null);
      setCookieAccessToken(payload.accessToken ?? undefined);
      setProfileError(payload.profileError ?? "");
      return Boolean(payload.user && payload.profile);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not load your profile.");
      return false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = session?.access_token ?? cookieAccessToken;
    if (!token) {
      await refreshSession();
      return;
    }

    try {
      setProfileError("");
      const response = await fetch("/api/users/ensure-profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "same-origin",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not repair profile.");
      setProfile(payload.profile ?? null);
      if (!user) await refreshSession();
    } catch (error) {
      setProfile(null);
      setProfileError(error instanceof Error ? error.message : "Could not load your profile.");
    }
  }, [cookieAccessToken, refreshSession, session?.access_token, user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut().catch(() => undefined);
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => undefined);
    setSession(null);
    setUser(null);
    setProfile(null);
    setProfileError("");
    setCookieAccessToken(undefined);
  }, [supabase]);

  useEffect(() => {
    let mounted = true;
    const timeout = window.setTimeout(() => {
      if (mounted) setLoading(false);
    }, 4000);

    const sessionCheck = window.setTimeout(() => {
      void refreshSession()
        .catch((error) => {
          if (!mounted) return;
          setProfileError(error instanceof Error ? error.message : "Could not check login.");
        })
        .finally(() => {
          if (!mounted) return;
          window.clearTimeout(timeout);
          setLoading(false);
        });
    }, 0);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      window.clearTimeout(sessionCheck);
    };
  }, [refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileError,
        accessToken: session?.access_token ?? cookieAccessToken,
        refreshSession,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
