"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { Item, ItemSellerView } from "@/types";

export type LoadedItem = Item | ItemSellerView;
export type ItemLoadState = "loading" | "ready" | "missing" | "error";

/** One item from GET /api/items/[id] (cost fields only for the owner), with its load state. */
export function useItem(id: string) {
  const [item, setItem] = useState<LoadedItem | null>(null);
  const [state, setState] = useState<ItemLoadState>("loading");

  const load = useCallback(() => {
    setState("loading");
    apiFetch<LoadedItem>(`/api/items/${encodeURIComponent(id)}`)
      .then((data) => {
        setItem(data);
        setState("ready");
      })
      // 400 (not an item id) and 404 (deleted or never existed) read the same to staff.
      // A 401 never gets here: apiFetch has already sent the browser to /login.
      .catch((err) => setState(err instanceof ApiError && (err.status === 400 || err.status === 404) ? "missing" : "error"));
  }, [id]);

  useEffect(load, [load]);

  return { item, setItem, state, load };
}
