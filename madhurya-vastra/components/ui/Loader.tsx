import { cn } from "@/lib/cn";

type LoaderProps = {
  /** Read by screen readers. */
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

/** Three pulsing dots, echoing the dots above the lotus in the logo. */
export default function Loader({ label = "Loading", size = "md", className }: LoaderProps) {
  const dot = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  return (
    <span role="status" className={cn("inline-flex items-center gap-1.5", className)}>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          aria-hidden="true"
          className={cn(dot, "rounded-full bg-current animate-pulse")}
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
      <span className="sr-only">{label}</span>
    </span>
  );
}
