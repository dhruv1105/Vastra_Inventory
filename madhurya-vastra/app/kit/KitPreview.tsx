"use client";

import { useState, type ReactNode } from "react";
import { Lock, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Loader from "@/components/ui/Loader";
import Field from "@/components/ui/Field";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Input";
import { ChipGroup } from "@/components/ui/Chip";

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

  return (
    <main className="mx-auto grid max-w-4xl gap-5 px-4 py-8">
      <header className="grid gap-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-zari">Redesign R1</span>
        <h1 className="font-display text-3xl text-fg">Kit preview</h1>
        <p className="text-muted">Every shared component, in the current theme. Development only.</p>
      </header>

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
