"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { normalizeUsername, usernameToAuthEmail } from "@/lib/supabase/username";

type Mode = "login" | "register";

export function LoginClient({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage("");
    router.replace(`/auth/login${nextMode === "register" ? "?mode=register" : ""}`, { scroll: false });
  }

  async function submit() {
    setLoading(true);
    setMessage("");

    try {
      usernameToAuthEmail(username);
    } catch (error) {
      setLoading(false);
      setMessage(error instanceof Error ? error.message : "Invalid username.");
      return;
    }

    if (mode === "register") {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normalizeUsername(username), password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setLoading(false);
        setMessage(data.error ?? "Could not create account.");
        return;
      }
    }

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: normalizeUsername(username), password }),
    });
    const result = await response.json();

    if (!response.ok) {
      setLoading(false);
      setMessage(result.error ?? "Could not login.");
      return;
    }

    setMessage("Finishing login...");
    const sessionReady = await refreshSession();
    setLoading(false);

    if (!sessionReady) {
      setMessage("Login worked, but the account profile did not load yet. Try again.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div data-login-root data-mode={mode}>
        <div className="grid grid-cols-2 rounded-md bg-slate-100 p-1 text-sm font-black">
          <button type="button" data-login-tab="login" onClick={() => changeMode("login")} className={mode === "login" ? "rounded bg-white py-2 shadow-sm" : "py-2 text-slate-500"}>
            Login
          </button>
          <button type="button" data-login-tab="register" onClick={() => changeMode("register")} className={mode === "register" ? "rounded bg-white py-2 shadow-sm" : "py-2 text-slate-500"}>
            Register
          </button>
        </div>
        <h1 data-login-heading className="mt-6 text-2xl font-black">{mode === "login" ? "Welcome Back" : "Create Account"}</h1>
        <p className="mt-2 text-sm text-slate-600">Your login is saved for the next visit automatically.</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <input name="username" className="w-full rounded-md border border-slate-300 px-3 py-2" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" autoComplete="username" required />
          <input name="password" className="w-full rounded-md border border-slate-300 px-3 py-2" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" minLength={6} required />
          <button data-login-submit className="w-full rounded-md bg-slate-950 px-4 py-2 font-black text-white disabled:bg-slate-300" disabled={loading} type="submit">
            {loading ? "Working..." : mode === "login" ? "Login" : "Register"}
          </button>
          {message ? <p className="rounded-md bg-slate-100 p-3 text-sm font-bold text-slate-700">{message}</p> : null}
          <p data-login-message className="rounded-md bg-slate-100 p-3 text-sm font-bold text-slate-700 empty:hidden" />
        </form>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (() => {
            const root = document.querySelector('[data-login-root]');
            if (!root || root.dataset.fallbackReady === 'true') return;
            root.dataset.fallbackReady = 'true';
            const projectUrl = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")};
            const projectRef = (() => {
              try { return new URL(projectUrl).hostname.split('.')[0]; } catch { return ""; }
            })();
            const storageKey = projectRef ? "sb-" + projectRef + "-auth-token" : "";
            const setMode = (mode) => {
              root.dataset.mode = mode;
              const isRegister = mode === 'register';
              root.querySelector('[data-login-heading]').textContent = isRegister ? 'Create Account' : 'Welcome Back';
              root.querySelector('[data-login-submit]').textContent = isRegister ? 'Register' : 'Login';
              root.querySelector('[data-login-tab="login"]').className = isRegister ? 'py-2 text-slate-500' : 'rounded bg-white py-2 shadow-sm';
              root.querySelector('[data-login-tab="register"]').className = isRegister ? 'rounded bg-white py-2 shadow-sm' : 'py-2 text-slate-500';
              history.replaceState(null, '', '/auth/login' + (isRegister ? '?mode=register' : ''));
            };
            root.querySelector('[data-login-tab="login"]')?.addEventListener('click', () => setMode('login'));
            root.querySelector('[data-login-tab="register"]')?.addEventListener('click', () => setMode('register'));
            root.querySelector('form')?.addEventListener('submit', async (event) => {
              event.preventDefault();
              const message = root.querySelector('[data-login-message]');
              const submit = root.querySelector('[data-login-submit]');
              const username = root.querySelector('[name="username"]').value;
              const password = root.querySelector('[name="password"]').value;
              message.textContent = '';
              submit.disabled = true;
              submit.textContent = 'Working...';
              try {
                if (root.dataset.mode === 'register') {
                  const registerResponse = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                  });
                  const registerPayload = await registerResponse.json();
                  if (!registerResponse.ok) throw new Error(registerPayload.error || 'Could not create account.');
                }
                const loginResponse = await fetch('/api/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username, password })
                });
                const loginPayload = await loginResponse.json();
                if (!loginResponse.ok) throw new Error(loginPayload.error || 'Could not login.');
                const sessionResponse = await fetch('/api/auth/session', { cache: 'no-store' });
                const sessionPayload = await sessionResponse.json();
                if (!sessionResponse.ok || !sessionPayload.user || !sessionPayload.profile) throw new Error(sessionPayload.profileError || sessionPayload.error || 'Could not finish login.');
                if (storageKey && loginPayload.session) {
                  localStorage.setItem(storageKey, JSON.stringify({
                    access_token: loginPayload.session.access_token,
                    refresh_token: loginPayload.session.refresh_token,
                    expires_at: loginPayload.session.expires_at,
                    expires_in: loginPayload.session.expires_in,
                    token_type: loginPayload.session.token_type,
                    user: loginPayload.session.user
                  }));
                }
                window.location.href = '/dashboard';
              } catch (error) {
                message.textContent = error instanceof Error ? error.message : 'Could not login.';
              } finally {
                submit.disabled = false;
                submit.textContent = root.dataset.mode === 'register' ? 'Register' : 'Login';
              }
            });
          })();
        `,
          }}
        />
      </section>
    </main>
  );
}
