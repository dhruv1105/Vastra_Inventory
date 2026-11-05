import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { Vine } from "./Brand";
import { HIT_AREA_ROW } from "./hitArea";

export type PageHeaderProps = {
  title: string;
  /** Small gold label above the title naming the area, e.g. "Stock". */
  eyebrow?: string;
  subtitle?: ReactNode;
  /** The screen's one primary action. */
  action?: ReactNode;
  /** Back link, e.g. { href: "/inventory", label: "Back to inventory" }. */
  back?: { href: string; label: string };
  /** Show the title on phones too. For a page about one record (an item): the header bar shows only the area's name. */
  titleOnPhone?: boolean;
  className?: string;
};

/**
 * Title block at the top of every screen: eyebrow, display-font title, vine, one action.
 * On short screens (phone landscape, `short:` = max-height 500px) it drops the eyebrow and vine
 * and shrinks the title, so content starts higher.
 */
export default function PageHeader({ title, eyebrow, subtitle, action, back, titleOnPhone, className }: PageHeaderProps) {
  return (
    // Title and action share one line on every screen size: a long title wraps in its own column
    // instead of pushing the action below it (give phone actions icon-only buttons to keep them small).
    <div className={cn("flex items-end justify-between gap-3 short:items-center", className)}>
      <div className="grid min-w-0 flex-1 gap-0.5">
        {back && (
          <Link
            href={back.href}
            className={cn("relative mb-1 short:mb-0 inline-flex w-fit items-center gap-1 rounded-sm text-sm text-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft", HIT_AREA_ROW)}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {back.label}
          </Link>
        )}
        {eyebrow && <span className="hidden text-xs font-semibold uppercase tracking-widest text-zari md:block short:hidden">{eyebrow}</span>}
        {/* On phones the header bar already shows the screen name; keep the h1 for screen readers. */}
        <h1 className={cn("font-display leading-tight text-fg text-balance short:text-2xl", titleOnPhone ? "text-2xl md:text-3xl" : "sr-only text-3xl md:not-sr-only")}>{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        <Vine className="mt-2 hidden w-44 md:block short:hidden" />
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
