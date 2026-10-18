import { X } from "lucide-react";
import Swatch from "@/components/ui/Swatch";
import type { LookupItem } from "@/types";

/** A chosen colour with its dot and a remove button (Sizes & colours, Colours in the design). */
export default function ColorChip({ color, removeLabel, onRemove }: { color?: LookupItem; removeLabel: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-tint py-0.5 pl-2 pr-1 text-sm font-semibold text-primary">
      <Swatch hex={color?.hexCode} hex2={color?.hexCode2} />
      {color?.name ?? "—"}
      <button type="button" aria-label={removeLabel} onClick={onRemove} className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-danger-tint hover:text-danger">
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
