"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Swatch from "@/components/ui/Swatch";
import { HEX, NAME_MAX } from "./lists";

/** hexCode2: second colour of a combination ("Red & Gold"); "" = a single colour. */
export type LookupDraft = { name: string; hexCode: string; hexCode2?: string };

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

/** Inline row editor for adding or renaming a list value (with colour, and an optional second colour, for Colours). */
export default function LookupEditor({ initial = { name: "", hexCode: "" }, singular, hasColor, onSave, onCancel, idPrefix }: Props) {
  const [name, setName] = useState(initial.name);
  const [hex, setHex] = useState(initial.hexCode);
  const [hex2, setHex2] = useState(initial.hexCode2 ?? "");
  const [twoTone, setTwoTone] = useState(!!initial.hexCode2);
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
    if (hasColor && twoTone && hex2 && !HEX.test(hex2)) return setError("Colour codes look like #800000.");
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: n, hexCode: hex, hexCode2: twoTone ? hex2 : "" });
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
          <ColourWell label="Pick a colour" value={hex} other={twoTone && HEX.test(hex2) ? hex2 : null} onChange={setHex} />
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
      {hasColor &&
        (twoTone ? (
          <div className="flex flex-wrap items-center gap-2">
            <ColourWell label="Pick the second colour" value={hex2} onChange={setHex2} />
            <Input
              id={`${idPrefix}-hex2`}
              aria-label="Second colour code"
              placeholder="#D4AF37"
              value={hex2}
              maxLength={7}
              onChange={(e) => {
                setHex2(e.target.value.toUpperCase());
                setError(null);
              }}
              className="w-28 font-mono tabular-nums"
            />
            <Button size="sm" variant="ghost" icon={<X />} onClick={() => setTwoTone(false)}>
              Single colour
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => setTwoTone(true)} className="w-fit">
            Second colour (for combinations like Red &amp; Gold)
          </Button>
        ))}
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

/** A round colour well: the dot shows the colour (half and half with `other`); tapping opens the picker. */
function ColourWell({ label, value, other, onChange }: { label: string; value: string; other?: string | null; onChange: (hex: string) => void }) {
  return (
    <label className="relative grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-surface" title={label}>
      <span className="sr-only">{label}</span>
      <Swatch size="md" hex={HEX.test(value) ? value : null} hex2={other} />
      <input
        type="color"
        value={HEX.test(value) ? value : "#800000"}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}
