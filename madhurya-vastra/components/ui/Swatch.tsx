import { cn } from "@/lib/cn";

/** A colour dot from the Colours list (data colour, so an inline style is allowed). Decorative. */
export default function Swatch({ hex, size = "sm", className }: { hex?: string | null; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block shrink-0 rounded-full border border-line", size === "sm" ? "h-4 w-4" : "h-7 w-7", className)}
      style={{ backgroundColor: hex || "transparent" }}
    />
  );
}
