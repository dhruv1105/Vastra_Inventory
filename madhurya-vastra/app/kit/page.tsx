import { notFound } from "next/navigation";
import KitPreview from "./KitPreview";

// Development-only preview of every kit component (redesign R1). Not reachable in production.
export default function KitPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <KitPreview />;
}
