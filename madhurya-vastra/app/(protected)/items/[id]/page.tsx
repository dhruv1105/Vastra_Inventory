"use client";

import { Pencil, Share2, ShoppingBag } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";
import Swatch from "@/components/ui/Swatch";
import Button, { LinkButton } from "@/components/ui/Button";
import ItemUnavailable from "@/components/items/ItemUnavailable";
import Skeleton from "@/components/ui/Skeleton";
import ItemGallery from "@/components/items/detail/ItemGallery";
import StockGrid from "@/components/items/detail/StockGrid";
import ItemActions from "@/components/items/detail/ItemActions";
import { WEAR_OPTIONS } from "@/components/items/form";
import { useAuth } from "@/hooks/useAuth";
import { useItem } from "@/hooks/useItem";
import { formatDateTimeIST, formatINR, margin, timeAgo } from "@/lib/format";
import { STATUS_BADGE } from "@/lib/inventory";
import { cn } from "@/lib/cn";

// One item: photos, price (cost and margin for the owner only — the API never sends cost to
// sellers), stock grid, details, who added / changed it, and the actions. Read-only; Edit opens the form.

const BACK = { href: "/inventory", label: "Inventory" };

export default function ItemPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { item, setItem, state, load } = useItem(params.id);

  const wrap = "mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-5 md:px-7 md:py-7";

  if (state === "loading") {
    return (
      <div className={wrap} role="status">
        <Skeleton className="h-9 w-2/3" />
        <div className="grid gap-5 lg:grid-cols-5">
          <Skeleton className="aspect-portrait w-full lg:col-span-2" />
          <div className="grid content-start gap-4 lg:col-span-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
        <span className="sr-only">Loading item</span>
      </div>
    );
  }

  if (state !== "ready" || !item) {
    return (
      <div className={wrap}>
        <ItemUnavailable missing={state === "missing"} onRetry={load} />
      </div>
    );
  }

  const isOwner = user?.role === "owner";
  const status = STATUS_BADGE[item.status];
  const wear = WEAR_OPTIONS.find((w) => w.value === item.wearType)?.label;
  const cheapest = Math.min(...item.variants.map((v) => v.sellingPriceOverride ?? Infinity));
  const fromPrice = cheapest < item.sellingPrice ? cheapest : null;
  const cost = "costPrice" in item ? item.costPrice : undefined;
  const m = margin(item.sellingPrice, cost);

  return (
    <div className={wrap}>
      <PageHeader
        eyebrow={item.itemTypeName ?? "Item"}
        title={item.title}
        titleOnPhone
        back={BACK}
        action={
          <div className="flex items-center gap-2">
            <LinkButton href={`/items/${item.id}/edit`} icon={<Pencil />}>
              Edit
            </LinkButton>
            <ItemActions
              item={item}
              isOwner={isOwner}
              onStale={load}
              onChanged={(next) => setItem((it) => it && { ...it, ...next, updatedAt: new Date().toISOString(), updatedBy: user ? { id: user.id, name: user.name } : it.updatedBy })}
            />
          </div>
        }
      />

      {(status || item.status === "archived") && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {status && <Badge tone={item.status === "draft" ? "zari" : "neutral"}>{status}</Badge>}
          {item.status === "draft" && <span>Not in the inventory yet. Publish it from ⋯ when it is ready.</span>}
          {item.status === "archived" && <span>Not in the inventory list.{isOwner ? " Restore it from ⋯ to bring it back." : ""}</span>}
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-5">
        <ItemGallery images={item.images} title={item.title} className="lg:sticky lg:top-20 lg:col-span-2" />

        <div className="grid min-w-0 gap-5 lg:col-span-3">
          <Section title="Price">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-semibold tabular-nums text-fg">{formatINR(item.sellingPrice)}</span>
              {fromPrice != null && <span className="text-muted">some sizes from {formatINR(fromPrice)}</span>}
            </div>
            {isOwner && (
              <dl className="grid grid-cols-2 gap-3 rounded-md bg-tint p-3 text-sm sm:max-w-md">
                <div>
                  <dt className="text-muted">Cost price</dt>
                  <dd className="font-semibold tabular-nums text-fg">{cost != null ? formatINR(cost) : "Not recorded"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Margin</dt>
                  <dd className={cn("font-semibold tabular-nums", m && m.rupees < 0 ? "text-danger" : "text-success")}>
                    {m ? `${formatINR(m.rupees)} · ${m.percent.toFixed(1)}%` : "—"}
                  </dd>
                </div>
              </dl>
            )}
          </Section>

          <Section title="Stock">
            <StockGrid variants={item.variants} isOneOfAKind={item.isOneOfAKind} status={item.status} />
          </Section>

          <Section title="Details">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Fact label="Type">{item.itemTypeName ?? <span className="text-muted">Not set</span>}</Fact>
              <Fact label="Wear type">{wear ?? <span className="text-muted">Not set</span>}</Fact>
              {item.description && (
                <Fact label="Description" wide>
                  <p className="whitespace-pre-line">{item.description}</p>
                </Fact>
              )}
              {item.occasions.length > 0 && <Fact label="Occasions" wide>{<Tags names={item.occasions.map((o) => o.name)} />}</Fact>}
              {item.tags.length > 0 && <Fact label="Tags" wide>{<Tags names={item.tags.map((t) => t.name)} />}</Fact>}
              {item.designColors.length > 0 && (
                <Fact label="Colours in the design" wide>
                  <ul className="flex flex-wrap gap-2">
                    {item.designColors.map((c) => (
                      <li key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-tint px-2.5 py-1 text-fg">
                        <Swatch hex={c.hexCode} hex2={c.hexCode2} />
                        {c.name}
                      </li>
                    ))}
                  </ul>
                </Fact>
              )}
            </dl>
          </Section>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Button variant="secondary" icon={<Share2 />} disabled fullWidth>
                Share
              </Button>
              <span className="text-xs text-muted">Sending photos and price to WhatsApp or Instagram comes next.</span>
            </div>
            <div className="grid gap-1">
              <Button variant="secondary" icon={<ShoppingBag />} disabled fullWidth>
                Mark sold
              </Button>
              <span className="text-xs text-muted">Comes with the stock ledger, so every sale is recorded.</span>
            </div>
          </div>

          <dl className="grid gap-1 px-1 text-sm text-muted">
            <When label="Added" by={item.createdBy?.name} at={item.createdAt} />
            {item.updatedAt !== item.createdAt && <When label="Last changed" by={item.updatedBy?.name} at={item.updatedAt} />}
          </dl>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("grid gap-1", wide && "sm:col-span-2")}>
      <dt className="font-semibold text-muted">{label}</dt>
      <dd className="text-fg">{children}</dd>
    </div>
  );
}

function Tags({ names }: { names: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {names.map((n) => (
        <li key={n} className="rounded-full bg-tint px-2.5 py-1">
          {n}
        </li>
      ))}
    </ul>
  );
}

/** "Added by Krishna · 3 days ago", with the exact IST time on hover. */
function When({ label, by, at }: { label: string; by?: string; at: string }) {
  return (
    <div className="flex flex-wrap gap-x-1">
      <dt>{label}</dt>
      <dd>
        {by ? `by ${by} · ` : ""}
        <time dateTime={at} title={formatDateTimeIST(at)}>
          {timeAgo(at)}
        </time>
      </dd>
    </div>
  );
}
