"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { HEX, NAME_MAX } from "./lists";

export type LookupDraft = { name: string; hexCode: string };

type Props = {
  /** Starting values; empty for a new value. */
  initial?: LookupDraft;
  singular: string;
  hasColor?: boolean;
  /** Resolves when saved; throws with a message to show under the field. */
  onSave: (draft: LookupDraft) => Promise<void>;
  onCancel: () => void;
  /** Prefix for input ids, unique per row. */
  idPrefix: string;
};

/** Inline row editor for adding or renaming a list value (with colour for Colours). */
export default function LookupEditor({ initial = { name: "", hexCode: "" }, singular, hasColor, onSave, onCancel, idPrefix }: Props) {
  const [name, setName] = useState(initial.name);
  const [hex, setHex] = useState(initial.hexCode);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  const save = async () => {
    const n = name.trim();
    if (!n) return setError(`Give the ${singular} a name.`);
    if (n.length > NAME_MAX) return setError(`Keep it to ${NAME_MAX} characters or fewer.`);
    if (hasColor && hex && !HEX.test(hex)) return setError("Colour codes look like #800000.");
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: n, hexCode: hex });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
      setSaving(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    }
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className="grid gap-2 bg-tint px-4 py-3" onKeyDown={onKey}>
      <div className="flex flex-wrap items-center gap-2">
        {hasColor && (
          <label className="relative grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-surface" title="Pick a colour">
            <span className="sr-only">Pick a colour</span>
            <span className="h-7 w-7 rounded-full border border-line" style={{ backgroundColor: HEX.test(hex) ? hex : "transparent" }} />
            <input
              type="color"
              value={HEX.test(hex) ? hex : "#800000"}
              onChange={(e) => setHex(e.target.value.toUpperCase())}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        )}
        <Input
          ref={nameRef}
          id={`${idPrefix}-name`}
          aria-label={`${singular} name`}
          placeholder={`New ${singular}`}
          value={name}
          maxLength={NAME_MAX}
          invalid={!!error}
          aria-describedby={error ? `${idPrefix}-error` : undefined}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          className="min-w-0 flex-1 basis-40"
        />
        {hasColor && (
          <Input
            id={`${idPrefix}-hex`}
            aria-label="Colour code"
            placeholder="#800000"
            value={hex}
            maxLength={7}
            onChange={(e) => {
              setHex(e.target.value.toUpperCase());
              setError(null);
            }}
            className="w-28 font-mono tabular-nums"
          />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span id={`${idPrefix}-error`} className="text-sm text-danger" aria-live="polite">
          {error}
        </span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" icon={<Check />} onClick={save} loading={saving}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
