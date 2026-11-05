import { AlertTriangle } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Swatch from "@/components/ui/Swatch";
import { formatINR } from "@/lib/format";
import { isLowStock } from "@/lib/inventory";
import { stockGrid } from "@/lib/stock";
import { cn } from "@/lib/cn";
import type { ItemStatus, VariantDetail } from "@/types";

type Props = {
  variants: Omit<VariantDetail, "costPriceOverride">[];
  isOneOfAKind: boolean;
  status: ItemStatus;
};

/** Read-only stock: a size × colour grid with the total and Low stock; one-of-a-kind and "no stock" read as words. */
export default function StockGrid({ variants, isOneOfAKind, status }: Props) {
  const g = stockGrid(variants);

  if (isOneOfAKind) {
    // Plain words: the status badge at the top already says "Sold out" when it has gone.
    return <p className="text-fg">{g.total > 0 ? "One of a kind — the single piece is in the shop." : "One of a kind — the single piece has been sold."}</p>;
  }

  if (variants.length === 0) {
    return <p className="text-muted">No stock added. This item has no sizes or colours yet.</p>;
  }

  const low = isLowStock({ status, isOneOfAKind, variantCount: variants.length, totalStock: g.total });

  return (
    <div className="grid gap-3">
      <p className="flex flex-wrap items-center gap-2 font-semibold text-fg">
        Total pieces <span className="text-lg tabular-nums text-primary">{g.total}</span>
        {low && (
          <Badge tone="zari" icon={<AlertTriangle />}>
            Low stock
          </Badge>
        )}
      </p>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1.5">
          <caption className="sr-only">Pieces in stock for each size and colour</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-surface" />
              {g.columns.map((c) => (
                <th key={c.key} scope="col" className="px-1 pb-1 align-bottom text-sm font-medium">
                  <span className="grid min-w-16 justify-items-center gap-1">
                    {c.key !== "none" && <Swatch hex={c.hex} hex2={c.hex2} />}
                    <span className="max-w-24 truncate text-fg">{c.name}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {g.sizes.map((s) => (
              <tr key={s}>
                <th scope="row" className="sticky left-0 z-10 bg-surface pr-2 text-left font-semibold text-fg">
                  {s}
                </th>
                {g.columns.map((c) => {
                  const cell = g.cell(s, c.key);
                  return (
                    <td key={c.key}>
                      <span
                        className={cn(
                          "grid h-12 min-w-16 place-items-center content-center rounded-sm border text-center tabular-nums",
                          !cell ? "border-dashed border-line text-muted" : cell.quantity === 0 ? "border-line text-muted" : "border-line bg-tint font-semibold text-fg",
                        )}
                      >
                        <span>{cell ? cell.quantity : <span aria-label="Not stocked">—</span>}</span>
                        {cell?.price != null && <span className="text-xs font-normal text-muted">{formatINR(cell.price)}</span>}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {variants.some((v) => v.sellingPriceOverride != null) && <p className="text-sm text-muted">A price under a number is that size and colour’s own price.</p>}
    </div>
  );
}
