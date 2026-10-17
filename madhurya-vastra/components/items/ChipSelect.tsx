"use client";

import { LookupItem } from "@/types";

interface Props {
  options: LookupItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

export default function ChipSelect({ options, selected, onChange }: Props) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => toggle(o.id)}
            aria-pressed={active}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              active
                ? "bg-brand-primary border-brand-primary text-white"
                : "bg-white border-gray-300 text-gray-600 hover:border-brand-secondary"
            }`}
          >
            {o.name}
          </button>
        );
      })}
    </div>
  );
}
