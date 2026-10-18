import { cn } from "@/lib/cn";

/**
 * A placeholder block shaped like the content that is loading. Size it with className
 * (h-*, w-*); compose several to mirror the real layout instead of showing a spinner.
 */
export default function Skeleton({ className, round }: { className?: string; round?: boolean }) {
  return <span aria-hidden="true" className={cn("block animate-pulse bg-tint", round ? "rounded-full" : "rounded-md", className)} />;
}

/** A list of skeleton rows, e.g. while Manage Lists loads. */
export function SkeletonRows({ rows = 6, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" className="grid gap-px overflow-hidden rounded-lg border border-line bg-line">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 bg-surface px-4 py-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="ml-auto h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
