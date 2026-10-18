import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

// Placeholder until billing is built (after the inventory list and the stock ledger).
export default function SalesPage() {
  return (
    <div className="mv-stagger mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-5 md:px-7 md:py-7">
      <PageHeader eyebrow="Billing" title="Sales" />
      <EmptyState eyebrow="Comes after the inventory list" title="Sales start here">
        Each sale you record will take that size and colour off the shelf and add to the day&apos;s total.
      </EmptyState>
    </div>
  );
}
