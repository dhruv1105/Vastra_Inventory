import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { Vine } from "./Brand";

export type PageHeaderProps = {
  title: string;
  /** Small gold label above the title naming the area, e.g. "Stock". */
  eyebrow?: string;
  subtitle?: ReactNode;
  /** The screen's one primary action. */
  action?: ReactNode;
  /** Back link, e.g. { href: "/inventory", label: "Back to inventory" }. */
  back?: { href: string; label: string };
  className?: string;
};

/**
 * Title block at the top of every screen: eyebrow, display-font title, vine, one action.
 * On short screens (phone landscape, `short:` = max-height 500px) it drops the eyebrow and vine
 * and shrinks the title, so content starts higher.
 */
export default function PageHeader({ title, eyebrow, subtitle, action, back, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3 short:items-center", className)}>
      <div className="grid min-w-0 gap-0.5">
        {back && (
          <Link href={back.href} className="mb-1 short:mb-0 inline-flex w-fit items-center gap-1 rounded-sm text-sm text-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {back.label}
          </Link>
        )}
        {eyebrow && <span className="hidden text-xs font-semibold uppercase tracking-widest text-zari md:block short:hidden">{eyebrow}</span>}
        {/* On phones the header bar already shows the screen name; keep the h1 for screen readers. */}
        <h1 className="font-display text-3xl leading-tight text-fg text-balance sr-only md:not-sr-only short:text-2xl">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        <Vine className="mt-2 hidden w-44 md:block short:hidden" />
      </div>
      {action}
    </div>
  );
}
