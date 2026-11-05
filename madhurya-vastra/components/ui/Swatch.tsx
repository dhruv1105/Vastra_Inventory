import { cn } from "@/lib/cn";

/**
 * A colour dot from the Colours list (data colour, so an inline style is allowed). Decorative.
 * With a second colour (a combination like "Red & Gold") the dot is split half and half.
 */
export default function Swatch({ hex, hex2, size = "sm", className }: { hex?: string | null; hex2?: string | null; size?: "sm" | "md"; className?: string }) {
  const first = hex || "transparent";
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block shrink-0 rounded-full border border-line", size === "sm" ? "h-4 w-4" : "h-7 w-7", className)}
      style={hex2 ? { background: `linear-gradient(135deg, ${first} 50%, ${hex2} 50%)` } : { backgroundColor: first }}
    />
  );
}
