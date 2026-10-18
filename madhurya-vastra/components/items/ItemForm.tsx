"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/context/ToastContext";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PhotosSection from "@/components/items/PhotosSection";
import DetailsSection from "@/components/items/DetailsSection";
import ClassifySection from "@/components/items/ClassifySection";
import PriceSection from "@/components/items/PriceSection";
import VariantsSection from "@/components/items/VariantsSection";
import SectionNav, { jumpTo } from "@/components/items/SectionNav";
import { ERROR_FOR, ERROR_TARGET, INITIAL_FORM, buildPayload, sectionDone, validate, type Errors, type FieldKey, type SectionKey } from "@/components/items/form";
import { byName } from "@/components/lookups/lists";
import { apiFetch } from "@/lib/api-client";
import type { ItemFormData, LookupItem } from "@/types";

type Lookups = { itemTypes: LookupItem[]; colors: LookupItem[]; occasions: LookupItem[]; tags: LookupItem[] };

type Props = {
  /** "create" is Add Item (/items/new). Edit mode (/items/[id]/edit) is added with the edit page. */
  mode: "create";
};

/**
 * The item form: photos, details, lists, price and variants, with the error summary and the sticky
 * save bar. Owns the form state, the lookup lists and the save; pages only choose the mode.
 */
export default function ItemForm({ mode }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState<ItemFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [lookups, setLookups] = useState<Lookups>({ itemTypes: [], colors: [], occasions: [], tags: [] });
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [saving, setSaving] = useState<"active" | "draft" | null>(null);
  const [askNoPhotos, setAskNoPhotos] = useState<"active" | "draft" | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Revoke photo previews when leaving the page.
  const imagesRef = useRef(form.images);
  imagesRef.current = form.images;
  useEffect(() => () => imagesRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);

  const set = <K extends keyof ItemFormData>(key: K, value: ItemFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    const errKey = ERROR_FOR[key];
    if (errKey) setErrors((e) => (e[errKey] ? { ...e, [errKey]: undefined } : e));
  };

  useEffect(() => {
    Promise.all(["item-types", "colors", "occasions", "tags"].map((n) => apiFetch<LookupItem[]>(`/api/lookups/${n}`)))
      .then(([itemTypes, colors, occasions, tags]) => setLookups({ itemTypes, colors, occasions, tags }))
      .catch(() => showToast("The lists didn’t load. Check that the app is running, then reload the page.", "error"))
      .finally(() => setLookupsLoading(false));
    // showToast is stable; load once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addType = async (name: string) => {
    const created = await apiFetch<LookupItem>("/api/lookups/item-types", { method: "POST", body: JSON.stringify({ name }) });
    setLookups((l) => ({ ...l, itemTypes: [...l.itemTypes, created].sort(byName) }));
    showToast(`Added “${created.name}” to item types`, "success");
    return created;
  };

  const done = useMemo(() => sectionDone(form), [form]);
  const errorKeys = (Object.keys(errors) as FieldKey[]).filter((k) => errors[k]);
  const problems = useMemo(() => new Set<SectionKey>(errorKeys.map((k) => ERROR_TARGET[k].section)), [errorKeys]);

  const save = async (status: "active" | "draft") => {
    if (!user) return showToast("Sign in again to save this item.", "error");
    setSaving(status);
    try {
      await apiFetch<{ id: string }>("/api/items", { method: "POST", body: JSON.stringify(buildPayload(form, status)) });
      showToast(status === "draft" ? `Saved “${form.title.trim()}” as a draft` : `Added “${form.title.trim()}” to inventory`, "success");
      router.push("/inventory");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "The item was not saved. Try again.", "error");
      setSaving(null);
    }
  };

  const submit = (status: "active" | "draft") => {
    if (saving) return;
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      // Show the summary at the top and move focus to it.
      requestAnimationFrame(() => {
        summaryRef.current?.scrollIntoView({ block: "center" });
        summaryRef.current?.focus({ preventScroll: true });
      });
      return;
    }
    if (form.images.length === 0) return setAskNoPhotos(status);
    void save(status);
  };

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 pt-5 md:px-7 md:pt-7">
      {mode === "create" && (
        <PageHeader eyebrow="New stock" title="Add Item" subtitle="Fill in what you know now. You can save a draft and finish later." />
      )}

      <SectionNav done={done} problems={problems} />

      {errorKeys.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="flex gap-3 rounded-lg border border-danger bg-danger-tint p-4 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-danger">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="grid gap-1.5">
            <p className="font-semibold">
              {errorKeys.length === 1 ? "1 thing needs fixing" : `${errorKeys.length} things need fixing`} before this item can be saved
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {errorKeys.map((k) => (
                <li key={k}>
                  <a
                    href={`#${ERROR_TARGET[k].elementId}`}
                    onClick={(e) => {
                      e.preventDefault();
                      jumpTo(ERROR_TARGET[k].elementId);
                    }}
                    className="font-semibold text-danger underline underline-offset-2"
                  >
                    {ERROR_TARGET[k].label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mv-stagger grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <PhotosSection number={1} images={form.images} onChange={(images) => set("images", images)} />
        <DetailsSection number={2} form={form} set={set} errors={errors} itemTypes={lookups.itemTypes} loading={lookupsLoading} onAddType={addType} />
        <ClassifySection number={3} form={form} set={set} occasions={lookups.occasions} tags={lookups.tags} loading={lookupsLoading} />
        <PriceSection number={4} form={form} set={set} errors={errors} showCost={user?.role === "owner"} />
        <div className="lg:col-span-2">
          <VariantsSection number={5} form={form} set={set} colors={lookups.colors} errors={errors} />
        </div>
      </div>

      <div className="sticky bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] z-nav -mx-4 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:bottom-0 md:-mx-7 md:px-7">
        <div className="flex items-center gap-3">
          <p className="mr-auto hidden max-w-xs text-sm leading-snug text-muted sm:block">A draft stays out of inventory until you add it.</p>
          <Button variant="secondary" onClick={() => submit("draft")} loading={saving === "draft"} disabled={!!saving} className="flex-1 sm:flex-none">
            Save as draft
          </Button>
          <Button icon={<Check />} onClick={() => submit("active")} loading={saving === "active"} disabled={!!saving} className="flex-1 sm:flex-none">
            Add to inventory
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!askNoPhotos}
        tone="primary"
        title="Save without photos?"
        confirmLabel={askNoPhotos === "draft" ? "Save draft without photos" : "Add without photos"}
        cancelLabel="Add photos first"
        onCancel={() => {
          setAskNoPhotos(null);
          jumpTo("photos");
        }}
        onConfirm={async () => {
          const status = askNoPhotos!;
          setAskNoPhotos(null);
          await save(status);
        }}
      >
        Customers and staff find items faster with a photo. You can add photos later.
      </ConfirmDialog>
    </div>
  );
}
