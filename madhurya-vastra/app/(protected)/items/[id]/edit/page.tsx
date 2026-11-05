"use client";

import Skeleton from "@/components/ui/Skeleton";
import ItemForm from "@/components/items/ItemForm";
import ItemUnavailable from "@/components/items/ItemUnavailable";
import { useItem } from "@/hooks/useItem";

// Edit an item: Add Item's form, filled in. Saving checks the version the form loaded (409 if
// someone else saved first); the form then keeps everything typed and offers to reload.

export default function EditItemPage({ params }: { params: { id: string } }) {
  const { item, state, load } = useItem(params.id);

  if (state === "loading") {
    return (
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 md:px-7 md:py-7" role="status">
        <Skeleton className="h-9 w-2/3" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
        <span className="sr-only">Loading item</span>
      </div>
    );
  }

  if (state !== "ready" || !item) {
    return (
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 md:px-7 md:py-7">
        <ItemUnavailable missing={state === "missing"} onRetry={load} />
      </div>
    );
  }

  // A newer version (after Reload) starts a fresh form.
  return <ItemForm key={item.version} mode="edit" item={item} onReload={load} />;
}
