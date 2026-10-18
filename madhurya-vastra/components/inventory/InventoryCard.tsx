import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { BrandMark } from "@/components/ui/Brand";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";
import { STATUS_BADGE, isLowStock, type InventoryItem } from "@/lib/inventory";

/** Phone layout choice on /inventory. Tablet and up always use the grid card. */
export type InventoryLayout = "grid" | "list";

/**
 * Stock words. Long: "9 in stock" (list rows, tablet+ cards); short: "3 left" (phone grid line).
 * One-of-a-kind items say so; items saved without variants say "No stock added". Sold-out items
 * say nothing — the "Sold out" badge already does (say a thing once).
 */
function stockText(item: InventoryItem, short = false): string | null {
  if (item.isOneOfAKind) return "One of a kind";
  if (item.status === "sold_out") return null;
  if (item.variantCount === 0) return "No stock added";
  return short ? `${item.totalStock} left` : `${item.totalStock} in stock`;
}

function Price({ item }: { item: InventoryItem }) {
  return item.fromPrice !== null ? (
    <>
      <span className="text-muted">from </span>
      <span className="font-semibold text-fg">{formatINR(item.fromPrice)}</span>
    </>
  ) : (
    <span className="font-semibold text-fg">{formatINR(item.sellingPrice)}</span>
  );
}

function Badges({ item, className }: { item: InventoryItem; className?: string }) {
  const status = STATUS_BADGE[item.status];
  const low = isLowStock(item);
  if (!status && !low) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {low && (
        <Badge tone="zari" icon={<AlertTriangle aria-hidden="true" />}>
          Low stock
        </Badge>
      )}
      {status && <Badge tone={item.status === "draft" ? "primary" : "neutral"}>{status}</Badge>}
    </div>
  );
}

/**
 * One item on /inventory; the whole card opens it.
 * - Phone, grid (default): 2-column photo card — badges over the photo's top-left corner, a
 *   2-line title and one "price · stock" line, so every card in a row is the same height.
 * - Phone, list: a row with the thumbnail on the left.
 * - Tablet and up: the portrait card (both layouts).
 */
export default function InventoryCard({ item, layout = "grid" }: { item: InventoryItem; layout?: InventoryLayout }) {
  const soldOut = item.status === "sold_out";
  const grid = layout === "grid";
  const stock = stockText(item);
  const shortStock = stockText(item, true);

  return (
    <Link
      href={`/items/${item.id}`}
      className={cn(
        "group flex rounded-lg border border-line bg-surface transition-colors duration-fast ease-brand",
        "hover:border-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft",
        grid ? "flex-col overflow-hidden" : "gap-3 p-2.5",
        "md:flex-col md:gap-0 md:overflow-hidden md:p-0",
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-tint md:aspect-portrait md:h-auto md:w-full md:rounded-none",
          grid ? "aspect-portrait w-full" : "h-24 w-20 rounded-md",
        )}
      >
        <div className={cn("h-full w-full", soldOut && "opacity-60")}>
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
              <BrandMark className={cn("opacity-40 md:w-20", grid ? "w-16" : "w-10")} />
              <span className="sr-only">No photo yet</span>
            </div>
          )}
        </div>
        {/* Phone grid: badges ride on the photo so they never change the card's height. */}
        {grid && <Badges item={item} className="absolute left-1.5 top-1.5 right-1.5 md:hidden" />}
      </div>

      <div className={cn("grid min-w-0 flex-1 content-start gap-1 md:p-3", grid && "p-2.5")}>
        <h2
          className={cn(
            "line-clamp-2 font-semibold leading-snug md:text-base",
            grid && "h-10 text-sm leading-5 md:h-auto md:leading-snug",
            soldOut ? "text-muted" : "text-fg",
          )}
        >
          {item.title}
        </h2>
        <p className={cn("truncate text-sm text-muted", grid && "hidden md:block")}>{item.itemTypeName ?? "No type"}</p>

        {/* Phone grid: price and stock on one line ("₹2,450 · 3 left"). */}
        {grid && (
          <p className="truncate text-sm tabular-nums md:hidden">
            <Price item={item} />
            {shortStock && <span className="text-muted"> · {shortStock}</span>}
          </p>
        )}

        {/* List rows and tablet+ cards: price, then stock with inline badges. */}
        <p className={cn("tabular-nums", grid && "hidden md:block")}>
          <Price item={item} />
        </p>
        <div className={cn("flex-wrap items-center gap-x-2 gap-y-1 text-sm", grid ? "hidden md:flex" : "flex")}>
          {stock && <span className="tabular-nums text-muted">{stock}</span>}
          <Badges item={item} />
        </div>
      </div>
    </Link>
  );
}
