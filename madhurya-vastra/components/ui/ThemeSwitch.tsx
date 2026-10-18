"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeChoice } from "@/context/ThemeContext";
import { cn } from "@/lib/cn";

const META: Record<ThemeChoice, { label: string; Icon: typeof Sun }> = {
  system: { label: "System", Icon: Monitor },
  light: { label: "Light", Icon: Sun },
  dark: { label: "Dark", Icon: Moon },
};

/** Segmented Light / Dark (/ System) switch. Lives in the user menu. */
export default function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme, options } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className={cn("inline-flex rounded-full border border-line bg-canvas p-0.5", className)}>
      {options.map((o) => {
        const { label, Icon } = META[o];
        const on = theme === o;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setTheme(o)}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-colors duration-fast ease-brand",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft",
              on ? "bg-primary font-semibold text-primary-on" : "text-muted hover:text-fg",
            )}
          >
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
