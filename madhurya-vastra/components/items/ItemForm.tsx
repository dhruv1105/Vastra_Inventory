"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, Check, ExternalLink, RotateCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/context/ToastContext";
import PageHeader from "@/components/ui/PageHeader";
import Button, { LinkButton } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PhotosSection from "@/components/items/PhotosSection";
import DetailsSection from "@/components/items/DetailsSection";
import ClassifySection from "@/components/items/ClassifySection";
import PriceSection from "@/components/items/PriceSection";
import VariantsSection from "@/components/items/VariantsSection";
import SectionNav, { jumpTo } from "@/components/items/SectionNav";
import {
  ERROR_FOR,
  ERROR_TARGET,
  INITIAL_FORM,
  buildEditPayload,
  buildPayload,
  formFromItem,
  sectionDone,
  validate,
  variantKey,
  type EditBase,
  type Errors,
  type FieldKey,
  type SectionKey,
} from "@/components/items/form";
import { byName } from "@/components/lookups/lists";
import { ApiError, apiFetch, onBeforeLoginRedirect } from "@/lib/api-client";
import { ONE_SIZE } from "@/lib/inventory";
import { saveDraft, takeDraft } from "@/lib/form-draft";
import type { ImageFile, Item, ItemFormData, ItemSellerView, LookupItem } from "@/types";

type Lookups = { itemTypes: LookupItem[]; colors: LookupItem[]; occasions: LookupItem[]; tags: LookupItem[] };

/**
 * What is kept if the session ends mid-form: everything, new photos as Files (previews are rebuilt;
 * saved photos keep their URL). Edit also keeps what the form started from, version included, so a
 * save after signing in is still checked against the version the person was editing.
 */
type KeptForm = Omit<ItemFormData, "images"> & { images: (Omit<ImageFile, "preview"> & { preview?: string })[]; base?: EditBase };
/** Comparable form content (photos by id): to tell whether anything was typed. */
const snapshot = (f: ItemFormData) => JSON.stringify({ ...f, images: f.images.map((i) => [i.id, i.altText]) });

type Props =
  | { mode: "create" }
  | {
      mode: "edit";
      /** The item as loaded (GET /api/items/[id]); its version is what the save is checked against. */
      item: Item | ItemSellerView;
      /** Load the item again (after someone else's change), dropping this form. */
      onReload: () => void;
    };

/**
 * The item form: photos, details, lists, price and variants, with the error summary and the sticky
 * save bar. Owns the form state, the lookup lists and the save; pages only choose the mode.
 */
export default function ItemForm(props: Props) {
  const { mode } = props;
  const editing = props.mode === "edit" ? props.item : null;
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Edit starts from the loaded item; the page remounts the form (key) when it loads a newer version.
  const [start] = useState(() => (editing ? formFromItem(editing) : { form: INITIAL_FORM, base: null }));
  const [form, setForm] = useState<ItemFormData>(start.form);
  const [base, setBase] = useState<EditBase | null>(start.base);
  /** Someone else saved this item since the form loaded (409): the warning box shows. */
  const [conflict, setConflict] = useState(false);
  const [askReload, setAskReload] = useState(false);
  const conflictRef = useRef<HTMLDivElement>(null);
  const draftKey = editing ? `item-form:${editing.id}` : "item-form:new";
  const [errors, setErrors] = useState<Errors>({});
  const [lookups, setLookups] = useState<Lookups>({ itemTypes: [], colors: [], occasions: [], tags: [] });
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [saving, setSaving] = useState<"active" | "draft" | null>(null);
  const [askNoPhotos, setAskNoPhotos] = useState<"active" | "draft" | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Revoke photo previews when leaving the page.
  const imagesRef = useRef(form.images);
  imagesRef.current = form.images;
  useEffect(() => () => imagesRef.current.forEach((i) => i.file && URL.revokeObjectURL(i.preview)), []);

  // If the session ends (a 401 on save or on adding a type), keep the input for after sign-in…
  const formRef = useRef(form);
  formRef.current = form;
  const baseRef = useRef(base);
  baseRef.current = base;
  useEffect(() => {
    if (!user) return;
    return onBeforeLoginRedirect(() => {
      const f = formRef.current;
      if (snapshot(f) === snapshot(start.form)) return; // nothing typed
      const kept: KeptForm = {
        ...f,
        images: f.images.map(({ preview, ...rest }) => (rest.file ? rest : { ...rest, preview })),
        base: baseRef.current ?? undefined,
      };
      return saveDraft(draftKey, user.id, kept);
    });
  }, [user, draftKey, start.form]);

  // …and bring it back here, for the same person only.
  const restored = useRef(false);
  useEffect(() => {
    if (!user || restored.current) return;
    restored.current = true;
    void takeDraft<KeptForm>(draftKey, user.id).then((kept) => {
      if (!kept) return;
      const { base: keptBase, ...keptForm } = kept;
      setForm({ ...INITIAL_FORM, ...keptForm, images: kept.images.map((i) => ({ ...i, preview: i.file ? URL.createObjectURL(i.file) : i.preview ?? "" })) });
      if (keptBase) setBase(keptBase);
      showToast("Your sign-in had ended. Everything you typed is still here — check it and save again.", "info", { durationMs: 6000 });
    });
    // showToast is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  /** Edit: turning one of a kind off makes the piece "One Size × colour", same row and stock. */
  const turnOffOneOfAKind = (colorId: string) => {
    if (!base) return;
    const piece = base.existing[variantKey(ONE_SIZE, null)];
    const existing = { ...base.existing };
    if (piece) {
      delete existing[variantKey(ONE_SIZE, null)];
      existing[variantKey(ONE_SIZE, colorId)] = piece;
    }
    setBase({ ...base, existing, pieceColorId: colorId });
    const cost = piece?.costPriceOverride;
    setForm((f) => ({
      ...f,
      isOneOfAKind: false,
      sizes: [ONE_SIZE],
      colorIds: [colorId],
      quantities: { [ONE_SIZE]: { [colorId]: piece?.quantity ?? 0 } },
      priceOverrides: {},
      costOverrides: (cost != null ? { [ONE_SIZE]: { [colorId]: String(cost) } } : {}) as ItemFormData["costOverrides"],
    }));
  };

  const saveEdit = async () => {
    if (!editing || !base) return;
    setSaving("active");
    try {
      await apiFetch(`/api/items/${editing.id}`, { method: "PATCH", body: JSON.stringify(buildEditPayload(form, base)) });
      showToast(`Saved your changes to “${form.title.trim()}”`, "success");
      router.push(`/items/${editing.id}`);
    } catch (e) {
      setSaving(null);
      if (e instanceof ApiError && e.status === 409) {
        // Keep everything typed; say so at the top, where the choices are.
        setConflict(true);
        requestAnimationFrame(() => {
          conflictRef.current?.scrollIntoView({ block: "center" });
          conflictRef.current?.focus({ preventScroll: true });
        });
        return;
      }
      showToast(e instanceof Error ? e.message : "The changes were not saved. Try again.", "error");
    }
  };

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
    if (editing) return void saveEdit();
    if (form.images.length === 0) return setAskNoPhotos(status);
    void save(status);
  };

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 pt-5 md:px-7 md:pt-7">
      {mode === "create" && (
        <PageHeader eyebrow="New stock" title="Add Item" subtitle="Fill in what you know now. You can save a draft and finish later." />
      )}
      {editing && <PageHeader eyebrow="Edit item" title={editing.title} titleOnPhone back={{ href: `/items/${editing.id}`, label: "Back to item" }} />}

      {conflict && editing && (
        <div ref={conflictRef} tabIndex={-1} role="alert" className="flex gap-3 rounded-lg border border-zari bg-zari-tint p-4 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-zari">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-zari" />
          <div className="grid gap-2">
            <p className="font-semibold">Someone else changed this item — reload to see their changes.</p>
            <p className="text-sm">Your changes are still here but not saved. Look at their version, then reload and make your changes again.</p>
            <div className="flex flex-wrap gap-2">
              <LinkButton href={`/items/${editing.id}`} target="_blank" rel="noopener" variant="secondary" size="sm" icon={<ExternalLink />}>
                See their version
              </LinkButton>
              <Button size="sm" icon={<RotateCw />} onClick={() => setAskReload(true)}>
                Reload
              </Button>
            </div>
          </div>
        </div>
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
        <ClassifySection number={3} form={form} set={set} occasions={lookups.occasions} tags={lookups.tags} colors={lookups.colors} loading={lookupsLoading} />
        <PriceSection number={4} form={form} set={set} errors={errors} showCost={user?.role === "owner"} />
        <div className="lg:col-span-2">
          <VariantsSection
            number={5}
            form={form}
            set={set}
            colors={lookups.colors}
            errors={errors}
            showCost={user?.role === "owner"}
            edit={base ? { base, onTurnOffOneOfAKind: turnOffOneOfAKind } : undefined}
          />
        </div>
      </div>

      <div className="sticky bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] z-nav -mx-4 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:bottom-0 md:-mx-7 md:px-7">
        {editing ? (
          <div className="flex items-center gap-3">
            <p className="mr-auto hidden max-w-xs text-sm leading-snug text-muted sm:block">Nothing changes until you save.</p>
            <LinkButton href={`/items/${editing.id}`} variant="secondary" className="flex-1 sm:flex-none">
              Cancel
            </LinkButton>
            <Button icon={<Check />} onClick={() => submit("active")} loading={!!saving} disabled={!!saving} className="flex-1 sm:flex-none">
              Save changes
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <p className="mr-auto hidden max-w-xs text-sm leading-snug text-muted sm:block">A draft stays out of inventory until you add it.</p>
            <Button variant="secondary" onClick={() => submit("draft")} loading={saving === "draft"} disabled={!!saving} className="flex-1 sm:flex-none">
              Save as draft
            </Button>
            <Button icon={<Check />} onClick={() => submit("active")} loading={saving === "active"} disabled={!!saving} className="flex-1 sm:flex-none">
              Add to inventory
            </Button>
          </div>
        )}
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

      {props.mode === "edit" && (
        <ConfirmDialog
          open={askReload}
          title="Reload and lose your changes?"
          confirmLabel="Reload"
          cancelLabel="Keep my changes"
          onCancel={() => setAskReload(false)}
          onConfirm={() => {
            setAskReload(false);
            props.onReload();
          }}
        >
          The page shows the item as it is now. What you typed here is not saved and will be gone.
        </ConfirmDialog>
      )}
    </div>
  );
}
