import { ArrowLeft, RotateCw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Button, { LinkButton } from "@/components/ui/Button";

/** An item page that can't show its item: gone (deleted, unknown, bad link) or failed to load. */
export default function ItemUnavailable({ missing, onRetry }: { missing: boolean; onRetry: () => void }) {
  return (
    <>
      <PageHeader title="Item" back={{ href: "/inventory", label: "Inventory" }} />
      <EmptyState
        compact
        title={missing ? "This item isn't here" : "Couldn't load this item"}
        action={
          missing ? (
            <LinkButton href="/inventory" icon={<ArrowLeft />}>
              Back to inventory
            </LinkButton>
          ) : (
            <Button variant="secondary" icon={<RotateCw />} onClick={onRetry}>
              Try again
            </Button>
          )
        }
      >
        {missing ? "It may have been removed, or the link is wrong." : "Nothing was changed. Try again in a moment."}
      </EmptyState>
    </>
  );
}
