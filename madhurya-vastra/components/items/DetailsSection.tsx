"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Section from "@/components/ui/Section";
import Field from "@/components/ui/Field";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Input";
import { ChipGroup } from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import type { ItemFormData, LookupItem, WearType } from "@/types";
import { DESC_MAX, TITLE_MAX, WEAR_OPTIONS, type Errors } from "./form";

type Props = {
  form: ItemFormData;
  set: <K extends keyof ItemFormData>(key: K, value: ItemFormData[K]) => void;
  errors: Errors;
  itemTypes: LookupItem[];
  loading: boolean;
  /** Creates a new item type; resolves with it, throws with a message. */
  onAddType: (name: string) => Promise<LookupItem>;
  number: number;
};

export default function DetailsSection({ form, set, errors, itemTypes, loading, onAddType, number }: Props) {
  const [adding, setAdding] = useState(false);
  const [typeName, setTypeName] = useState("");
  const [typeError, setTypeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const closeAdd = () => {
    setAdding(false);
    setTypeName("");
    setTypeError(null);
  };

  const saveType = async () => {
    const name = typeName.trim();
    if (!name) return setTypeError("Give the item type a name.");
    setSaving(true);
    try {
      const created = await onAddType(name);
      set("itemTypeId", created.id);
      closeAdd();
    } catch (e) {
      setTypeError(e instanceof Error ? e.message : "Could not add the item type.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section id="details" title="Details" number={number}>
      <TextField
        id="item-title"
        label="Title"
        required
        maxLength={TITLE_MAX}
        placeholder="e.g. Lavender Georgette Saree"
        value={form.title}
        onChange={(e) => set("title", e.target.value)}
        error={errors.title}
        count={{ value: form.title.length, max: TITLE_MAX }}
      />
      <TextAreaField
        id="item-desc"
        label="Description"
        maxLength={DESC_MAX}
        placeholder="Fabric, work, special features…"
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
        count={{ value: form.description.length, max: DESC_MAX }}
      />
      <div className="flex items-end gap-2">
        <SelectField
          id="item-type"
          label="Item type"
          fieldClassName="min-w-0 flex-1"
          disabled={loading}
          value={form.itemTypeId ?? ""}
          onChange={(e) => set("itemTypeId", e.target.value || null)}
        >
          <option value="">{loading ? "Loading types…" : "Choose a type"}</option>
          {itemTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </SelectField>
        <Button variant="secondary" icon={<Plus />} onClick={() => setAdding(true)} disabled={loading} aria-label="Add a new item type">
          New
        </Button>
      </div>
      <Field id="item-wear" label="Wear type" required group error={errors.wearType}>
        <ChipGroup
          labelledBy="item-wear-label"
          options={WEAR_OPTIONS}
          value={form.wearType}
          onChange={(v) => set("wearType", v as WearType)}
          invalid={!!errors.wearType}
        />
      </Field>

      <Dialog
        open={adding}
        title="New item type"
        onClose={closeAdd}
        busy={saving}
        footer={
          <>
            <Button variant="secondary" onClick={closeAdd} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveType} loading={saving}>
              Add type
            </Button>
          </>
        }
      >
        <p>It is added to Manage Lists and chosen for this item.</p>
        <TextField
          id="new-type"
          label="Name"
          maxLength={50}
          placeholder="e.g. Anarkali"
          value={typeName}
          error={typeError}
          onChange={(e) => {
            setTypeName(e.target.value);
            setTypeError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void saveType();
            }
          }}
        />
      </Dialog>
    </Section>
  );
}
