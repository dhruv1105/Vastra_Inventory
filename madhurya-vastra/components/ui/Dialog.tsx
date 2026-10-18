"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons row. On phones they stack full width. */
  footer?: ReactNode;
  /** Element to focus on open; defaults to the first focusable element. */
  initialFocus?: RefObject<HTMLElement>;
  /** "alertdialog" for confirmations that interrupt. */
  role?: "dialog" | "alertdialog";
  /** Block closing (Esc / backdrop) while work is running. */
  busy?: boolean;
  size?: "sm" | "md";
};

/**
 * Modal base: bottom sheet on phones, centred from `sm` up; long content scrolls between a fixed
 * title and buttons. Focus moves in, Tab stays inside,
 * Esc and a backdrop click close (unless busy), focus returns to where it was.
 */
export default function Dialog({ open, title, onClose, children, footer, initialFocus, role = "dialog", busy, size = "sm" }: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (initialFocus?.current ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE))?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab" && panel.current) {
        const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
    // initialFocus is a ref; reading .current on open is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-dialog flex items-end justify-center bg-fg/50 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panel}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={cn(
          "animate-slide-up flex max-h-[90dvh] w-full flex-col gap-3 rounded-t-lg bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-lg sm:pb-5",
          size === "sm" ? "sm:max-w-md" : "sm:max-w-2xl",
        )}
      >
        <h2 id={titleId} className="font-display text-xl text-fg">{title}</h2>
        {/* Only the body scrolls: title and buttons stay in view however long the content is.
            -mx-1/px-1/py-1 leave room for focus rings at the scroll edges. */}
        <div id={bodyId} className="-mx-1 grid min-h-0 gap-3 overflow-y-auto px-1 py-1 text-muted">{children}</div>
        {footer && <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
