"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const THEME_KEY = "theme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // localStorage unavailable (private browsing, etc.) — theme just won't persist.
    }
  }

  // Reserve the same footprint before mount so nothing jumps once we know
  // the real theme (avoids a flash of the wrong toggle position).
  if (!mounted) {
    return <div className={`w-[60px] h-5 ${className}`} aria-hidden="true" />;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Sun size={14} className={dark ? "text-muted" : "text-[#d97706]"} />
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Wissel tussen licht en donker thema"
        onClick={toggle}
        className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${
          dark ? "bg-primary" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            dark ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      <Moon size={14} className={dark ? "text-primary" : "text-muted"} />
    </div>
  );
}
