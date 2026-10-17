"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type SectionProps = {
  title: string;
  /** Step number shown in a small circle (long forms). */
  number?: number;
  hint?: ReactNode;
  /** Buttons on the right of the title, e.g. "+ Size". */
  actions?: ReactNode;
  /** Lets the user fold the section away; open by default. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** id for jump links (#photos). */
  id?: string;
  className?: string;
  children: ReactNode;
};

/** A titled surface block. The only "card" on a screen — never put one inside another. */
export default function Section({ title, number, hint, actions, collapsible, defaultOpen = true, id, className, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const headingId = useId();
  const bodyId = useId();

  const heading = (
    <span className="flex items-center gap-2 font-display text-xl text-primary">
      {number != null && (
        <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-tint font-sans text-xs font-semibold">
          {number}
        </span>
      )}
      {title}
    </span>
  );

  return (
    <section id={id} aria-labelledby={headingId} className={cn("grid scroll-mt-16 gap-4 rounded-lg border border-line bg-surface p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id={headingId} className="m-0">
          {collapsible ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft"
            >
              {heading}
              <ChevronDown aria-hidden="true" className={cn("h-5 w-5 text-muted transition-transform duration-base ease-brand", !open && "-rotate-90")} />
            </button>
          ) : (
            heading
          )}
        </h2>
        {(hint || actions) && (
          <div className="flex flex-wrap items-center gap-2">
            {hint && <span className="text-sm text-muted">{hint}</span>}
            {actions}
          </div>
        )}
      </div>
      <div id={bodyId} hidden={collapsible && !open} className="grid gap-4">
        {children}
      </div>
    </section>
  );
}
