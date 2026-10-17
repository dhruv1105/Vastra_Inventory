import Image from "next/image";
import { cn } from "@/lib/cn";

// The real logo files in public/brand, cut from assets/Madhurya vastra Logo.png.
// Never redraw, trace or recolour the logo in code (docs/theming.md).

/** Full lockup: lotus, wordmark, tagline and vine. For login / intro on the lavender backdrop. */
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/logo.png"
      alt="Madhurya Vastra — Grace in every thread"
      width={1024}
      height={807}
      priority={priority}
      className={cn("h-auto w-full max-w-xs", className)}
    />
  );
}

/** The lotus with the M. Decorative by default; pass `alt` when it stands alone as the brand. */
export function BrandMark({ className, alt = "" }: { className?: string; alt?: string }) {
  return <Image src="/brand/mark.png" alt={alt} width={480} height={262} className={cn("h-auto w-28", className)} />;
}

/** The flourish under the logo's tagline. Always decorative. */
export function Vine({ className }: { className?: string }) {
  return <Image src="/brand/vine.png" alt="" width={900} height={79} className={cn("h-auto w-44 opacity-60", className)} />;
}

/** "Madhurya Vastra" set in the wordmark font. */
export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-brand font-semibold leading-none text-primary", className)}>Madhurya Vastra</span>;
}
