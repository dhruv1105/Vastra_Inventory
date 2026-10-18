"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { activeNav, NAV } from "./nav";

/** Phones only: the five screens along the bottom, above the home indicator. */
export default function BottomNav() {
  const pathname = usePathname();
  const current = activeNav(pathname);

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-nav border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid h-[var(--bottom-nav-h)] grid-cols-5">
        {NAV.map((item) => {
          const on = item === current;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              aria-label={item.name}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 transition-colors duration-fast",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-soft",
                on ? "font-semibold text-primary" : "text-muted",
              )}
            >
              {on && <span aria-hidden="true" className="absolute top-1 h-1.5 w-1.5 rounded-full bg-zari" />}
              <Icon aria-hidden="true" className="h-6 w-6 short:h-5 short:w-5" />
              <span className="text-xs short:hidden">{item.short}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
