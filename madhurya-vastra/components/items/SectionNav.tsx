"use client";

import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { SECTIONS, type SectionKey } from "./form";

type Props = {
  done: Record<SectionKey, boolean>;
  problems: Set<SectionKey>;
};

export const jumpTo = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  // Move focus for keyboard and screen-reader users without scrolling again.
  const focusTarget = el.querySelector<HTMLElement>("input, select, textarea, button") ?? el;
  focusTarget.focus({ preventScroll: true });
};

/**
 * Jump bar for the long form on phones and tablets: one chip per section, ticked when filled,
 * red when it has a problem. Sticks under the header while scrolling.
 */
export default function SectionNav({ done, problems }: Props) {
  return (
    <nav aria-label="Form sections" className="sticky top-16 z-nav -mx-4 border-b border-line bg-canvas/95 px-4 py-2.5 backdrop-blur md:-mx-7 md:px-7 lg:hidden">
      <ol className="flex gap-2 overflow-x-auto">
        {SECTIONS.map((s, i) => {
          const bad = problems.has(s.key);
          const ok = !bad && done[s.key];
          return (
            <li key={s.key} className="shrink-0">
              <a
                href={`#${s.key}`}
                onClick={(e) => {
                  e.preventDefault();
                  jumpTo(s.key);
                }}
                className={cn(
                  "relative flex min-h-9 items-center gap-1.5 rounded-full border bg-surface px-3 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft",
                  bad ? "border-danger text-danger" : ok ? "border-success-tint text-success" : "border-line text-muted",
                )}
              >
                {bad ? <AlertCircle aria-hidden="true" className="h-4 w-4" /> : ok ? <Check aria-hidden="true" className="h-4 w-4" /> : <span aria-hidden="true" className="tabular-nums">{i + 1}</span>}
                {s.label}
                <span className="sr-only">{bad ? " — needs fixing" : ok ? " — done" : ""}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
