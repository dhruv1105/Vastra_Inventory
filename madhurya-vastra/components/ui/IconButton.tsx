import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> & {
  /** Required: what the button does, e.g. "Delete Crepe". Used as aria-label and tooltip. */
  label: string;
  /** The lucide icon element. */
  children: ReactNode;
  tone?: "default" | "danger";
  size?: "sm" | "md";
};

/** Icon-only button. Always labelled; 40px (md) / 36px (sm) target, hover tint. */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, tone = "default", size = "md", className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-md text-muted transition-colors duration-fast ease-brand",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft disabled:pointer-events-none disabled:opacity-50",
        size === "md" ? "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5" : "h-9 w-9 [&_svg]:h-4 [&_svg]:w-4",
        tone === "danger" ? "hover:bg-danger-tint hover:text-danger" : "hover:bg-tint hover:text-primary",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export default IconButton;
