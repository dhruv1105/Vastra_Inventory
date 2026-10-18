"use client";

import { useRef, useState, type ReactNode } from "react";
import Button from "./Button";
import Dialog from "./Dialog";

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

/** Replaces window.confirm everywhere. Focus starts on the safe choice. */
export default function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = "Cancel", tone = "danger", onConfirm, onCancel }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      role="alertdialog"
      busy={busy}
      initialFocus={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={confirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
