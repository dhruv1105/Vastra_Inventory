"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import Button from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";

type Props = {
  /** First sign-in after a temporary password: wording changes, no cancel. */
  firstTime?: boolean;
  onDone: () => void | Promise<void>;
  onCancel?: () => void;
};

/** Change your own password. Signs out your other devices. */
export default function ChangePasswordForm({ firstTime, onDone, onCancel }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!current) return setError(firstTime ? "Enter the temporary password the owner gave you." : "Enter your current password.");
    if (next.length < 8) return setError("The new password needs at least 8 characters.");
    if (next !== again) return setError("The two new passwords don't match.");
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "The password was not changed. Try again.");
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The password was not changed. Try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-3">
      {/* Hidden username helps password managers save the new password against the right account. */}
      <TextField
        id="pw-current"
        label={firstTime ? "Temporary password" : "Current password"}
        type="password"
        autoComplete="current-password"
        value={current}
        onChange={(e) => {
          setCurrent(e.target.value);
          setError(null);
        }}
      />
      <TextField
        id="pw-new"
        label="New password"
        type="password"
        autoComplete="new-password"
        help="At least 8 characters. A short sentence is easy to remember."
        value={next}
        onChange={(e) => {
          setNext(e.target.value);
          setError(null);
        }}
      />
      <TextField
        id="pw-again"
        label="New password again"
        type="password"
        autoComplete="new-password"
        value={again}
        onChange={(e) => {
          setAgain(e.target.value);
          setError(null);
        }}
      />
      {error && (
        <p role="alert" className="rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button type="submit" icon={<KeyRound />} loading={busy}>
          {firstTime ? "Save and continue" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
