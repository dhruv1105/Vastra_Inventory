"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Swatch from "@/components/ui/Swatch";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { LookupItem } from "@/types";

type Props = {
  open: boolean;
  title: string;
  colors: LookupItem[];
  /** Chosen colour ids. */
  value: string[];
  /** Called with the new choice when the person taps Done. */
  onDone: (ids: string[]) => void;
  onClose: () => void;
};

/**
 * Choose several colours at once: a searchable tick list (bottom sheet on phones). The choice is
 * applied only on Done, so Cancel leaves the form as it was. New ids keep the list's order.
 */
export default function ColorPicker({ open, title, colors, value, onDone, onClose }: Props) {
  const [picked, setPicked] = useState<string[]>(value);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (open) {
      setPicked(value);
      setQ("");
    }
    // Reset only when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? colors.filter((c) => c.name.toLowerCase().includes(term)) : colors;
  }, [colors, q]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={<Check />} onClick={() => onDone(picked)}>
            {picked.length ? `Done (${picked.length})` : "Done"}
          </Button>
        </>
      }
    >
      {colors.length > 8 && (
        <Input leading={<Search />} type="search" aria-label="Search colours" placeholder="Search colours" value={q} onChange={(e) => setQ(e.target.value)} />
      )}
      {shown.length === 0 ? (
        <p>
          {colors.length === 0 ? "There are no colours yet." : `No colour matches “${q.trim()}”.`} Add colours on Manage Lists.
        </p>
      ) : (
        <ul role="group" aria-label={title} className="grid gap-1 sm:grid-cols-2">
          {shown.map((c) => {
            const on = picked.includes(c.id);
            return (
              <li key={c.id}>
                <label
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-fg transition-colors duration-fast ease-brand",
                    on ? "border-primary bg-tint font-semibold" : "border-transparent hover:bg-tint",
                  )}
                >
                  <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="h-5 w-5 shrink-0 accent-primary" />
                  <Swatch hex={c.hexCode} />
                  <span className="truncate">{c.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
