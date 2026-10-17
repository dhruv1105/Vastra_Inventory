"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const CloseCtx = createContext<() => void>(() => {});

export type MenuProps = {
  /** Content of the trigger button (e.g. an avatar letter or a ⋯ icon). */
  trigger: ReactNode;
  /** Accessible name of the trigger, e.g. "Account menu". */
  label: string;
  triggerClassName?: string;
  align?: "start" | "end";
  className?: string;
  children: ReactNode;
};

/** Dropdown that closes on outside click, Esc (focus returns to the trigger) and item click. */
export default function Menu({ trigger, label, triggerClassName, align = "end", className, children }: MenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft", triggerClassName)}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "animate-slide-up absolute top-full z-menu mt-2 min-w-56 rounded-md border border-line bg-surface p-1.5 shadow-lg",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          <CloseCtx.Provider value={() => setOpen(false)}>{children}</CloseCtx.Provider>
        </div>
      )}
    </div>
  );
}

export function MenuItem({ onSelect, icon, tone = "default", children }: { onSelect: () => void; icon?: ReactNode; tone?: "default" | "danger"; children: ReactNode }) {
  const close = useContext(CloseCtx);
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        close();
        onSelect();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-sm [&_svg]:h-4 [&_svg]:w-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft",
        tone === "danger" ? "text-danger hover:bg-danger-tint" : "text-fg hover:bg-tint",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/** Non-interactive block at the top of a menu, e.g. the signed-in user's name and role. */
export function MenuHeader({ children }: { children: ReactNode }) {
  return <div className="mb-1 border-b border-line px-3 pb-2.5 pt-1.5">{children}</div>;
}
