"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import Section from "@/components/ui/Section";
import Field from "@/components/ui/Field";
import { ChipGroup } from "@/components/ui/Chip";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import ColorPicker from "./ColorPicker";
import ColorChip from "./ColorChip";
import type { ItemFormData, LookupItem } from "@/types";

type Props = {
  form: ItemFormData;
  set: <K extends keyof ItemFormData>(key: K, value: ItemFormData[K]) => void;
  occasions: LookupItem[];
  tags: LookupItem[];
  colors: LookupItem[];
  loading: boolean;
  number: number;
};

const opts = (items: LookupItem[]) => items.map((i) => ({ value: i.id, label: i.name }));

function Chips({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  if (!loading) return <>{children}</>;
  return (
    <div className="flex flex-wrap gap-2">
      {/* Literal class names: Tailwind cannot see classes built at runtime. */}
      {["w-16", "w-20", "w-14", "w-24", "w-20"].map((w, i) => (
        <Skeleton key={i} round className={`h-9 ${w}`} />
      ))}
    </div>
  );
}

export default function ClassifySection({ form, set, occasions, tags, colors, loading, number }: Props) {
  const [picking, setPicking] = useState(false);
  const colorById = (id: string) => colors.find((c) => c.id === id);
  return (
    <Section id="classify" title="Classify" number={number} hint="Helps find the item later">
      <Field id="item-occasions" label="Occasions" group>
        <Chips loading={loading}>
          <ChipGroup multiple labelledBy="item-occasions-label" options={opts(occasions)} value={form.occasionIds} onChange={(v) => set("occasionIds", v)} />
        </Chips>
      </Field>
      <Field id="item-tags" label="Tags" group>
        <Chips loading={loading}>
          <ChipGroup multiple labelledBy="item-tags-label" options={opts(tags)} value={form.tagIds} onChange={(v) => set("tagIds", v)} />
        </Chips>
      </Field>
      <Field
        id="item-design-colours"
        label="Colours in the design"
        group
        help="For a piece with several colours, e.g. red with a gold border. Stock is counted under Sizes & colours."
      >
        <div role="group" aria-labelledby="item-design-colours-label" className="flex flex-wrap gap-2">
          {form.designColorIds.map((id) => (
            <ColorChip
              key={id}
              color={colorById(id)}
              removeLabel={`Remove ${colorById(id)?.name} from the design`}
              onRemove={() => set("designColorIds", form.designColorIds.filter((c) => c !== id))}
            />
          ))}
          <Button size="sm" variant="secondary" icon={<Palette />} onClick={() => setPicking(true)} disabled={loading}>
            {form.designColorIds.length ? "Change colours" : "Choose colours"}
          </Button>
        </div>
      </Field>
      <ColorPicker
        open={picking}
        title="Colours in the design"
        colors={colors}
        value={form.designColorIds}
        onClose={() => setPicking(false)}
        onDone={(ids) => {
          set("designColorIds", ids);
          setPicking(false);
        }}
      />
    </Section>
  );
}
