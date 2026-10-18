import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

// TODO(roadmap): build the real dashboard once Inventory list and Sales hold enough data —
// today's sales, low stock, best sellers, stock value. Scope in docs/roadmap.md#dashboard.
export default function DashboardPage() {
  return (
    <div className="mv-stagger mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-5 md:px-7 md:py-7">
      <PageHeader eyebrow="Overview" title="Dashboard" />
      <EmptyState eyebrow="Comes after Sales" title="Your shop at a glance">
        Today&apos;s sales, items running low and this month&apos;s best sellers will appear here.
      </EmptyState>
    </div>
  );
}
