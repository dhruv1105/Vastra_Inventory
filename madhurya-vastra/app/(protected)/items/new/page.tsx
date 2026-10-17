"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/context/ToastContext";
import { ItemFormData, LookupItem, VariantInput, WearType, ApiResponse } from "@/types";
import ImageUploader from "@/components/items/ImageUploader";
import ChipSelect from "@/components/items/ChipSelect";
import SearchableSelect from "@/components/items/SearchableSelect";
import VariantMatrix from "@/components/items/VariantMatrix";

const TITLE_MAX = 150;
const DESC_MAX = 500;

const WEAR_OPTIONS: { value: WearType; label: string }[] = [
  { value: "top", label: "Top Wear" },
  { value: "bottom", label: "Bottom Wear" },
  { value: "both", label: "Top + Bottom" },
];

const INITIAL: ItemFormData = {
  images: [],
  title: "",
  description: "",
  itemTypeId: null,
  wearType: null,
  occasionIds: [],
  tagIds: [],
  costPrice: "",
  sellingPrice: "",
  sizes: [],
  colorIds: [],
  quantities: {},
  priceOverrides: {},
  isOneOfAKind: false,
  status: "active",
};

type Errors = Partial<Record<"title" | "wearType" | "sellingPrice" | "variants", string>>;

const inputCls =
  "w-full px-3 py-2.5 border rounded-input text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";

const Section = ({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`bg-white rounded-card shadow-sm border border-gray-100 p-4 md:p-6 ${className}`}>
    <h2 className="text-lg font-semibold text-brand-primary mb-4">{title}</h2>
    <div className="space-y-5">{children}</div>
  </section>
);

const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="flex items-center gap-1 text-sm font-medium text-brand-text-primary mb-1.5">
    {children}
  </label>
);

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-sm text-red-600 mt-1">{msg}</p> : null;

export default function NewItemPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState<ItemFormData>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [itemTypes, setItemTypes] = useState<LookupItem[]>([]);
  const [colors, setColors] = useState<LookupItem[]>([]);
  const [occasions, setOccasions] = useState<LookupItem[]>([]);
  const [tags, setTags] = useState<LookupItem[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState<"active" | "draft" | null>(null);
  const [progress, setProgress] = useState("");

  const [typeModal, setTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [typeSaving, setTypeSaving] = useState(false);

  const imagesRef = useRef(form.images);
  imagesRef.current = form.images;
  useEffect(
    () => () => imagesRef.current.forEach((i) => URL.revokeObjectURL(i.preview)),
    []
  );

  const ERROR_FOR: Partial<Record<keyof ItemFormData, keyof Errors>> = {
    title: "title",
    wearType: "wearType",
    sellingPrice: "sellingPrice",
    sizes: "variants",
    colorIds: "variants",
    isOneOfAKind: "variants",
  };

  const set = <K extends keyof ItemFormData>(key: K, value: ItemFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    const errKey = ERROR_FOR[key];
    if (errKey) setErrors((e) => (e[errKey] ? { ...e, [errKey]: undefined } : e));
  };

  // Lookups: fetched once on mount.
  useEffect(() => {
    const load = async () => {
      try {
        const [t, c, o, g] = await Promise.all(
          ["item-types", "colors", "occasions", "tags"].map((n) =>
            fetch(`/api/lookups/${n}`).then((r) => r.json() as Promise<ApiResponse<LookupItem[]>>)
          )
        );
        setItemTypes(t.data ?? []);
        setColors(c.data ?? []);
        setOccasions(o.data ?? []);
        setTags(g.data ?? []);
      } catch {
        showToast("Failed to load options", "error");
      } finally {
        setLookupsLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveNewType = async () => {
    const name = newTypeName.trim();
    if (!name) return;
    setTypeSaving(true);
    try {
      const res = await fetch("/api/lookups/item-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, userId: user?.id }),
      });
      const json: ApiResponse<LookupItem> = await res.json();
      if (!res.ok || !json.data) throw new Error(json.error || "Failed to add type");
      const list: ApiResponse<LookupItem[]> = await fetch("/api/lookups/item-types").then((r) => r.json());
      setItemTypes(list.data ?? []);
      set("itemTypeId", json.data.id);
      setTypeModal(false);
      setNewTypeName("");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to add type", "error");
    } finally {
      setTypeSaving(false);
    }
  };

  const margin = (() => {
    const cost = parseFloat(form.costPrice);
    const sell = parseFloat(form.sellingPrice);
    if (!(sell > 0) || !(cost > 0)) return null;
    const diff = sell - cost;
    return { diff, pct: (diff / sell) * 100 };
  })();

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.wearType) e.wearType = "Select a wear type";
    const sell = parseFloat(form.sellingPrice);
    if (!(sell > 0)) e.sellingPrice = "Selling price must be greater than 0";
    if (!form.isOneOfAKind && (form.sizes.length > 0) !== (form.colorIds.length > 0)) {
      e.variants = "Add at least one size and one color — or clear them, or mark the item one-of-a-kind";
    }
    return e;
  };

  const buildVariants = (): VariantInput[] => {
    if (form.isOneOfAKind) {
      return [{ size: "One Size", colorId: null, quantity: 1, sellingPriceOverride: null, costPriceOverride: null }];
    }
    const out: VariantInput[] = [];
    for (const size of form.sizes) {
      for (const colorId of form.colorIds) {
        const raw = form.priceOverrides[size]?.[colorId];
        const override = raw !== undefined && raw !== "" ? parseFloat(raw) : NaN;
        out.push({
          size,
          colorId,
          quantity: form.quantities[size]?.[colorId] ?? 0,
          sellingPriceOverride: Number.isFinite(override) && override > 0 ? override : null,
          costPriceOverride: null,
        });
      }
    }
    return out;
  };

  const submit = async (status: "active" | "draft") => {
    if (submitting) return;
    const found = validate();
    setErrors(found);
    const firstKey = (["title", "wearType", "sellingPrice", "variants"] as const).find((k) => found[k]);
    if (firstKey) {
      document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!user) {
      showToast("You must be signed in", "error");
      return;
    }
    if (form.images.length === 0 && !window.confirm("No images added. Continue anyway?")) return;

    setSubmitting(true);
    setSubmittingStatus(status);
    setProgress(form.images.length ? "Saving item & uploading images..." : "Saving item...");
    try {
      const cost = parseFloat(form.costPrice);
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          itemTypeId: form.itemTypeId,
          wearType: form.wearType,
          costPrice: cost > 0 ? cost : null,
          sellingPrice: parseFloat(form.sellingPrice),
          occasionIds: form.occasionIds,
          tagIds: form.tagIds,
          variants: buildVariants(),
          images: form.images.map((i, idx) => ({
            base64: i.base64,
            mimeType: i.mimeType,
            displayOrder: idx,
            altText: i.altText,
          })),
          status,
          userId: user.id,
        }),
      });
      const json: ApiResponse<{ id: string }> = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to save item");
      setProgress("Done!");
      showToast(status === "draft" ? "Draft saved" : "Item added to inventory", "success");
      router.push("/inventory");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save item", "error");
      setProgress("");
      setSubmitting(false);
      setSubmittingStatus(null);
    }
  };

  const errBorder = (msg?: string) => (msg ? "border-red-500" : "border-gray-300");

  return (
    <div className="p-4 md:p-6 pb-32 mx-auto max-w-3xl lg:max-w-5xl xl:max-w-6xl">
      <h1 className="text-2xl md:text-3xl font-bold text-brand-primary mb-4">Add Item</h1>

      {/* 1 column on phones/tablets, photos|details split on laptops (xl), pairs lower sections from lg */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <Section title="Photos" className="xl:col-span-5">
          <ImageUploader images={form.images} onChange={(images) => set("images", images)} />
        </Section>

        <Section title="Basic Details" className="xl:col-span-7">
          <div id="field-title">
            <Label htmlFor="title">Title *</Label>
            <input
              id="title"
              value={form.title}
              maxLength={TITLE_MAX}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Lavender Georgette Saree"
              className={`${inputCls} ${errBorder(errors.title)}`}
            />
            <div className="flex justify-between">
              <FieldError msg={errors.title} />
              <span className="text-xs text-brand-text-muted ml-auto mt-1">
                {form.title.length}/{TITLE_MAX}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={4}
              value={form.description}
              maxLength={DESC_MAX}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the fabric, work, special features..."
              className={`${inputCls} border-gray-300`}
            />
            <span className="block text-right text-xs text-brand-text-muted mt-1">
              {form.description.length}/{DESC_MAX}
            </span>
          </div>

          <div>
            <Label>Item Type</Label>
            <SearchableSelect
              options={itemTypes}
              value={form.itemTypeId}
              onChange={(id) => set("itemTypeId", id)}
              placeholder={lookupsLoading ? "Loading…" : "Select item type"}
              addLabel="+ Add New Type"
              onAdd={() => setTypeModal(true)}
            />
          </div>

          <div id="field-wearType">
            <Label>Wear Type *</Label>
            <div className="flex flex-wrap gap-2">
              {WEAR_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={form.wearType === o.value}
                  onClick={() => set("wearType", o.value)}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                    form.wearType === o.value
                      ? "bg-brand-primary border-brand-primary text-white"
                      : "bg-white border-gray-300 text-gray-600 hover:border-brand-secondary"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <FieldError msg={errors.wearType} />
          </div>
        </Section>

        <div className="xl:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Section title="Classification">
          <div>
            <Label>Occasions</Label>
            <ChipSelect options={occasions} selected={form.occasionIds} onChange={(ids) => set("occasionIds", ids)} />
          </div>
          <div>
            <Label>Tags</Label>
            <ChipSelect options={tags} selected={form.tagIds} onChange={(ids) => set("tagIds", ids)} />
          </div>
        </Section>

        <Section title="Pricing">
          <div>
            <Label htmlFor="costPrice">
              Cost Price (₹) <Lock className="w-3.5 h-3.5 text-brand-accent" />
              <span className="text-xs font-normal text-brand-text-muted">(private — not shared)</span>
            </Label>
            <input
              id="costPrice"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={form.costPrice}
              onChange={(e) => set("costPrice", e.target.value)}
              className={`${inputCls} border-gray-300`}
            />
          </div>
          <div id="field-sellingPrice">
            <Label htmlFor="sellingPrice">Selling Price (₹) *</Label>
            <input
              id="sellingPrice"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={form.sellingPrice}
              onChange={(e) => set("sellingPrice", e.target.value)}
              className={`${inputCls} ${errBorder(errors.sellingPrice)}`}
            />
            <FieldError msg={errors.sellingPrice} />
          </div>
          {margin && (
            <p className={`text-sm font-medium ${margin.diff >= 0 ? "text-green-600" : "text-red-600"}`}>
              Margin: ₹{margin.diff.toFixed(2)} ({margin.pct.toFixed(1)}%)
            </p>
          )}
        </Section>
        </div>

        <section className="xl:col-span-12 bg-white rounded-card shadow-sm border border-gray-100 p-4 md:p-6">
          <VariantMatrix
            sizes={form.sizes}
            colorIds={form.colorIds}
            colors={colors}
            quantities={form.quantities}
            priceOverrides={form.priceOverrides}
            sellingPrice={form.sellingPrice}
            isOneOfAKind={form.isOneOfAKind}
            error={errors.variants}
            onSizes={(v) => set("sizes", v)}
            onColorIds={(v) => set("colorIds", v)}
            onQuantities={(v) => set("quantities", v)}
            onPriceOverrides={(v) => set("priceOverrides", v)}
            onOneOfAKind={(v) => set("isOneOfAKind", v)}
          />
        </section>
      </div>

      {/* Sticky action bar — sits above the mobile BottomNav (h-16), right of the md sidebar (w-64). */}
      <div className="fixed left-0 right-0 md:left-20 lg:left-64 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] md:bottom-0 z-40 bg-white border-t border-gray-200 px-4 py-3 [@media(max-height:500px)]:py-1.5">
        {progress && (
          <p className="text-center text-xs text-brand-text-muted mb-2 [@media(max-height:500px)]:mb-1">{progress}</p>
        )}
        <div className="flex gap-3 md:justify-end mx-auto max-w-3xl lg:max-w-5xl xl:max-w-6xl">
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit("draft")}
            className="flex-1 md:flex-none md:min-w-[12rem] flex items-center justify-center gap-2 py-3 [@media(max-height:500px)]:py-2 rounded-input border border-brand-primary text-brand-primary font-medium disabled:opacity-50"
          >
            {submittingStatus === "draft" && <Loader2 className="w-4 h-4 animate-spin" />}
            Save as Draft
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit("active")}
            className="flex-1 md:flex-none md:min-w-[12rem] flex items-center justify-center gap-2 py-3 [@media(max-height:500px)]:py-2 rounded-input bg-brand-primary text-white font-medium disabled:opacity-50"
          >
            {submittingStatus === "active" && <Loader2 className="w-4 h-4 animate-spin" />}
            Add to Inventory
          </button>
        </div>
      </div>

      {typeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-card p-5 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-brand-primary mb-3">Add New Type</h3>
            <input
              autoFocus
              value={newTypeName}
              maxLength={50}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveNewType()}
              placeholder="Type name"
              className={`${inputCls} border-gray-300`}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setTypeModal(false);
                  setNewTypeName("");
                }}
                className="px-4 py-2 text-sm rounded-input border border-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveNewType}
                disabled={typeSaving || !newTypeName.trim()}
                className="px-4 py-2 text-sm rounded-input bg-brand-primary text-white disabled:opacity-50"
              >
                {typeSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
