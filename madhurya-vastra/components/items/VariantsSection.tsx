"use client";

import { useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import Menu, { MenuItem } from "@/components/ui/Menu";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { ItemFormData, LookupItem } from "@/types";
import type { Errors } from "./form";

const QUICK_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];

type Props = {
  form: ItemFormData;
  set: <K extends keyof ItemFormData>(key: K, value: ItemFormData[K]) => void;
  colors: LookupItem[];
  errors: Errors;
  number: number;
};

type Grid<T> = Record<string, Record<string, T>>;

const Swatch = ({ hex }: { hex?: string }) => (
  // Data colour from the Colours list.
  <span aria-hidden="true" className="inline-block h-4 w-4 shrink-0 rounded-full border border-line" style={{ backgroundColor: hex || "transparent" }} />
);

const toQty = (raw: string) => Math.max(0, Math.min(9999, Math.floor(Number(raw.replace(/\D/g, "")) || 0)));

/** Sizes × colours grid: quantity per variant, fill helpers, optional price per variant. */
export default function VariantsSection({ form, set, colors, errors, number }: Props) {
  const [customSize, setCustomSize] = useState<string | null>(null);
  const [fillAll, setFillAll] = useState("");
  const [showPrices, setShowPrices] = useState(false);

  const colorById = (id: string) => colors.find((c) => c.id === id);
  const usable = form.sizes.length > 0 && form.colorIds.length > 0;
  const q = form.quantities;

  const addSize = (raw: string) => {
    const size = raw.trim();
    if (!size || form.sizes.some((s) => s.toLowerCase() === size.toLowerCase())) return;
    set("sizes", [...form.sizes, size]);
    setCustomSize(null);
  };

  const removeSize = (size: string) => {
    set("sizes", form.sizes.filter((s) => s !== size));
    const { [size]: _q, ...restQ } = form.quantities;
    const { [size]: _o, ...restO } = form.priceOverrides;
    void _q;
    void _o;
    set("quantities", restQ);
    set("priceOverrides", restO);
  };

  const strip = <T,>(rec: Grid<T>, colorId: string): Grid<T> =>
    Object.fromEntries(Object.entries(rec).map(([s, row]) => [s, Object.fromEntries(Object.entries(row).filter(([c]) => c !== colorId))]));

  const removeColor = (id: string) => {
    set("colorIds", form.colorIds.filter((c) => c !== id));
    set("quantities", strip(form.quantities, id));
    set("priceOverrides", strip(form.priceOverrides, id));
  };

  const setQty = (size: string, colorId: string, n: number) => set("quantities", { ...q, [size]: { ...q[size], [colorId]: n } });

  const fill = (sizes: string[], colorIds: string[], n: number) => {
    const next: Grid<number> = { ...q };
    for (const s of sizes) next[s] = { ...next[s], ...Object.fromEntries(colorIds.map((c) => [c, n])) };
    set("quantities", next);
  };

  /** Fill a row or column with the "Fill all" number, or 1 when it is empty. */
  const fillValue = () => (fillAll ? toQty(fillAll) : 1);

  const setOverride = (size: string, colorId: string, value: string) =>
    set("priceOverrides", { ...form.priceOverrides, [size]: { ...form.priceOverrides[size], [colorId]: value.replace(/[^\d.]/g, "") } });

  const total = form.sizes.reduce((sum, s) => sum + form.colorIds.reduce((a, c) => a + (q[s]?.[c] ?? 0), 0), 0);

  const header = (withFill: boolean) => (
    <thead>
      <tr>
        <th scope="col" className="sticky left-0 z-10 bg-surface" />
        {form.colorIds.map((c) => (
          <th key={c} scope="col" className="px-1 pb-1 align-bottom text-sm font-medium text-muted">
            <span className="grid min-w-16 justify-items-center gap-1">
              <Swatch hex={colorById(c)?.hexCode} />
              <span className="max-w-20 truncate text-fg">{colorById(c)?.name ?? "—"}</span>
              {withFill && (
                <button type="button" onClick={() => fill(form.sizes, [c], fillValue())} className="rounded-sm px-1 text-xs font-semibold text-primary hover:bg-tint">
                  Fill column
                </button>
              )}
            </span>
          </th>
        ))}
      </tr>
    </thead>
  );

  const sizeCell = (s: string, withFill: boolean) => (
    <th scope="row" className="sticky left-0 z-10 bg-surface pr-2 text-left align-middle">
      <span className="grid gap-0.5">
        <span className="font-semibold text-fg">{s}</span>
        {withFill && (
          <button type="button" onClick={() => fill([s], form.colorIds, fillValue())} className="w-fit rounded-sm text-xs font-semibold text-primary hover:bg-tint">
            Fill row
          </button>
        )}
      </span>
    </th>
  );

  const cellInput = "h-11 w-16 rounded-sm border border-line bg-surface text-center tabular-nums text-fg placeholder:text-muted focus:border-primary-soft focus:outline-none focus:ring-4 focus:ring-tint-strong";

  return (
    <Section
      id="variants"
      title="Sizes & colours"
      number={number}
      actions={
        !form.isOneOfAKind && (
          <>
            <Menu
              label="Add a size"
              align="end"
              trigger={
                <span className="inline-flex items-center gap-1.5">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Size
                </span>
              }
              triggerClassName="inline-flex min-h-9 items-center rounded-md border border-primary-soft bg-surface px-3 text-sm font-semibold text-primary hover:bg-tint"
            >
              {QUICK_SIZES.filter((s) => !form.sizes.includes(s)).map((s) => (
                <MenuItem key={s} onSelect={() => addSize(s)}>
                  {s}
                </MenuItem>
              ))}
              <MenuItem onSelect={() => setCustomSize("")}>Other size…</MenuItem>
            </Menu>
            <Menu
              label="Add a colour"
              align="end"
              className="max-h-72 overflow-y-auto"
              trigger={
                <span className="inline-flex items-center gap-1.5">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Colour
                </span>
              }
              triggerClassName="inline-flex min-h-9 items-center rounded-md border border-primary-soft bg-surface px-3 text-sm font-semibold text-primary hover:bg-tint"
            >
              {colors
                .filter((c) => !form.colorIds.includes(c.id))
                .map((c) => (
                  <MenuItem key={c.id} icon={<Swatch hex={c.hexCode} />} onSelect={() => set("colorIds", [...form.colorIds, c.id])}>
                    {c.name}
                  </MenuItem>
                ))}
            </Menu>
          </>
        )
      }
    >
      <div id="item-variants" tabIndex={-1} className="grid gap-4 focus:outline-none">
        {customSize !== null && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              autoFocus
              aria-label="New size"
              placeholder="e.g. 38 or Kids 8–10"
              maxLength={20}
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSize(customSize);
                }
                if (e.key === "Escape") setCustomSize(null);
              }}
              className="w-56"
            />
            <Button size="sm" onClick={() => addSize(customSize)}>
              Add size
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCustomSize(null)}>
              Cancel
            </Button>
          </div>
        )}

        {!form.isOneOfAKind && (form.sizes.length > 0 || form.colorIds.length > 0) && (
          <div className="flex flex-wrap gap-2" aria-label="Chosen sizes and colours">
            {form.sizes.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface py-0.5 pl-3 pr-1 text-sm">
                {s}
                <button type="button" aria-label={`Remove size ${s}`} onClick={() => removeSize(s)} className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-danger-tint hover:text-danger">
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {form.colorIds.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-0.5 pl-2 pr-1 text-sm">
                <Swatch hex={colorById(c)?.hexCode} />
                {colorById(c)?.name}
                <button type="button" aria-label={`Remove colour ${colorById(c)?.name}`} onClick={() => removeColor(c)} className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-danger-tint hover:text-danger">
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {!form.isOneOfAKind && usable && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-fg">
                Total pieces <span className="text-lg tabular-nums text-primary">{total}</span>
              </p>
              <div className="flex items-center gap-2 text-sm text-muted">
                <label htmlFor="fill-all">Fill every box with</label>
                <Input id="fill-all" inputMode="numeric" placeholder="qty" value={fillAll} onChange={(e) => setFillAll(e.target.value.replace(/\D/g, ""))} className="h-9 min-h-9 w-16 text-center" />
                <Button size="sm" variant="secondary" disabled={!fillAll} onClick={() => fill(form.sizes, form.colorIds, toQty(fillAll))}>
                  Apply
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="border-separate border-spacing-1.5">
                <caption className="sr-only">Pieces in stock for each size and colour</caption>
                {header(true)}
                <tbody>
                  {form.sizes.map((s) => (
                    <tr key={s}>
                      {sizeCell(s, true)}
                      {form.colorIds.map((c) => {
                        const v = q[s]?.[c];
                        return (
                          <td key={c}>
                            <input
                              inputMode="numeric"
                              aria-label={`Pieces in ${s}, ${colorById(c)?.name}`}
                              placeholder="–"
                              value={v ? String(v) : ""}
                              onChange={(e) => setQty(s, c, toQty(e.target.value))}
                              onFocus={(e) => e.target.select()}
                              className={cellInput}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-line pt-3">
              <button
                type="button"
                aria-expanded={showPrices}
                onClick={() => setShowPrices((o) => !o)}
                className="flex items-center gap-1.5 rounded-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft"
              >
                <ChevronDown aria-hidden="true" className={cn("h-4 w-4 transition-transform duration-base", !showPrices && "-rotate-90")} />
                Different price for some variants?
                <span className="font-normal text-muted">(optional)</span>
              </button>
              {showPrices && (
                <div className="mt-2 grid gap-2">
                  <div className="overflow-x-auto">
                    <table className="border-separate border-spacing-1.5">
                      <caption className="sr-only">Selling price for each size and colour</caption>
                      {header(false)}
                      <tbody>
                        {form.sizes.map((s) => (
                          <tr key={s}>
                            {sizeCell(s, false)}
                            {form.colorIds.map((c) => (
                              <td key={c}>
                                <input
                                  inputMode="decimal"
                                  aria-label={`Price for ${s}, ${colorById(c)?.name}`}
                                  placeholder={form.sellingPrice ? `₹${form.sellingPrice}` : "₹"}
                                  value={form.priceOverrides[s]?.[c] ?? ""}
                                  onChange={(e) => setOverride(s, c, e.target.value)}
                                  className={cn(cellInput, "w-20")}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm text-muted">Leave a box empty to use the selling price.</p>
                </div>
              )}
            </div>
          </>
        )}

        {!form.isOneOfAKind && !usable && (
          <p className="text-muted">
            {form.sizes.length === 0 && form.colorIds.length === 0
              ? "Add the sizes and colours you have, then type how many pieces of each."
              : `Add at least one ${form.sizes.length === 0 ? "size" : "colour"} to fill in pieces.`}
          </p>
        )}

        {(form.isOneOfAKind || (form.sizes.length === 0 && form.colorIds.length === 0)) && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-fg">
            <input type="checkbox" checked={form.isOneOfAKind} onChange={(e) => set("isOneOfAKind", e.target.checked)} className="h-5 w-5 accent-primary" />
            One of a kind — a single piece, no sizes or colours
          </label>
        )}

        {errors.variants && (
          <p className="text-sm text-danger" aria-live="polite">
            {errors.variants}
          </p>
        )}
      </div>
    </Section>
  );
}
