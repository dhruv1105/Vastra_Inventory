"use client";

import { useState } from "react";
import { X, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { LookupItem } from "@/types";
import SearchableSelect from "./SearchableSelect";

const QUICK_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];

interface Props {
  sizes: string[];
  colorIds: string[];
  colors: LookupItem[];
  quantities: Record<string, Record<string, number>>;
  priceOverrides: Record<string, Record<string, string>>;
  sellingPrice: string;
  isOneOfAKind: boolean;
  error?: string;
  onSizes: (sizes: string[]) => void;
  onColorIds: (ids: string[]) => void;
  onQuantities: (q: Record<string, Record<string, number>>) => void;
  onPriceOverrides: (p: Record<string, Record<string, string>>) => void;
  onOneOfAKind: (v: boolean) => void;
}

const swatch = (hex?: string) => (
  <span
    className="inline-block w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
    style={{ backgroundColor: hex || "#e5e7eb" }}
  />
);

export default function VariantMatrix(p: Props) {
  const [sizeMenu, setSizeMenu] = useState(false);
  const [customSize, setCustomSize] = useState<string | null>(null);
  const [colorPicker, setColorPicker] = useState(false);
  const [overridesOpen, setOverridesOpen] = useState(false);

  const colorById = (id: string) => p.colors.find((c) => c.id === id);
  const hasMatrix = p.sizes.length > 0 || p.colorIds.length > 0;

  const addSize = (raw: string) => {
    const size = raw.trim();
    if (!size) return;
    if (p.sizes.some((s) => s.toLowerCase() === size.toLowerCase())) return;
    p.onSizes([...p.sizes, size]);
    setSizeMenu(false);
    setCustomSize(null);
  };

  const removeSize = (size: string) => {
    p.onSizes(p.sizes.filter((s) => s !== size));
    const q = { ...p.quantities };
    const o = { ...p.priceOverrides };
    delete q[size];
    delete o[size];
    p.onQuantities(q);
    p.onPriceOverrides(o);
  };

  const removeColor = (id: string) => {
    p.onColorIds(p.colorIds.filter((c) => c !== id));
    const strip = <T,>(rec: Record<string, Record<string, T>>) =>
      Object.fromEntries(
        Object.entries(rec).map(([s, row]) => [s, Object.fromEntries(Object.entries(row).filter(([c]) => c !== id))])
      );
    p.onQuantities(strip(p.quantities));
    p.onPriceOverrides(strip(p.priceOverrides));
  };

  const setQty = (size: string, colorId: string, raw: string) => {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    p.onQuantities({ ...p.quantities, [size]: { ...p.quantities[size], [colorId]: n } });
  };

  const setOverride = (size: string, colorId: string, value: string) =>
    p.onPriceOverrides({ ...p.priceOverrides, [size]: { ...p.priceOverrides[size], [colorId]: value } });

  const total = p.sizes.reduce(
    (sum, s) => sum + p.colorIds.reduce((acc, c) => acc + (p.quantities[s]?.[c] ?? 0), 0),
    0
  );

  const cellInput =
    "w-16 px-1.5 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-primary/30";

  const grid = (renderCell: (size: string, colorId: string) => React.ReactNode) => (
    <div className="overflow-x-auto">
      <table className="text-sm border-collapse">
        <thead>
          <tr>
            <th className="p-1" />
            {p.colorIds.map((c) => (
              <th key={c} className="p-1 font-medium text-xs align-bottom">
                <div className="flex flex-col items-center gap-1 min-w-[4rem]">
                  <button
                    type="button"
                    onClick={() => removeColor(c)}
                    aria-label={`Remove ${colorById(c)?.name}`}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {swatch(colorById(c)?.hexCode)}
                  <span className="max-w-[4.5rem] truncate">{colorById(c)?.name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {p.sizes.map((s) => (
            <tr key={s}>
              <td className="p-1 pr-2 whitespace-nowrap font-medium sticky left-0 bg-white">
                <button
                  type="button"
                  onClick={() => removeSize(s)}
                  aria-label={`Remove size ${s}`}
                  className="mr-1 align-middle text-gray-400 hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {s}
              </td>
              {p.colorIds.map((c) => (
                <td key={c} className="p-1 text-center">
                  {renderCell(s, c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div id="field-variants">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-brand-primary">Variants</h2>
        {!p.isOneOfAKind && (
          <div className="flex gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSizeMenu((o) => !o)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-brand-primary text-brand-primary rounded-input"
              >
                <Plus className="w-4 h-4" /> Add Size
              </button>
              {sizeMenu && (
                <div className="absolute right-0 z-30 mt-1 w-44 bg-white border border-gray-200 rounded-input shadow-lg p-1">
                  {customSize !== null ? (
                    <div className="flex gap-1 p-1">
                      <input
                        autoFocus
                        value={customSize}
                        maxLength={30}
                        onChange={(e) => setCustomSize(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSize(customSize);
                          }
                        }}
                        placeholder="Size name"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                      <button
                        type="button"
                        onClick={() => addSize(customSize)}
                        className="px-2 text-sm bg-brand-primary text-white rounded"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <>
                      {QUICK_SIZES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={p.sizes.includes(s)}
                          onClick={() => addSize(s)}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-brand-primary/10 disabled:opacity-40 rounded"
                        >
                          {s}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCustomSize("")}
                        className="w-full text-left px-3 py-1.5 text-sm text-brand-primary hover:bg-brand-primary/10 rounded"
                      >
                        Custom…
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setColorPicker((o) => !o)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-brand-primary text-brand-primary rounded-input"
              >
                <Plus className="w-4 h-4" /> Add Color
              </button>
              {colorPicker && (
                <div className="absolute right-0 w-56">
                  <SearchableSelect
                    pickerMode
                    options={p.colors}
                    value={null}
                    excludeIds={p.colorIds}
                    onChange={(id) => id && p.onColorIds([...p.colorIds, id])}
                    onClose={() => setColorPicker(false)}
                    renderOption={(o) => (
                      <span className="flex items-center gap-2">
                        {swatch(o.hexCode)}
                        {o.name}
                      </span>
                    )}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!p.isOneOfAKind && hasMatrix && (
        <div className="space-y-4">
          {p.sizes.length > 0 && p.colorIds.length > 0 ? (
            <>
              {grid((s, c) => (
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={p.quantities[s]?.[c] ?? 0}
                  onChange={(e) => setQty(s, c, e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className={cellInput}
                  aria-label={`Quantity ${s} ${colorById(c)?.name}`}
                />
              ))}
              <p className="text-sm font-medium">Total units: {total}</p>

              <div className="border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setOverridesOpen((o) => !o)}
                  className="flex items-center gap-1 text-sm font-medium text-brand-text-muted"
                >
                  {overridesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  Price Overrides (optional)
                </button>
                {overridesOpen && (
                  <div className="mt-2">
                    {grid((s, c) => (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={p.priceOverrides[s]?.[c] ?? ""}
                        onChange={(e) => setOverride(s, c, e.target.value)}
                        placeholder={p.sellingPrice ? `₹${p.sellingPrice}` : "₹"}
                        className={`${cellInput} w-20`}
                        aria-label={`Price override ${s} ${colorById(c)?.name}`}
                      />
                    ))}
                    <p className="text-xs text-brand-text-muted mt-2">
                      Leave blank to use the default selling price.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {grid(() => null)}
              <p className="text-sm text-brand-text-muted">
                Add at least one {p.sizes.length === 0 ? "size" : "color"} to see the quantity grid.
              </p>
            </>
          )}
        </div>
      )}

      {!p.isOneOfAKind && !hasMatrix && (
        <p className="text-sm text-brand-text-muted">
          Add at least one size and one color to track inventory. Or skip variants if this is a one-of-a-kind item.
        </p>
      )}

      {(!hasMatrix || p.isOneOfAKind) && (
        <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={p.isOneOfAKind}
            onChange={(e) => p.onOneOfAKind(e.target.checked)}
            className="w-4 h-4 accent-brand-primary"
          />
          This is a one-of-a-kind item (no variants)
        </label>
      )}

      {p.error && <p className="text-sm text-red-600 mt-2">{p.error}</p>}
    </div>
  );
}
