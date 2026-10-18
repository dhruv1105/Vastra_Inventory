"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Plus, RotateCw, Search, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Button, { LinkButton } from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import InventoryCard, { type InventoryLayout } from "@/components/inventory/InventoryCard";
import InventorySkeleton, { listClass } from "@/components/inventory/InventorySkeleton";
import { cn } from "@/lib/cn";
import { SEARCH_MAX, type InventoryItem, type InventoryPage } from "@/lib/inventory";
import { apiFetch, isAbortError } from "@/lib/api-client";

/** The server's generic failure sentence (GET /api/items 500). The error card's title already says it. */
const LOAD_FAILED = "Could not load the inventory. Try again.";

/** Phone list/grid choice, remembered per device. */
const LAYOUT_KEY = "mv-inventory-layout";

/** Saved layout, or grid when nothing is saved or storage is unavailable (private mode, blocked). */
function readLayout(): InventoryLayout {
  try {
    return localStorage.getItem(LAYOUT_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

function saveLayout(layout: InventoryLayout) {
  try {
    localStorage.setItem(LAYOUT_KEY, layout);
  } catch {
    // Storage unavailable: the choice lasts for this visit only.
  }
}

/** Grid / list switch for phones (tablet and up are always grid). */
function LayoutToggle({ value, onChange }: { value: InventoryLayout; onChange: (l: InventoryLayout) => void }) {
  const options: { value: InventoryLayout; label: string; icon: JSX.Element }[] = [
    { value: "grid", label: "Show as grid", icon: <LayoutGrid /> },
    { value: "list", label: "Show as list", icon: <List /> },
  ];
  return (
    <div role="group" aria-label="Layout" className="flex shrink-0 rounded-md border border-line bg-surface p-0.5 md:hidden">
      {options.map((o) => (
        <IconButton
          key={o.value}
          label={o.label}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(value === o.value && "bg-tint text-primary")}
        >
          {o.icon}
        </IconButton>
      ))}
    </div>
  );
}

/** Wait this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 300;

/** GET /api/items through the shared client (a 401 goes to /login and comes back here). */
function fetchPage(q: string, cursor: string | null, signal: AbortSignal): Promise<InventoryPage> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString(); // (URLSearchParams.size is too new for older phone browsers)
  return apiFetch<InventoryPage>(`/api/items${qs ? `?${qs}` : ""}`, { signal });
}

const isAbort = isAbortError;

function InventoryList() {
  const router = useRouter();
  const pathname = usePathname();
  const initialQuery = useSearchParams().get("q") ?? "";

  const [text, setText] = useState(initialQuery); // what is in the box
  const [term, setTerm] = useState(initialQuery.trim()); // what was last searched
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [moreState, setMoreState] = useState<"idle" | "loading" | "error">("idle");
  const [moreError, setMoreError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [layout, setLayout] = useState<InventoryLayout>("grid");

  // Read after mount: the server render can't see localStorage (avoids a hydration mismatch).
  useEffect(() => setLayout(readLayout()), []);
  const changeLayout = (l: InventoryLayout) => {
    setLayout(l);
    saveLayout(l);
  };

  // Debounce: search 300 ms after typing stops; keep it in ?q= so Back from an item restores it.
  useEffect(() => {
    const next = text.trim();
    if (next === term) return;
    const t = setTimeout(() => {
      setTerm(next);
      router.replace(next ? `${pathname}?q=${encodeURIComponent(next)}` : pathname, { scroll: false });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text, term, pathname, router]);

  // First page for the current search. A newer search aborts the older request, so a slow
  // response can never overwrite a newer one.
  const load = useCallback(() => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setState("loading");
    setMoreState("idle");
    fetchPage(term, null, c.signal)
      .then((page) => {
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setState("ready");
      })
      .catch((err) => {
        if (isAbort(err)) return;
        setError((err as Error).message);
        setState("error");
      });
  }, [term]);

  useEffect(() => {
    load();
    return () => controller.current?.abort();
  }, [load]);

  const showMore = () => {
    if (!nextCursor || moreState === "loading") return;
    const c = controller.current ?? new AbortController();
    controller.current = c;
    setMoreState("loading");
    fetchPage(term, nextCursor, c.signal)
      .then((page) => {
        // Keyset paging never repeats rows; the filter only guards against a double tap.
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...page.items.filter((i) => !seen.has(i.id))];
        });
        setNextCursor(page.nextCursor);
        setMoreState("idle");
      })
      .catch((err) => {
        if (isAbort(err)) return;
        setMoreError((err as Error).message);
        setMoreState("error"); // items already shown stay on screen
      });
  };

  const clearSearch = () => {
    setText("");
    setTerm("");
    router.replace(pathname, { scroll: false });
    inputRef.current?.focus();
  };

  return (
    <div className="mv-stagger mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-5 md:px-7 md:py-7">
      <PageHeader
        eyebrow="Stock"
        title="Inventory"
        action={
          <LinkButton href="/items/new" icon={<Plus />} className="hidden md:inline-flex">
            Add item
          </LinkButton>
        }
      />

      <div className="flex items-center gap-2">
        <div role="search" className="min-w-0 flex-1">
          <div className="relative min-w-0 flex-1">
            <Input
              ref={inputRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              aria-label="Search items by title"
              placeholder="Search by title, e.g. lav geo"
              maxLength={SEARCH_MAX}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && text && clearSearch()}
              leading={<Search />}
              className="pr-11 [&::-webkit-search-cancel-button]:hidden"
            />
            {text && (
              <IconButton label="Clear search" size="sm" onClick={clearSearch} className="absolute right-1 top-1/2 -translate-y-1/2">
                <X />
              </IconButton>
            )}
          </div>
        </div>
        <LayoutToggle value={layout} onChange={changeLayout} />
      </div>

      {/* Announces results to screen readers without moving focus. */}
      <p className="sr-only" aria-live="polite">
        {state === "ready" && (items.length ? `${items.length} item${items.length === 1 ? "" : "s"} shown${nextCursor ? ", more available" : ""}` : "No items")}
      </p>

      {state === "loading" && <InventorySkeleton layout={layout} label={term ? `Searching for ${term}` : "Loading items"} />}

      {state === "error" && (
        <EmptyState
          compact
          title="Couldn't load the inventory"
          action={
            <Button variant="secondary" icon={<RotateCw />} onClick={load}>
              Try again
            </Button>
          }
        >
          {error === LOAD_FAILED ? "Nothing was changed. Try again in a moment." : error}
        </EmptyState>
      )}

      {state === "ready" && items.length === 0 && !term && (
        <EmptyState
          title="Your shelves are empty"
          action={
            <LinkButton href="/items/new" icon={<Plus />}>
              Add first item
            </LinkButton>
          }
        >
          Add your first saree, kurti or lehenga. It will show here with its photo, price and stock.
        </EmptyState>
      )}

      {state === "ready" && items.length === 0 && term && (
        <EmptyState
          compact
          title={`No items match “${term}”`}
          action={
            <Button variant="secondary" icon={<X />} onClick={clearSearch}>
              Clear search
            </Button>
          }
        >
          Search looks at item titles. Try the first few letters of a word, like “lav” for Lavender.
        </EmptyState>
      )}

      {state === "ready" && items.length > 0 && (
        <>
          <ul className={listClass(layout)}>
            {items.map((item) => (
              <li key={item.id} className="grid">
                <InventoryCard item={item} layout={layout} />
              </li>
            ))}
          </ul>

          {(nextCursor || moreState === "error") && (
            <div className="grid justify-items-center gap-2 pb-2">
              {moreState === "error" && (
                <p role="alert" className="text-center text-sm text-danger">
                  {moreError}
                </p>
              )}
              <Button variant="secondary" loading={moreState === "loading"} onClick={showMore} icon={moreState === "error" ? <RotateCw /> : undefined}>
                {moreState === "error" ? "Try again" : "Show more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function InventoryPage() {
  // useSearchParams needs a Suspense boundary; the skeleton doubles as its fallback.
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 md:px-7 md:py-7">
          <InventorySkeleton />
        </div>
      }
    >
      <InventoryList />
    </Suspense>
  );
}
