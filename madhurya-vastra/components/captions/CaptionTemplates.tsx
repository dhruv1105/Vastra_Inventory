"use client";

import { MoreVertical, Pencil, Plus, Send, Star, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import IconButton from "@/components/ui/IconButton";
import Menu, { MenuItem } from "@/components/ui/Menu";
import EmptyState from "@/components/ui/EmptyState";
import type { TemplateKind } from "@/lib/caption";
import type { CaptionTemplate } from "@/types";

type Props = {
  templates: CaptionTemplate[];
  onAdd: (kind: TemplateKind) => void;
  onEdit: (t: CaptionTemplate) => void;
  onMakeDefault: (t: CaptionTemplate) => void;
  onAskDelete: (t: CaptionTemplate) => void;
  /** Text-only share of a caption (no item). */
  onShare?: (t: CaptionTemplate) => void;
};

const GROUPS: { kind: TemplateKind; title: string; about: string; add: string; empty: string }[] = [
  {
    kind: "caption",
    title: "Captions",
    about: "The message sent with an item, or on its own (new collection, offers). Share one on its own from here.",
    add: "Add caption",
    empty: "Without a caption, sharing an item starts from its name.",
  },
  {
    kind: "shop_details",
    title: "Shop details",
    about: "Added at the end of every message: shop name, phone, WhatsApp, Instagram, Facebook, website.",
    add: "Add shop details",
    empty: "Without shop details, messages end after the caption.",
  },
];

/** First non-empty line, so a row shows what the text starts with ({title} as "[item name]"). */
const firstLine = (body: string) => (body.split(/\r?\n/).find((l) => l.trim())?.trim() ?? "").replaceAll("{title}", "[item name]");

/** Manage Lists → Captions: the two groups of templates. Owner and sellers can change them. */
export default function CaptionTemplates({ templates, onAdd, onEdit, onMakeDefault, onAskDelete, onShare }: Props) {
  return (
    <div className="grid gap-6">
      {GROUPS.map((g) => {
        const rows = templates.filter((t) => t.kind === g.kind);
        return (
          <section key={g.kind} aria-labelledby={`captions-${g.kind}`} className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="grid gap-0.5">
                <h2 id={`captions-${g.kind}`} className="font-display text-xl text-fg">{g.title}</h2>
                <p className="text-sm text-muted">{g.about}</p>
              </div>
              <Button variant="secondary" size="sm" icon={<Plus />} onClick={() => onAdd(g.kind)}>{g.add}</Button>
            </div>

            {rows.length === 0 ? (
              <EmptyState compact title={`No ${g.title.toLowerCase()} yet`} action={<Button icon={<Plus />} onClick={() => onAdd(g.kind)}>{g.add}</Button>}>
                {g.empty}
              </EmptyState>
            ) : (
              <ul className="grid overflow-hidden rounded-lg border border-line bg-surface">
                {rows.map((t) => (
                  <li key={t.id} className="flex min-h-16 items-center gap-2 border-b border-line py-1.5 pl-2 pr-2 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => onEdit(t)}
                      className="grid min-h-12 min-w-0 flex-1 gap-0.5 rounded-md px-2 py-1 text-left hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft"
                      aria-label={`Change ${t.name}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium text-fg">{t.name}</span>
                        {t.isDefault && <Badge tone="primary">Default</Badge>}
                      </span>
                      <span className="truncate text-sm text-muted">{firstLine(t.body)}</span>
                    </button>
                    {g.kind === "caption" && onShare && (
                      <IconButton label={`Share ${t.name} as a message`} onClick={() => onShare(t)}>
                        <Send />
                      </IconButton>
                    )}
                    <Menu
                      label={`More actions for ${t.name}`}
                      trigger={<MoreVertical aria-hidden="true" className="h-5 w-5" />}
                      triggerClassName="grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-tint hover:text-primary"
                    >
                      <MenuItem icon={<Pencil />} onSelect={() => onEdit(t)}>Change</MenuItem>
                      {!t.isDefault && <MenuItem icon={<Star />} onSelect={() => onMakeDefault(t)}>Make default</MenuItem>}
                      <MenuItem tone="danger" icon={<Trash2 />} onSelect={() => onAskDelete(t)}>Delete</MenuItem>
                    </Menu>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
