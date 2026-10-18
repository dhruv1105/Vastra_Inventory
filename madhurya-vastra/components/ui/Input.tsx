import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import Field, { fieldIds, type FieldProps } from "./Field";

/** True when the caller sized the control (w-16, w-28 …) — then the default w-full is left out,
 *  because two width classes in one string do not override each other predictably. */
const sized = (className?: string) => !!className && /(^|\s)w-/.test(className);

/** Shared look of every text-like control. */
export const controlClass = (invalid?: boolean, className?: string) =>
  cn(
    !sized(className) && "w-full",
    "min-h-11 rounded-md border bg-surface px-3 py-2 text-base text-fg placeholder:text-muted/70",
    "transition-[border-color,box-shadow] duration-fast ease-brand",
    "focus:outline-none focus:border-primary-soft focus:ring-4 focus:ring-tint-strong",
    "disabled:cursor-not-allowed disabled:opacity-60",
    invalid ? "border-danger ring-4 ring-danger-tint" : "border-line",
  );

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  /** Fixed text or icon inside the left edge, e.g. "₹" or a phone icon. */
  leading?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, leading, className, ...rest }, ref) {
  const input = (
    <input ref={ref} aria-invalid={invalid || undefined} className={cn(controlClass(invalid, className), leading ? "pl-9" : undefined, className)} {...rest} />
  );
  if (!leading) return input;
  return (
    <div className={cn("relative", sized(className) && "w-fit")}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted [&_svg]:h-4 [&_svg]:w-4">
        {leading}
      </span>
      {input}
    </div>
  );
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ invalid, className, ...rest }, ref) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={cn(controlClass(invalid, className), "min-h-24 resize-y", className)} {...rest} />;
});

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

/** Native select (best on phones), styled like the other controls. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ invalid, className, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} aria-invalid={invalid || undefined} className={cn(controlClass(invalid, className), "appearance-none pr-10", className)} {...rest}>
        {children}
      </select>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
});

type FieldBits = Pick<FieldProps, "label" | "required" | "labelExtra" | "help" | "error" | "count"> & { fieldClassName?: string };

const describedBy = (id: string, f: FieldBits) => {
  const ids = fieldIds(id);
  return f.error ? ids.error : f.help ? ids.help : undefined;
};

/** Label + Input + help/error, with aria wiring. `id` is required. */
export const TextField = forwardRef<HTMLInputElement, InputProps & FieldBits & { id: string }>(function TextField(
  { id, label, required, labelExtra, help, error, count, fieldClassName, ...input },
  ref,
) {
  const f = { label, required, labelExtra, help, error, count };
  return (
    <Field id={id} {...f} className={fieldClassName}>
      <Input ref={ref} id={id} required={required} invalid={!!error} aria-describedby={describedBy(id, f)} {...input} />
    </Field>
  );
});

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextareaProps & FieldBits & { id: string }>(function TextAreaField(
  { id, label, required, labelExtra, help, error, count, fieldClassName, ...input },
  ref,
) {
  const f = { label, required, labelExtra, help, error, count };
  return (
    <Field id={id} {...f} className={fieldClassName}>
      <Textarea ref={ref} id={id} required={required} invalid={!!error} aria-describedby={describedBy(id, f)} {...input} />
    </Field>
  );
});

export const SelectField = forwardRef<HTMLSelectElement, SelectProps & FieldBits & { id: string }>(function SelectField(
  { id, label, required, labelExtra, help, error, count, fieldClassName, children, ...select },
  ref,
) {
  const f = { label, required, labelExtra, help, error, count };
  return (
    <Field id={id} {...f} className={fieldClassName}>
      <Select ref={ref} id={id} required={required} invalid={!!error} aria-describedby={describedBy(id, f)} {...select}>
        {children}
      </Select>
    </Field>
  );
});
