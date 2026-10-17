"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { LookupItem } from "@/types";

interface Props {
  options: LookupItem[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  /** When set, renders a footer action at the bottom of the dropdown. */
  addLabel?: string;
  onAdd?: () => void;
  /** Hide options already used (e.g. colors already in the matrix). */
  excludeIds?: string[];
  renderOption?: (o: LookupItem) => ReactNode;
  /** Keep the dropdown open-on-mount and clear after pick (used by "Add Color"). */
  pickerMode?: boolean;
  onClose?: () => void;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  addLabel,
  onAdd,
  excludeIds = [],
  renderOption,
  pickerMode = false,
  onClose,
}: Props) {
  const [open, setOpen] = useState(pickerMode);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        onClose?.();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  const selected = options.find((o) => o.id === value);
  const filtered = options.filter(
    (o) => !excludeIds.includes(o.id) && o.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const pick = (id: string | null) => {
    onChange(id);
    setSearch("");
    setOpen(false);
    onClose?.();
  };

  const dropdown = (
    <div className="absolute z-30 mt-1 w-full min-w-[12rem] bg-white border border-gray-200 rounded-input shadow-lg">
      <input
        autoFocus
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Type to search…"
        className="w-full px-3 py-2 text-sm border-b border-gray-100 rounded-t-input focus:outline-none"
      />
      <ul className="max-h-56 overflow-y-auto">
        {filtered.length === 0 && <li className="px-3 py-2 text-sm text-brand-text-muted">No matches</li>}
        {filtered.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => pick(o.id)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-primary/10 ${
                o.id === value ? "bg-brand-primary/5 font-medium" : ""
              }`}
            >
              {renderOption ? renderOption(o) : o.name}
            </button>
          </li>
        ))}
      </ul>
      {addLabel && onAdd && (
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onAdd();
          }}
          className="w-full flex items-center gap-1 px-3 py-2 text-sm text-brand-primary font-medium border-t border-gray-100 hover:bg-brand-primary/5 rounded-b-input"
        >
          <Plus className="w-4 h-4" /> {addLabel}
        </button>
      )}
    </div>
  );

  if (pickerMode) {
    return (
      <div ref={wrapRef} className="relative">
        {open && dropdown}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-input text-sm bg-white text-left"
      >
        <span className={selected ? "text-brand-text-primary" : "text-brand-text-muted"}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      {open && dropdown}
    </div>
  );
}
