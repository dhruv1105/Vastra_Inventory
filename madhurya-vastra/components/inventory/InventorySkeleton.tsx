import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import type { InventoryLayout } from "./InventoryCard";

/** List classes shared with the real list, so nothing jumps when it loads. */
export function listClass(layout: InventoryLayout) {
  return cn("grid md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5", layout === "grid" ? "grid-cols-2 gap-3" : "grid-cols-1 gap-2.5");
}

/** Card-shaped placeholders in the same layout as the real list. */
export default function InventorySkeleton({ count = 8, label = "Loading items", layout = "grid" }: { count?: number; label?: string; layout?: InventoryLayout }) {
  const grid = layout === "grid";
  return (
    <div role="status" className={listClass(layout)}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={cn(
            "flex rounded-lg border border-line bg-surface md:flex-col md:gap-0 md:overflow-hidden md:p-0",
            grid ? "flex-col overflow-hidden" : "gap-3 p-2.5",
          )}
        >
          <Skeleton className={cn("shrink-0 md:aspect-portrait md:h-auto md:w-full md:rounded-none", grid ? "aspect-portrait w-full rounded-none" : "h-24 w-20")} />
          <div className={cn("grid flex-1 content-start gap-2 md:p-3", grid && "p-2.5")}>
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className={cn("h-3 w-1/3", grid && "hidden md:block")} />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className={cn("h-3 w-2/5", grid && "hidden md:block")} />
          </div>
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
