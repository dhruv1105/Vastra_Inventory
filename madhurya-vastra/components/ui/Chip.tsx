"use client";

import type { ButtonHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  selected: boolean;
};

/** A toggle pill. Selected = tint + primary border + check mark (state is not shown by colour alone). */
export function Chip({ selected, className, children, type, ...rest }: ChipProps) {
  return (
    <button
      type={type ?? "button"}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors duration-fast ease-brand",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft",
        selected ? "border-primary bg-tint font-semibold text-primary" : "border-line bg-surface text-fg hover:border-primary-soft",
        className,
      )}
      {...rest}
    >
      {selected && <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />}
      {children}
    </button>
  );
}

export type ChipOption = { value: string; label: string };

type ChipGroupBase = {
  options: ChipOption[];
  /** Accessible name, or reference a visible label with labelledBy. */
  label?: string;
  labelledBy?: string;
  invalid?: boolean;
  className?: string;
};

export type ChipGroupProps =
  | (ChipGroupBase & { multiple: true; value: string[]; onChange: (value: string[]) => void })
  | (ChipGroupBase & { multiple?: false; value: string | null; onChange: (value: string) => void });

/** Single choice (wear type) or multiple choice (occasions, tags) as chips. */
export function ChipGroup(props: ChipGroupProps) {
  const { options, label, labelledBy, invalid, className } = props;
  const isOn = (v: string) => (props.multiple ? props.value.includes(v) : props.value === v);
  const toggle = (v: string) => {
    if (props.multiple) {
      props.onChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    } else {
      props.onChange(v);
    }
  };
  return (
    <div
      role="group"
      aria-label={label}
      aria-labelledby={labelledBy}
      className={cn("flex flex-wrap gap-2", invalid && "rounded-md outline outline-2 outline-offset-4 outline-danger-tint", className)}
    >
      {options.map((o) => (
        <Chip key={o.value} selected={isOn(o.value)} onClick={() => toggle(o.value)}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}
