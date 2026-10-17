import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type FieldProps = {
  /** id of the control inside; the label points at it. */
  id: string;
  label: ReactNode;
  required?: boolean;
  /** Extra text next to the label, e.g. a "staff only" lock. */
  labelExtra?: ReactNode;
  help?: ReactNode;
  /** Plain sentence saying what to fix. Replaces help while shown. */
  error?: string | null;
  /** Character counter, e.g. { value: 24, max: 150 }. */
  count?: { value: number; max: number };
  /** Set when the control is a group (chips) rather than one input: renders a <span> label. */
  group?: boolean;
  className?: string;
  children: ReactNode;
};

/** ids a control should reference in aria-describedby. */
export const fieldIds = (id: string) => ({ help: `${id}-help`, error: `${id}-error` });

/**
 * Label + control + help / error / counter. For plain inputs prefer TextField / TextAreaField /
 * SelectField, which wire aria-describedby and aria-invalid for you.
 */
export default function Field({ id, label, required, labelExtra, help, error, count, group, className, children }: FieldProps) {
  const ids = fieldIds(id);
  const Label = group ? "span" : "label";
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <Label {...(group ? { id: `${id}-label` } : { htmlFor: id })} className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-fg">
        <span>
          {label}
          {required && <span className="text-danger" aria-hidden="true"> *</span>}
          {required && <span className="sr-only"> (required)</span>}
        </span>
        {labelExtra}
      </Label>
      {children}
      {(error || help || count) && (
        <div className="flex items-start justify-between gap-3 text-sm">
          {error ? (
            <span id={ids.error} className="text-danger" aria-live="polite">{error}</span>
          ) : (
            <span id={ids.help} className="text-muted">{help}</span>
          )}
          {count && (
            <span className={cn("shrink-0 tabular-nums", count.value > count.max ? "text-danger" : "text-muted")}>
              {count.value}/{count.max}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
