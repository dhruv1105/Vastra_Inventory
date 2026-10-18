"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { cn } from "@/lib/cn";
import { activeNav, NAV } from "./nav";

/** Tablet and up. Collapsed = icon rail with small labels; expanded = full names. */
export default function Sidebar() {
  const pathname = usePathname();
  const current = activeNav(pathname);
  const { expanded, toggle } = useSidebar();

  return (
    <aside
      style={{ width: "var(--sidebar-w)" }}
      className="sticky top-16 z-nav hidden h-[calc(100dvh-4rem)] shrink-0 flex-col self-start overflow-y-auto overflow-x-hidden border-r border-line bg-surface transition-[width] duration-base ease-brand md:flex"
    >
      <nav aria-label="Main" className={cn("flex flex-1 flex-col gap-1 py-4", expanded ? "px-3" : "px-2")}>
        {NAV.map((item) => {
          const on = item === current;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              aria-label={item.name}
              title={expanded ? undefined : item.name}
              className={cn(
                "relative flex items-center rounded-md transition-colors duration-fast ease-brand",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft",
                expanded ? "min-h-11 gap-3 px-3.5" : "min-h-14 flex-col justify-center gap-1 px-1",
                on ? "bg-tint font-semibold text-primary" : "text-muted hover:bg-tint/60 hover:text-fg",
              )}
            >
              {on && <span aria-hidden="true" className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-zari" />}
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className={cn("leading-tight", expanded ? "text-base" : "text-center text-xs")}>{expanded ? item.name : item.short}</span>
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-line", expanded ? "p-3" : "p-2")}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className={cn(
            "flex w-full items-center rounded-md text-muted transition-colors duration-fast hover:bg-tint hover:text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft",
            expanded ? "min-h-10 gap-3 px-3.5" : "min-h-12 flex-col justify-center gap-1 px-1",
          )}
        >
          {expanded ? <PanelLeftClose aria-hidden="true" className="h-5 w-5" /> : <PanelLeftOpen aria-hidden="true" className="h-5 w-5" />}
          <span className={expanded ? "text-sm" : "text-xs"}>{expanded ? "Collapse" : "Expand"}</span>
        </button>
      </div>
    </aside>
  );
}
