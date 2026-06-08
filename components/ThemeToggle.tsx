"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const savedTheme: Theme = window.localStorage.getItem("game-theme") === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = savedTheme;
    window.requestAnimationFrame(() => setTheme(savedTheme));
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("game-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="theme-toggle theme-toggle-spin inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-black hover:bg-slate-100"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
