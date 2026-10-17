import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { BrandMark } from "./Brand";

export type EmptyStateProps = {
  /** Short and warm, set in the accent font: "Your shelves are empty". */
  title: string;
  /** Why it is empty and what will appear here. */
  children: ReactNode;
  /** The next step, usually one Button. */
  action?: ReactNode;
  /** Gold label for not-yet-built screens, e.g. "Comes after Sales". */
  eyebrow?: string;
  compact?: boolean;
  className?: string;
};

/** Every empty, no-results and coming-soon state uses this, so they all look and read alike. */
export default function EmptyState({ title, children, action, eyebrow, compact, className }: EmptyStateProps) {
  return (
    <section className={cn("grid justify-items-center gap-3 rounded-lg border border-line bg-surface text-center", compact ? "px-5 py-7" : "px-6 py-10", className)}>
      <BrandMark className={cn("opacity-90", compact ? "w-20" : "w-28")} />
      {eyebrow && <span className="text-xs font-semibold uppercase tracking-widest text-zari">{eyebrow}</span>}
      <h2 className="font-accent text-2xl font-semibold text-fg text-balance">{title}</h2>
      <div className="max-w-prose text-muted">{children}</div>
      {action && <div className="mt-1">{action}</div>}
    </section>
  );
}
