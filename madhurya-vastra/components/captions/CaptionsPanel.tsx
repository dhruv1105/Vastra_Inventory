"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api-client";
import type { TemplateKind } from "@/lib/caption";
import type { CaptionTemplate } from "@/types";
import CaptionTemplates from "./CaptionTemplates";
import CaptionEditor, { type TemplateDraft } from "./CaptionEditor";

const URL_ = "/api/caption-templates";
const label = (t: CaptionTemplate) => (t.kind === "caption" ? "caption" : "shop details");

/** Defaults first, then by name — the order the server sends. */
const sorted = (list: CaptionTemplate[]) =>
  [...list].sort((a, b) => a.kind.localeCompare(b.kind) || Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));

export type CaptionsPanelProps = {
  /** Text-only share of a caption, opened by the page (the share sheet). */
  onShare?: (t: CaptionTemplate, all: CaptionTemplate[]) => void;
};

/** Manage Lists → Captions tab: loads the templates and runs add / change / default / delete. */
export default function CaptionsPanel({ onShare }: CaptionsPanelProps) {
  const { showToast } = useToast();
  const [list, setList] = useState<CaptionTemplate[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState<{ kind: TemplateKind; template?: CaptionTemplate } | null>(null);
  const [toDelete, setToDelete] = useState<CaptionTemplate | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setList(await apiFetch<CaptionTemplate[]>(URL_));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Puts the saved row in; when it became the default, the old default of its kind is no longer one. */
  const put = (row: CaptionTemplate) =>
    setList((l) => sorted([...l.filter((t) => t.id !== row.id).map((t) => (row.isDefault && t.kind === row.kind ? { ...t, isDefault: false } : t)), row]));

  const save = async (d: TemplateDraft) => {
    if (!editing) return;
    const body = JSON.stringify({ name: d.name, body: d.body, ...(editing.kind === "caption" ? { defaultDetails: d.defaultDetails } : {}), ...(d.isDefault ? { isDefault: true } : {}) });
    const row = editing.template
      ? await apiFetch<CaptionTemplate>(`${URL_}/${editing.template.id}`, { method: "PATCH", body })
      : await apiFetch<CaptionTemplate>(URL_, { method: "POST", body: JSON.stringify({ kind: editing.kind, ...JSON.parse(body) }) });
    put(row);
    setEditing(null);
    showToast(editing.template ? "Saved" : `Added “${row.name}”`, "success");
  };

  const makeDefault = async (t: CaptionTemplate) => {
    try {
      put(await apiFetch<CaptionTemplate>(`${URL_}/${t.id}`, { method: "PATCH", body: JSON.stringify({ isDefault: true }) }));
      showToast(`“${t.name}” is now the default ${label(t)}`, "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Not saved. Try again.", "error");
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await apiFetch(`${URL_}/${toDelete.id}`, { method: "DELETE" });
      setList((l) => l.filter((t) => t.id !== toDelete.id));
      showToast(`Deleted “${toDelete.name}”`, "success");
      setToDelete(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not delete. Try again.", "error");
    }
  };

  const defaultOf = (kind: TemplateKind) => (list.find((t) => t.kind === kind && t.isDefault) ?? list.find((t) => t.kind === kind))?.body ?? null;

  if (status === "loading") return <SkeletonRows rows={5} label="Loading captions" />;
  if (status === "error") {
    return (
      <EmptyState compact title="The captions didn’t load" action={<Button variant="secondary" icon={<RotateCw />} onClick={load}>Try again</Button>}>
        The server could not be reached. Check that the app is running, then try again.
      </EmptyState>
    );
  }

  return (
    <>
      <CaptionTemplates
        templates={list}
        onAdd={(kind) => setEditing({ kind })}
        onEdit={(template) => setEditing({ kind: template.kind, template })}
        onMakeDefault={(t) => void makeDefault(t)}
        onAskDelete={setToDelete}
        onShare={onShare && ((t) => onShare(t, list))}
      />

      <CaptionEditor
        open={!!editing}
        kind={editing?.kind ?? "caption"}
        initial={editing?.template}
        previewWith={editing?.kind === "shop_details" ? defaultOf("caption") : defaultOf("shop_details")}
        onSave={save}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete “${toDelete?.name ?? ""}”?`}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onCancel={() => setToDelete(null)}
        onConfirm={remove}
      >
        {toDelete?.isDefault
          ? `It is the default ${toDelete ? label(toDelete) : ""}. After deleting, the share sheet starts with the first one left.`
          : "Staff can no longer pick it when sharing. Messages already sent don’t change."}
      </ConfirmDialog>
    </>
  );
}
