"use client";

import Section from "@/components/ui/Section";
import Field from "@/components/ui/Field";
import { ChipGroup } from "@/components/ui/Chip";
import Skeleton from "@/components/ui/Skeleton";
import type { ItemFormData, LookupItem } from "@/types";

type Props = {
  form: ItemFormData;
  set: <K extends keyof ItemFormData>(key: K, value: ItemFormData[K]) => void;
  occasions: LookupItem[];
  tags: LookupItem[];
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

export default function ClassifySection({ form, set, occasions, tags, loading, number }: Props) {
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
    </Section>
  );
}
