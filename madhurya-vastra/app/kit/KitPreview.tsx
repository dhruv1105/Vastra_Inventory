"use client";

import { useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Loader from "@/components/ui/Loader";

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
    </main>
  );
}
