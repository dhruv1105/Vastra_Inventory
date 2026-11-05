"use client";

import { Pencil, Trash2 } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Swatch from "@/components/ui/Swatch";
import type { LookupItem } from "@/types";
import LookupEditor, { type LookupDraft } from "./LookupEditor";
import type { ListConfig } from "./lists";

type Props = {
  list: ListConfig;
  items: LookupItem[];
  /** Row being edited, or "new" while adding. */
  editing: string | null;
  onStartEdit: (id: string) => void;
  onCancel: () => void;
  onCreate: (draft: LookupDraft) => Promise<void>;
  onUpdate: (id: string, draft: LookupDraft) => Promise<void>;
  onAskDelete: (item: LookupItem) => void;
  /** Sellers: names only, no rename / delete buttons. */
  readOnly?: boolean;
};

/** One surface of rows (two columns on wide screens). Rows edit in place. */
export default function LookupList({ list, items, editing, onStartEdit, onCancel, onCreate, onUpdate, onAskDelete, readOnly }: Props) {
  return (
    <div className="grid overflow-hidden rounded-lg border border-line bg-surface lg:grid-cols-2">
      {editing === "new" && (
        <div className="border-b border-line lg:col-span-2">
          <LookupEditor idPrefix={`${list.key}-new`} singular={list.singular} hasColor={list.hasColor} onSave={onCreate} onCancel={onCancel} />
        </div>
      )}
      {items.map((item, i) =>
        editing === item.id ? (
          <div key={item.id} className="border-b border-line lg:col-span-2">
            <LookupEditor
              idPrefix={`${list.key}-${item.id}`}
              initial={{ name: item.name, hexCode: item.hexCode ?? "", hexCode2: item.hexCode2 ?? "" }}
              singular={list.singular}
              hasColor={list.hasColor}
              onSave={(d) => onUpdate(item.id, d)}
              onCancel={onCancel}
            />
          </div>
        ) : (
          <div
            key={item.id}
            className={`flex min-h-14 items-center gap-3 border-b border-line py-1.5 pl-4 pr-2 ${i % 2 === 0 ? "lg:border-r" : ""}`}
          >
            {list.hasColor && (
              <Swatch size="md" hex={item.hexCode} hex2={item.hexCode2} />
            )}
            <span className="min-w-0 flex-1 truncate font-medium text-fg">{item.name}</span>
            {list.hasColor && item.hexCode && (
              <span className="font-mono text-xs uppercase tabular-nums text-muted">{[item.hexCode, item.hexCode2].filter(Boolean).join(" · ")}</span>
            )}
            {!readOnly && (
            <span className="flex shrink-0">
              <IconButton label={`Rename ${item.name}`} onClick={() => onStartEdit(item.id)}>
                <Pencil />
              </IconButton>
              <IconButton label={`Delete ${item.name}`} tone="danger" onClick={() => onAskDelete(item)}>
                <Trash2 />
              </IconButton>
            </span>
            )}
          </div>
        ),
      )}
    </div>
  );
}
