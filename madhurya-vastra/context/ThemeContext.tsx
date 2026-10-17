"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { FOLLOW_SYSTEM_THEME } from "@/lib/theme/presets";

export type ThemeChoice = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "mv-theme";

/**
 * Runs in <head> before the page paints so a saved dark choice never flashes light.
 * Static string, no user data.
 */
export const themeBootScript = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

const fallback: ThemeChoice = FOLLOW_SYSTEM_THEME ? "system" : "light";

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
}

type ThemeCtx = {
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
  /** Choices to offer in the switch. "system" only once FOLLOW_SYSTEM_THEME is on. */
  options: ThemeChoice[];
};

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>(fallback);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Storage blocked (private mode): stay on the default.
    }
    const valid = saved === "light" || saved === "dark" || (saved === "system" && FOLLOW_SYSTEM_THEME);
    setThemeState(valid ? (saved as ThemeChoice) : fallback);
  }, []);

  const setTheme = useCallback((t: ThemeChoice) => {
    setThemeState(t);
    apply(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      // Not saved; the choice still applies for this visit.
    }
  }, []);

  const options: ThemeChoice[] = FOLLOW_SYSTEM_THEME ? ["system", "light", "dark"] : ["light", "dark"];

  return <ThemeContext.Provider value={{ theme, setTheme, options }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
