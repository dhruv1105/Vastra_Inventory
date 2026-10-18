"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, RotateCw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Button, { LinkButton } from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { ApiError, apiFetch } from "@/lib/api-client";

// Placeholder until item detail / edit (roadmap step 2). It shows which item was opened, so a
// tap from the inventory list lands somewhere real; the details and editing come next.

type ItemSummary = { id: string; title: string; images: { cdnUrl: string; altText: string | null }[] };

const BACK = { href: "/inventory", label: "Inventory" };

export default function ItemPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<ItemSummary | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");

  const load = useCallback(() => {
    setState("loading");
    apiFetch<ItemSummary>(`/api/items/${encodeURIComponent(params.id)}`)
      .then((data) => {
        setItem(data);
        setState("ready");
      })
      // 400 (not an item id) and 404 (deleted or never existed) read the same to staff.
      // A 401 never gets here: apiFetch has already sent the browser to /login.
      .catch((err) => setState(err instanceof ApiError && (err.status === 400 || err.status === 404) ? "missing" : "error"));
  }, [params.id]);

  useEffect(load, [load]);

  const wrap = "mv-stagger mx-auto grid max-w-3xl grid-cols-1 gap-5 px-4 py-5 md:px-7 md:py-7";

  if (state === "loading") {
    return (
      <div className={wrap} role="status">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="aspect-portrait w-40" />
        <span className="sr-only">Loading item</span>
      </div>
    );
  }

  if (state === "missing" || state === "error") {
    return (
      <div className={wrap}>
        <PageHeader title="Item" back={BACK} />
        <EmptyState
          compact
          title={state === "missing" ? "This item isn't here" : "Couldn't load this item"}
          action={
            state === "missing" ? (
              <LinkButton href="/inventory" icon={<ArrowLeft />}>
                Back to inventory
              </LinkButton>
            ) : (
              <Button variant="secondary" icon={<RotateCw />} onClick={load}>
                Try again
              </Button>
            )
          }
        >
          {state === "missing" ? "It may have been removed, or the link is wrong." : "Nothing was changed. Try again in a moment."}
        </EmptyState>
      </div>
    );
  }

  const cover = item!.images[0];
  return (
    <div className={wrap}>
      <PageHeader eyebrow="Item" title={item!.title} back={BACK} />
      <EmptyState
        eyebrow="Comes next"
        title="Item details are on the way"
        action={
          <LinkButton href="/inventory" variant="secondary" icon={<ArrowLeft />}>
            Back to inventory
          </LinkButton>
        }
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.cdnUrl} alt={cover.altText || item!.title} className="mx-auto mb-3 aspect-portrait w-32 rounded-md object-cover" />
        )}
        Photos, sizes, colours, stock and editing for <span className="font-semibold text-fg">{item!.title}</span> will show here.
      </EmptyState>
    </div>
  );
}
