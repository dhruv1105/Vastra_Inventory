"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Button from "./Button";

export type ConfirmDialogProps = {
  open: boolean;
  /** A question naming the thing: `Delete "Crepe"?` */
  title: string;
  /** What will happen, in plain words. */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  /** May return a promise; the confirm button shows loading until it settles. */
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Replaces window.confirm everywhere. Bottom sheet on phones, centred dialog from `sm` up.
 * Focus starts on the safe choice, Tab stays inside, Esc cancels, focus returns on close.
 */
export default function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = "Cancel", tone = "danger", onConfirm, onCancel }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onCancel();
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
  }, [open, busy, onCancel]);

  if (!open || typeof document === "undefined") return null;

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-dialog flex items-end justify-center bg-fg/50 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={children ? bodyId : undefined}
        className="animate-slide-up grid w-full gap-3 rounded-t-lg bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:max-w-md sm:rounded-lg sm:pb-5"
      >
        <h2 id={titleId} className="font-display text-xl text-fg">{title}</h2>
        {children && <div id={bodyId} className="text-muted">{children}</div>}
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy} className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={confirm} loading={busy} className="w-full sm:w-auto">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
