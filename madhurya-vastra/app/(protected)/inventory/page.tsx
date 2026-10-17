import Link from "next/link";

export default function InventoryPage() {
  return (
    <div className="p-4 md:p-6 mx-auto max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-primary">Inventory</h1>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center border-2 border-dashed border-gray-200 rounded-[12px] bg-white p-8">
        <div className="w-16 h-16 bg-brand-secondary/10 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">📦</span>
        </div>
        <h2 className="text-xl font-medium text-brand-text-primary mb-2">No items yet</h2>
        <p className="text-brand-text-muted mb-6 max-w-sm">
          Your inventory is empty. Add your first item to start managing your collection.
        </p>
      </div>

      <Link
        href="/items/new"
        aria-label="Add item"
        className="fixed bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1rem)] md:bottom-8 right-4 md:right-8 w-14 h-14 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-primary/30 hover:bg-brand-secondary transition-all hover:scale-105 z-40"
      >
        <span className="text-3xl leading-none -mt-1">+</span>
      </Link>
    </div>
  );
}
