import Skeleton from "@/components/ui/Skeleton";

/** Card-shaped placeholders in the same grid as the real list, so nothing jumps when it loads. */
export default function InventorySkeleton({ count = 8, label = "Loading items" }: { count?: number; label?: string }) {
  return (
    <div role="status" className="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-3 rounded-lg border border-line bg-surface p-2.5 md:flex-col md:gap-0 md:overflow-hidden md:p-0">
          <Skeleton className="h-24 w-20 shrink-0 md:aspect-portrait md:h-auto md:w-full md:rounded-none" />
          <div className="grid flex-1 content-start gap-2 md:p-3">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
