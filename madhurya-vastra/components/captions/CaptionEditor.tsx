"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Braces } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { Chip, ChipGroup } from "@/components/ui/Chip";
import { TextAreaField, TextField } from "@/components/ui/Input";
import {
  buildCaption, DETAIL_FIELDS, TEMPLATE_BODY_MAX, TEMPLATE_NAME_MAX, templateProblem, isDetailKey, type DetailKey, type TemplateKind,
} from "@/lib/caption";
import { SAMPLE_ITEM } from "./sample";
import type { CaptionTemplate } from "@/types";

export type TemplateDraft = { name: string; body: string; defaultDetails: DetailKey[]; isDefault: boolean };

type Props = {
  open: boolean;
  kind: TemplateKind;
  /** The template being changed; absent when adding. */
  initial?: CaptionTemplate;
  /** Default shop details, shown under a caption's preview; for shop details, the default caption text. */
  previewWith: string | null;
  /** Resolves when the server saved it; throws with the server's sentence otherwise (the form stays filled). */
  onSave: (draft: TemplateDraft) => Promise<void>;
  onClose: () => void;
};

const NOUN: Record<TemplateKind, string> = { caption: "caption", shop_details: "shop details" };

/** Add or change one caption or shop-details template, with a live preview on a sample item. */
export default function CaptionEditor({ open, kind, initial, previewWith, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<TemplateDraft>({ name: "", body: "", defaultDetails: [], isDefault: false });
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const isCaption = kind === "caption";

  useEffect(() => {
    if (!open) return;
    setDraft({
      name: initial?.name ?? "",
      body: initial?.body ?? "",
      defaultDetails: (initial?.defaultDetails ?? []).filter(isDetailKey),
      isDefault: initial?.isDefault ?? false,
    });
    setError(null);
    setTouched(false);
  }, [open, initial]);

  const problem = templateProblem(kind, { ...draft, defaultDetails: isCaption ? draft.defaultDetails : undefined });
  const shown = touched ? (error ?? problem) : error;
  const nameError = shown && /\bname\b/i.test(shown) ? shown : null;
  const bodyError = shown && !nameError ? shown : null;

  const preview = useMemo(
    () =>
      isCaption
        ? buildCaption({ template: draft.body, item: SAMPLE_ITEM, details: draft.defaultDetails, shop: previewWith })
        : buildCaption({ template: previewWith, item: SAMPLE_ITEM, details: [], shop: draft.body }),
    [isCaption, draft.body, draft.defaultDetails, previewWith],
  );

  /** Puts {title} where the cursor is (or at the end), then puts the cursor after it. */
  const insertTitle = () => {
    const el = bodyRef.current;
    const at = el ? el.selectionStart : draft.body.length;
    const end = el ? el.selectionEnd : draft.body.length;
    const next = draft.body.slice(0, at) + "{title}" + draft.body.slice(end);
    setDraft((d) => ({ ...d, body: next }));
    setError(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + 7, at + 7);
    });
  };

  const save = async () => {
    setTouched(true);
    if (problem) return;
    setSaving(true);
    try {
      await onSave({ ...draft, name: draft.name.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Not saved. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const idp = `tpl-${kind}`;
  return (
    <Dialog
      open={open}
      size="md"
      busy={saving}
      title={initial ? `Change “${initial.name}”` : isCaption ? "New caption" : "New shop details"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void save()} loading={saving}>{initial ? "Save changes" : `Add ${NOUN[kind]}`}</Button>
        </>
      }
    >
      <TextField
        id={`${idp}-name`}
        label="Name"
        required
        help={isCaption ? "Only staff see it, e.g. “New arrival” or “Diwali offer”." : "Only staff see it, e.g. “Shop — full” or “Short”."}
        value={draft.name}
        maxLength={TEMPLATE_NAME_MAX}
        count={{ value: draft.name.trim().length, max: TEMPLATE_NAME_MAX }}
        error={nameError}
        onChange={(e) => {
          setDraft((d) => ({ ...d, name: e.target.value }));
          setError(null);
        }}
      />

      <TextAreaField
        ref={bodyRef}
        id={`${idp}-body`}
        label="Text"
        required
        rows={6}
        help={
          isCaption
            ? "Written as customers will read it. {title} becomes the item’s name; a line with {title} is left out when sharing without an item."
            : "Shop name, address, phone, WhatsApp, Instagram, Facebook, website — added at the end of every message."
        }
        value={draft.body}
        maxLength={TEMPLATE_BODY_MAX}
        count={{ value: draft.body.length, max: TEMPLATE_BODY_MAX }}
        error={bodyError}
        onChange={(e) => {
          setDraft((d) => ({ ...d, body: e.target.value }));
          setError(null);
        }}
      />
      {isCaption && (
        <div>
          <Button variant="ghost" size="sm" icon={<Braces />} onClick={insertTitle}>Insert item name</Button>
        </div>
      )}

      {isCaption && (
        <div className="grid gap-2">
          <span id={`${idp}-details`} className="text-sm font-semibold text-fg">Details ticked when sharing an item</span>
          <ChipGroup
            multiple
            labelledBy={`${idp}-details`}
            options={DETAIL_FIELDS.map((f) => ({ value: f.key, label: f.label }))}
            value={draft.defaultDetails}
            onChange={(v) => setDraft((d) => ({ ...d, defaultDetails: v.filter(isDetailKey) }))}
          />
          <p className="text-sm">Staff can still tick or untick them before sending. Price is off unless you tick it.</p>
        </div>
      )}

      {initial?.isDefault ? (
        <p className="text-sm">This is the default {NOUN[kind]}: the share sheet starts with it.</p>
      ) : (
        <div>
          <Chip selected={draft.isDefault} onClick={() => setDraft((d) => ({ ...d, isDefault: !d.isDefault }))}>
            Use as the default {NOUN[kind]}
          </Chip>
        </div>
      )}

      <div className="grid gap-1.5">
        <span className="text-sm font-semibold text-fg">Preview with a sample item</span>
        <p className="whitespace-pre-wrap break-words rounded-md bg-tint p-3 text-sm text-fg" aria-live="polite">
          {preview || "Type the text above to see the message."}
        </p>
      </div>
    </Dialog>
  );
}
