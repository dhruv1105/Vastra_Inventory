import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "primary" | "zari" | "success" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-tint text-muted",
  primary: "bg-tint text-primary",
  // Gold = needs attention (rules §5.4), e.g. "Low stock".
  zari: "bg-zari-tint text-zari",
  success: "bg-success-tint text-success",
  // Red only when something is blocked or destructive.
  danger: "bg-danger-tint text-danger",
};

export type BadgeProps = {
  tone?: BadgeTone;
  /** Optional small icon before the text (lucide, sized by the badge). */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * A small, non-interactive status label: "Draft", "Sold out", "Low stock". Always has text, so the
 * state never depends on colour alone. Use one or two per card — the normal case gets no badge.
 */
export default function Badge({ tone = "neutral", icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold leading-5",
        "[&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
