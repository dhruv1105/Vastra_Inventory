import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { BrandMark } from "@/components/ui/Brand";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";
import { STATUS_BADGE, isLowStock, type InventoryItem } from "@/lib/inventory";

/**
 * "9 in stock", "One of a kind", or "No stock added" for an item saved without variants.
 * Sold-out items say nothing here: the "Sold out" badge already does (say a thing once).
 */
function stockText(item: InventoryItem): string | null {
  if (item.isOneOfAKind) return "One of a kind";
  if (item.status === "sold_out") return null;
  if (item.variantCount === 0) return "No stock added";
  return `${item.totalStock} in stock`;
}

/**
 * One item on /inventory. A row on phones (thumbnail left), a card from tablet width up
 * (portrait cover on top). The whole card opens the item.
 */
export default function InventoryCard({ item }: { item: InventoryItem }) {
  const soldOut = item.status === "sold_out";
  const badge = STATUS_BADGE[item.status];
  const low = isLowStock(item);
  const stock = stockText(item);

  return (
    <Link
      href={`/items/${item.id}`}
      className={cn(
        "group flex gap-3 rounded-lg border border-line bg-surface p-2.5 transition-colors duration-fast ease-brand",
        "hover:border-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft",
        "md:flex-col md:gap-0 md:overflow-hidden md:p-0",
      )}
    >
      <div
        className={cn(
          "relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-tint md:aspect-portrait md:h-auto md:w-full md:rounded-none",
          soldOut && "opacity-60",
        )}
      >
        {item.coverUrl ? (
          // Photos are local uploads (public/uploads); next/image adds nothing here yet.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverUrl}
            alt={item.coverAlt || item.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-base ease-brand group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <BrandMark className="w-10 opacity-40 md:w-20" />
            <span className="sr-only">No photo yet</span>
          </div>
        )}
      </div>

      <div className="grid min-w-0 flex-1 content-start gap-1 md:p-3">
        <h2 className={cn("line-clamp-2 font-semibold leading-snug", soldOut ? "text-muted" : "text-fg")}>{item.title}</h2>
        <p className="truncate text-sm text-muted">{item.itemTypeName ?? "No type"}</p>
        <p className="tabular-nums">
          {item.fromPrice !== null ? (
            <>
              <span className="text-sm text-muted">from </span>
              <span className="font-semibold text-fg">{formatINR(item.fromPrice)}</span>
            </>
          ) : (
            <span className="font-semibold text-fg">{formatINR(item.sellingPrice)}</span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {stock && <span className="tabular-nums text-muted">{stock}</span>}
          {low && (
            <Badge tone="zari" icon={<AlertTriangle aria-hidden="true" />}>
              Low stock
            </Badge>
          )}
          {badge && <Badge tone={item.status === "draft" ? "primary" : "neutral"}>{badge}</Badge>}
        </div>
      </div>
    </Link>
  );
}
