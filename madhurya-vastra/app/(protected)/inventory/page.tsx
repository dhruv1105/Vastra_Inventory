import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";

// Placeholder until the inventory list is built (next feature after the redesign).
export default function InventoryPage() {
  return (
    <div className="mv-stagger mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-5 md:px-7 md:py-7">
      <PageHeader eyebrow="Stock" title="Inventory" />
      <EmptyState
        title="Your shelves are empty"
        action={
          <LinkButton href="/items/new" icon={<Plus />}>
            Add first item
          </LinkButton>
        }
      >
        Add your first saree, kurti or lehenga. It will show here with its sizes, colours and stock.
      </EmptyState>
    </div>
  );
}
