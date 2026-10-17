import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import Loader from "./Loader";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows the loader, disables the button and sets aria-busy. */
  loading?: boolean;
  /** Icon before the label (lucide icon element). */
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-base ease-brand " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-on shadow-md shadow-primary/25 hover:bg-primary-hover",
  secondary: "border border-primary-soft bg-surface text-primary hover:bg-tint",
  ghost: "text-primary hover:bg-tint",
  danger: "bg-danger text-surface hover:bg-danger/90",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm [&_svg]:h-4 [&_svg]:w-4",
  md: "min-h-11 px-5 text-base [&_svg]:h-5 [&_svg]:w-5",
};

/** The one button. One `primary` per screen; the rest secondary/ghost; `danger` only to delete. */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, icon, iconRight, fullWidth, className, children, disabled, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...rest}
    >
      {loading ? <Loader size="sm" label="Working" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
});

export default Button;
