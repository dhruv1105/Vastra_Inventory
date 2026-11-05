"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RotateCw, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/context/ToastContext";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LookupList from "@/components/lookups/LookupList";
import type { LookupDraft } from "@/components/lookups/LookupEditor";
import { byName, LISTS, type ListKey } from "@/components/lookups/lists";
import { apiFetch } from "@/lib/api-client";
import CaptionsPanel from "@/components/captions/CaptionsPanel";
import ShareSheet from "@/components/share/ShareSheet";
import type { LookupItem } from "@/types";

type Data = Record<ListKey, LookupItem[]>;
const EMPTY: Data = { types: [], colors: [], occasions: [], tags: [] };
/** Captions and shop details: a tab of its own that owner and sellers can change (docs/plans/sharing.md). */
const CAPTIONS = "captions";
type TabKey = ListKey | typeof CAPTIONS;

export default function ManageListsPage() {
  const { user } = useAuth();
  // Sellers can look up the lists; only the owner changes them (the API enforces this too).
  const canEdit = user?.role === "owner";
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabKey>("types");
  const [data, setData] = useState<Data>(EMPTY);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<LookupItem | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);

  const onCaptions = tab === CAPTIONS;
  // On the Captions tab `list` is unused; the lookup handlers below only run on lookup tabs.
  const list = LISTS.find((l) => l.key === tab) ?? LISTS[0];
  const listKey = list.key;

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const results = await Promise.all(LISTS.map((l) => apiFetch<LookupItem[]>(`/api/lookups/${l.endpoint}`)));
      setData(Object.fromEntries(LISTS.map((l, i) => [l.key, results[i] ?? []])) as Data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeTab = (key: string) => {
    setTab(key as TabKey);
    setQ("");
    setEditing(null);
  };

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? data[listKey].filter((i) => i.name.toLowerCase().includes(needle)) : data[listKey];
  }, [data, listKey, q]);

  const put = (key: ListKey, next: LookupItem[]) => setData((d) => ({ ...d, [key]: [...next].sort(byName) }));

  const body = (draft: LookupDraft) =>
    JSON.stringify({ name: draft.name, ...(list.hasColor ? { hexCode: draft.hexCode || null, hexCode2: draft.hexCode2 || null } : {}) });

  const create = async (draft: LookupDraft) => {
    const item = await apiFetch<LookupItem>(`/api/lookups/${list.endpoint}`, { method: "POST", body: body(draft) });
    put(listKey, [...data[listKey], item]);
    setEditing(null);
    showToast(`Added “${item.name}”`, "success");
  };

  const update = async (id: string, draft: LookupDraft) => {
    const item = await apiFetch<LookupItem>(`/api/lookups/${list.endpoint}/${id}`, { method: "PATCH", body: body(draft) });
    put(listKey, data[listKey].map((i) => (i.id === id ? item : i)));
    setEditing(null);
    showToast("Saved", "success");
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await apiFetch(`/api/lookups/${list.endpoint}/${toDelete.id}`, { method: "DELETE" });
      put(listKey, data[listKey].filter((i) => i.id !== toDelete.id));
      showToast(`Deleted “${toDelete.name}”`, "success");
      setToDelete(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not delete. Try again.", "error");
    }
  };

  const startAdd = () => {
    setQ("");
    setEditing("new");
  };

  return (
    <div className="mv-stagger mx-auto grid max-w-5xl grid-cols-1 gap-5 px-4 py-5 md:px-7 md:py-7">
      <PageHeader
        eyebrow="Shop settings"
        title="Manage Lists"
        subtitle={
          onCaptions
            ? "The wording staff use when sharing items to WhatsApp and Instagram. Everyone can change it."
            : canEdit
              ? "The choices staff pick from when adding an item."
              : "The choices staff pick from when adding an item. Only the owner can change them."
        }
        action={
          canEdit && !onCaptions && (
            <Button icon={<Plus />} onClick={startAdd} disabled={status !== "ready"}>
              Add {list.singular}
            </Button>
          )
        }
      />

      <div className="grid gap-4">
        <Tabs
          label="Lists"
          idPrefix="lists"
          tabs={[...LISTS.map((l) => ({ id: l.key, label: l.label, count: status === "ready" ? data[l.key].length : undefined })), { id: CAPTIONS, label: "Captions" }]}
          value={tab}
          onChange={changeTab}
        />

        <div id={`lists-panel-${tab}`} role="tabpanel" aria-labelledby={`lists-tab-${tab}`} className="grid gap-3">
          {onCaptions && <CaptionsPanel onShare={(t) => setSharing(t.id)} />}

          {!onCaptions && status === "loading" && <SkeletonRows rows={6} label={`Loading ${list.label.toLowerCase()}`} />}

          {!onCaptions && status === "error" && (
            <EmptyState compact title="The lists didn’t load" action={<Button variant="secondary" icon={<RotateCw />} onClick={load}>Try again</Button>}>
              The server could not be reached. Check that the app is running, then try again.
            </EmptyState>
          )}

          {!onCaptions && status === "ready" && (
            <>
              <Input
                type="search"
                leading={<Search />}
                aria-label={`Search ${list.label.toLowerCase()}`}
                placeholder={`Search ${list.label.toLowerCase()}`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />

              {shown.length > 0 || editing === "new" ? (
                <>
                  <LookupList
                    list={list}
                    items={shown}
                    editing={editing}
                    onStartEdit={setEditing}
                    onCancel={() => setEditing(null)}
                    onCreate={create}
                    onUpdate={update}
                    onAskDelete={setToDelete}
                    readOnly={!canEdit}
                  />
                  <p className="text-sm text-muted" aria-live="polite">
                    {q.trim() ? `${shown.length} of ${data[listKey].length} ${list.label.toLowerCase()}` : `${data[listKey].length} ${list.label.toLowerCase()}`}
                  </p>
                </>
              ) : q.trim() ? (
                <EmptyState compact title={`No ${list.label.toLowerCase()} match “${q.trim()}”`} action={<Button variant="secondary" onClick={() => setQ("")}>Clear search</Button>}>
                  Check the spelling, or add it as a new {list.singular}.
                </EmptyState>
              ) : (
                <EmptyState compact title={`No ${list.label.toLowerCase()} yet`} action={canEdit && <Button icon={<Plus />} onClick={startAdd}>Add {list.singular}</Button>}>
                  {canEdit ? "Staff pick from this list when adding an item. Add the first one." : "The owner hasn't added any yet."}
                </EmptyState>
              )}
            </>
          )}
        </div>
      </div>

      <ShareSheet open={!!sharing} onClose={() => setSharing(null)} item={null} templateId={sharing ?? undefined} />

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete “${toDelete?.name ?? ""}”?`}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onCancel={() => setToDelete(null)}
        onConfirm={remove}
      >
        It disappears from the choices on Add Item. Items that already use “{toDelete?.name}” keep it.
      </ConfirmDialog>
    </div>
  );
}
