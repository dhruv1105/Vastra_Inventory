"use client";

import { Lock, TrendingDown, TrendingUp } from "lucide-react";
import Section from "@/components/ui/Section";
import { TextField } from "@/components/ui/Input";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ItemFormData } from "@/types";
import { margin as marginOf, type Errors } from "./form";

type Props = {
  form: ItemFormData;
  set: <K extends keyof ItemFormData>(key: K, value: ItemFormData[K]) => void;
  errors: Errors;
  number: number;
};

/** Keep digits and one decimal point; prices are typed on phone keypads. */
const money = (raw: string) => {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
};

export default function PriceSection({ form, set, errors, number }: Props) {
  const m = marginOf(form);
  return (
    <Section id="price" title="Price" number={number}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="item-cost"
          label="Cost price"
          labelExtra={
            <span className="inline-flex items-center gap-1 text-xs font-medium text-zari">
              <Lock aria-hidden="true" className="h-3 w-3" />
              staff only
            </span>
          }
          leading="₹"
          inputMode="decimal"
          placeholder="0"
          className="tabular-nums"
          value={form.costPrice}
          onChange={(e) => set("costPrice", money(e.target.value))}
        />
        <TextField
          id="item-sell"
          label="Selling price"
          required
          leading="₹"
          inputMode="decimal"
          placeholder="0"
          className="tabular-nums"
          value={form.sellingPrice}
          onChange={(e) => set("sellingPrice", money(e.target.value))}
          error={errors.sellingPrice}
        />
      </div>
      {m && (
        <p
          aria-live="polite"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2.5 font-semibold tabular-nums",
            m.diff >= 0 ? "bg-success-tint text-success" : "bg-danger-tint text-danger",
          )}
        >
          {m.diff >= 0 ? <TrendingUp aria-hidden="true" className="h-5 w-5" /> : <TrendingDown aria-hidden="true" className="h-5 w-5" />}
          {m.diff >= 0 ? `Margin ${formatINR(m.diff)} · ${m.pct.toFixed(1)}%` : `Selling ${formatINR(-m.diff)} below cost`}
        </p>
      )}
    </Section>
  );
}
