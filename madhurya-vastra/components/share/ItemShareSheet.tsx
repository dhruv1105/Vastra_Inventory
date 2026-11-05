"use client";

import { useItem } from "@/hooks/useItem";
import { useToast } from "@/context/ToastContext";
import { useEffect } from "react";
import ShareSheet from "./ShareSheet";

/**
 * The share sheet for an item known only by id (inventory list): loads the item, then opens the
 * sheet. Mount it only while sharing; it closes itself with a message if the item can't be loaded.
 */
export default function ItemShareSheet({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const { item, state } = useItem(itemId);
  const { showToast } = useToast();

  useEffect(() => {
    if (state === "missing") showToast("This item no longer exists. Reload the list.", "error");
    if (state === "error") showToast("The item didn’t load. Check the connection and try again.", "error");
    if (state === "missing" || state === "error") onClose();
  }, [state, showToast, onClose]);

  return <ShareSheet open={state === "ready" && !!item} onClose={onClose} item={state === "ready" ? item : null} />;
}
