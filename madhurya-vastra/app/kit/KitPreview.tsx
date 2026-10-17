"use client";

import { useState, type ReactNode } from "react";
import { Lock, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Loader from "@/components/ui/Loader";
import Field from "@/components/ui/Field";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Input";
import { ChipGroup } from "@/components/ui/Chip";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { BrandMark, Logo, Vine, Wordmark } from "@/components/ui/Brand";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Tabs from "@/components/ui/Tabs";
import Menu, { MenuHeader, MenuItem } from "@/components/ui/Menu";
import { useToast } from "@/context/ToastContext";
import { LogOut } from "lucide-react";
import ThemeSwitch from "@/components/ui/ThemeSwitch";

const LIST_TABS = [
  { id: "types", label: "Item types", count: 10 },
  { id: "colors", label: "Colours", count: 18 },
  { id: "occasions", label: "Occasions", count: 10 },
  { id: "tags", label: "Tags", count: 17 },
];

const OCCASIONS = ["Casual", "Festive", "Wedding", "Party", "Office Wear"].map((v) => ({ value: v, label: v }));
const WEAR = [
  { value: "top", label: "Top wear" },
  { value: "bottom", label: "Bottom wear" },
  { value: "both", label: "Top + Bottom" },
];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-lg border border-line bg-surface p-5">
      <h2 className="font-display text-xl text-primary">{title}</h2>
      {children}
    </section>
  );
}

export default function KitPreview() {
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("Lavender Georgette Saree");
  const [wear, setWear] = useState<string | null>(null);
  const [occ, setOcc] = useState<string[]>(["Festive"]);
  const [tab, setTab] = useState("types");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { showToast } = useToast();

  return (
    <main className="mx-auto grid max-w-4xl gap-5 px-4 py-8">
      <header className="grid gap-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-zari">Redesign R1</span>
        <h1 className="font-display text-3xl text-fg">Kit preview</h1>
        <p className="text-muted">Every shared component, in the current theme. Development only.</p>
        <ThemeSwitch className="mt-2 w-fit" />
      </header>

      <Block title="Brand">
        <div className="flex flex-wrap items-center gap-6">
          <div className="rounded-lg bg-lavender p-4"><Logo className="w-48" /></div>
          <BrandMark alt="Madhurya Vastra" />
          <Vine />
          <Wordmark className="text-3xl" />
        </div>
      </Block>

      <Block title="Page header">
        <PageHeader
          eyebrow="New stock"
          title="Add Item"
          subtitle="Fill what you know now; you can save as a draft and finish later."
          back={{ href: "/inventory", label: "Inventory" }}
          action={<Button icon={<Plus />}>Add item</Button>}
        />
      </Block>

      <Section title="Photos" number={1} hint="First photo is the cover" id="photos">
        <p className="text-muted">A Section is the one card on a screen.</p>
      </Section>
      <Section title="Price overrides" collapsible defaultOpen={false} actions={<Button size="sm" variant="secondary" icon={<Plus />}>Size</Button>}>
        <p className="text-muted">Collapsible content.</p>
      </Section>

      <EmptyState title="Your shelves are empty" action={<Button icon={<Plus />}>Add first item</Button>}>
        Add your first saree, kurti or lehenga. It will show here with its sizes, colours and stock.
      </EmptyState>
      <EmptyState compact eyebrow="Comes after Sales" title="Your shop at a glance">
        Today&apos;s sales, items running low and best sellers will appear here.
      </EmptyState>

      <Block title="Tabs, menu, dialog, toast">
        <Tabs label="Lists" idPrefix="kit-lists" tabs={LIST_TABS} value={tab} onChange={setTab} />
        <div id={`kit-lists-panel-${tab}`} role="tabpanel" aria-labelledby={`kit-lists-tab-${tab}`} className="text-muted">
          Showing the {LIST_TABS.find((t) => t.id === tab)?.label.toLowerCase()} list.
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="danger" icon={<Trash2 />} onClick={() => setConfirmOpen(true)}>Delete “Crepe”</Button>
          <Button variant="secondary" onClick={() => showToast("Saved", "success")}>Success toast</Button>
          <Button variant="secondary" onClick={() => showToast("Could not reach the server. Check your connection and try again.", "error")}>Error toast</Button>
          <Menu
            label="Account menu"
            trigger={<span className="font-display text-lg">K</span>}
            triggerClassName="grid h-10 w-10 place-items-center rounded-full border border-line bg-tint text-primary"
          >
            <MenuHeader>
              <div className="font-semibold">Krishna Sindha</div>
              <span className="mt-1 inline-block rounded-full bg-zari-tint px-2 text-xs font-semibold text-zari">Owner</span>
            </MenuHeader>
            <MenuItem tone="danger" icon={<LogOut />} onSelect={() => showToast("Signed out", "info")}>Sign out</MenuItem>
          </Menu>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          title="Delete “Crepe”?"
          confirmLabel="Delete"
          cancelLabel="Keep it"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={async () => {
            await new Promise((r) => setTimeout(r, 600));
            setConfirmOpen(false);
            showToast("Deleted “Crepe”", "success", { action: { label: "Undo", onClick: () => showToast("Restored “Crepe”", "info") } });
          }}
        >
          It disappears from the choices on Add Item. Items already tagged “Crepe” keep it.
        </ConfirmDialog>
      </Block>

      <Block title="Skeleton">
        <SkeletonRows rows={3} />
      </Block>

      <Block title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={<Plus />}>Add to inventory</Button>
          <Button variant="secondary">Save as draft</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger" icon={<Trash2 />}>Delete</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" icon={<Plus />}>Size</Button>
          <Button size="sm" variant="secondary" icon={<Plus />}>Colour</Button>
          <Button
            loading={busy}
            onClick={() => {
              setBusy(true);
              setTimeout(() => setBusy(false), 1500);
            }}
          >
            {busy ? "Saving…" : "Click to see loading"}
          </Button>
        </div>
        <Button fullWidth>Full width (phone action bar)</Button>
      </Block>

      <Block title="Icon buttons and loader">
        <div className="flex flex-wrap items-center gap-2">
          <IconButton label="Edit Crepe"><Pencil /></IconButton>
          <IconButton label="Delete Crepe" tone="danger"><Trash2 /></IconButton>
          <IconButton label="Edit Crepe" size="sm"><Pencil /></IconButton>
          <span className="ml-4 text-primary"><Loader /></span>
        </div>
      </Block>

      <Block title="Fields">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="k-title"
            label="Title"
            required
            maxLength={150}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            count={{ value: title.length, max: 150 }}
            error={title.trim() ? null : "Add a title so staff can find this item"}
          />
          <SelectField id="k-type" label="Item type" defaultValue="">
            <option value="">Choose a type</option>
            <option>Saree</option>
            <option>Kurti</option>
          </SelectField>
          <TextField
            id="k-cost"
            label="Cost price"
            labelExtra={<span className="inline-flex items-center gap-1 text-xs font-medium text-zari"><Lock className="h-3 w-3" />staff only</span>}
            leading="₹"
            inputMode="decimal"
            defaultValue="1200"
          />
          <TextField id="k-phone" label="Phone number" leading={<Phone />} inputMode="tel" placeholder="98765 43210" help="We'll text you a 6-digit code." />
        </div>
        <TextAreaField id="k-desc" label="Description" placeholder="Fabric, work, special features…" />
      </Block>

      <Block title="Chips">
        <Field id="k-wear" label="Wear type" required group error={wear ? null : "Choose top, bottom or both"}>
          <ChipGroup labelledBy="k-wear-label" options={WEAR} value={wear} onChange={setWear} invalid={!wear} />
        </Field>
        <Field id="k-occ" label="Occasions" group>
          <ChipGroup multiple labelledBy="k-occ-label" options={OCCASIONS} value={occ} onChange={setOcc} />
        </Field>
      </Block>
    </main>
  );
}
