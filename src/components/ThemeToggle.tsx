"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("light", theme === "light");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("zbk-theme");
    const next: Theme = stored === "light" || stored === "dark" ? stored : "dark";
    setTheme(next);
    applyTheme(next);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("zbk-theme", next);
    applyTheme(next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative flex h-8 w-[52px] shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-1 transition hover:bg-[var(--card-hover)]"
    >
      <span
        className="absolute top-0.5 h-6 w-6 rounded-full bg-[var(--accent)] shadow-sm transition-transform duration-200 ease-out"
        style={{ transform: isDark ? "translateX(0)" : "translateX(20px)" }}
      />
      <Moon
        className={`relative z-10 h-3.5 w-3.5 transition ${
          isDark ? "text-white" : "text-[var(--optional)]"
        }`}
      />
      <Sun
        className={`relative z-10 ml-auto h-3.5 w-3.5 transition ${
          isDark ? "text-[var(--optional)]" : "text-white"
        }`}
      />
    </button>
  );
}
