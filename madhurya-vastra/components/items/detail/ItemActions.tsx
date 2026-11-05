"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, MoreVertical, Send, Trash2 } from "lucide-react";
import Menu, { MenuItem } from "@/components/ui/Menu";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { ItemStatus } from "@/types";

type Props = {
  item: { id: string; title: string; status: ItemStatus; version: string };
  isOwner: boolean;
  /** The server's answer after publish / archive / restore. */
  onChanged: (next: { status: ItemStatus; version: string }) => void;
  /** Someone else changed the item first: load it again. */
  onStale: () => void;
};

type Action = "publish" | "archive" | "restore" | "delete";

const DONE: Record<Exclude<Action, "delete">, (status: ItemStatus) => string> = {
  publish: () => "Published. It is in the inventory now.",
  archive: () => "Archived. It no longer shows in the inventory list.",
  restore: (s) => (s === "sold_out" ? "Back in the inventory as Sold out (no stock left)." : "Back in the inventory."),
};

/**
 * The ⋯ menu on the item page. Sellers see Publish (drafts); the owner also sees Archive, Restore
 * (archived items) and Delete (drafts, last, confirmed). Each sends the version the page loaded.
 */
export default function ItemActions({ item, isOwner, onChanged, onStale }: Props) {
  const { showToast } = useToast();
  const router = useRouter();
  const [asking, setAsking] = useState<"archive" | "delete" | null>(null);

  const run = async (action: Action) => {
    try {
      if (action === "delete") {
        await apiFetch(`/api/items/${item.id}`, { method: "DELETE", body: JSON.stringify({ version: item.version }) });
        showToast(`Deleted the draft “${item.title}”.`, "success");
        router.push("/inventory");
        return;
      }
      const next = await apiFetch<{ status: ItemStatus; version: string }>(`/api/items/${item.id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ version: item.version }),
      });
      onChanged(next);
      showToast(DONE[action](next.status), "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "The change was not saved. Try again.";
      if (err instanceof ApiError && err.status === 409) {
        showToast(message, "error", { action: { label: "Reload", onClick: onStale } });
      } else {
        showToast(message, "error");
      }
    } finally {
      setAsking(null);
    }
  };

  const canPublish = item.status === "draft";
  const canArchive = isOwner && item.status !== "archived";
  const canRestore = isOwner && item.status === "archived";
  const canDelete = isOwner && item.status === "draft";
  if (!canPublish && !canArchive && !canRestore && !canDelete) return null;

  return (
    <>
      <Menu
        label={`More actions for ${item.title}`}
        trigger={<MoreVertical aria-hidden="true" className="h-5 w-5" />}
        triggerClassName="grid h-11 w-11 place-items-center rounded-md border border-line bg-surface text-muted hover:bg-tint hover:text-primary"
      >
        {canPublish && (
          <MenuItem icon={<Send />} onSelect={() => void run("publish")}>
            Publish to inventory
          </MenuItem>
        )}
        {canRestore && (
          <MenuItem icon={<ArchiveRestore />} onSelect={() => void run("restore")}>
            Restore to inventory
          </MenuItem>
        )}
        {canArchive && (
          <MenuItem icon={<Archive />} onSelect={() => setAsking("archive")}>
            Archive
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem tone="danger" icon={<Trash2 />} onSelect={() => setAsking("delete")}>
            Delete draft
          </MenuItem>
        )}
      </Menu>

      <ConfirmDialog
        open={asking === "archive"}
        tone="primary"
        title={`Archive “${item.title}”?`}
        confirmLabel="Archive"
        onCancel={() => setAsking(null)}
        onConfirm={() => run("archive")}
      >
        It leaves the inventory list. Its page and history stay, and you can restore it here any time.
      </ConfirmDialog>
      <ConfirmDialog
        open={asking === "delete"}
        title={`Delete the draft “${item.title}”?`}
        confirmLabel="Delete draft"
        onCancel={() => setAsking(null)}
        onConfirm={() => run("delete")}
      >
        The draft disappears from the app. Nobody can open it afterwards.
      </ConfirmDialog>
    </>
  );
}
