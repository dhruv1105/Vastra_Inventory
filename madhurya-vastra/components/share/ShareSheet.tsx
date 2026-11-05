"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, MessageCircle, RotateCcw, Share2 } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/Chip";
import { SelectField, TextAreaField } from "@/components/ui/Input";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api-client";
import { buildCaption, DETAIL_FIELDS, isDetailKey, MAX_SHARE_PHOTOS, WHATSAPP_CAPTION_MAX, type CaptionItem, type DetailKey } from "@/lib/caption";
import { canShareFiles, canShareText, copyText, downloadFiles, fileStem, isShareCancel, toJpegFile, whatsappUrl } from "@/lib/share";
import { cn } from "@/lib/cn";
import type { CaptionTemplate, ImageDetail } from "@/types";

export type ShareItem = CaptionItem & { id: string; images: Pick<ImageDetail, "id" | "cdnUrl" | "altText">[] };

type Props = {
  open: boolean;
  onClose: () => void;
  /** The item to share; null for a text-only message from a caption template. */
  item: ShareItem | null;
  /** Start with this caption instead of the default (text-only share from the Captions tab). */
  templateId?: string;
};

const NONE = "";
type Photo = { id: string; url: string; alt: string };

/**
 * Share an item (photos + caption) or a caption on its own. Opens the phone's share menu where it
 * exists — photos as JPEG, caption with them and copied for Instagram — else copy / download /
 * WhatsApp. Each completed share is logged (template name and photo count only).
 */
export default function ShareSheet({ open, onClose, item, templateId }: Props) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<CaptionTemplate[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [captionId, setCaptionId] = useState(NONE);
  const [shopId, setShopId] = useState(NONE);
  const [details, setDetails] = useState<DetailKey[]>([]);
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [support, setSupport] = useState({ files: false, text: false });
  const logged = useRef(false);

  const photos: Photo[] = useMemo(
    () => (item?.images ?? []).map((im) => ({ id: im.id, url: im.cdnUrl, alt: im.altText ?? item?.title ?? "" })),
    [item],
  );

  // On open: what this browser can do, the templates, and the starting choices.
  useEffect(() => {
    if (!open) return;
    logged.current = false;
    setSupport({ files: canShareFiles(), text: canShareText() });
    setEdited(false);
    setPicked(photos.slice(0, MAX_SHARE_PHOTOS).map((p) => p.id));
    setLoadError(false);
    let live = true;
    apiFetch<CaptionTemplate[]>("/api/caption-templates")
      .then((list) => {
        if (!live) return;
        setTemplates(list);
        const pick = (kind: CaptionTemplate["kind"]) => list.find((t) => t.kind === kind && t.isDefault) ?? list.find((t) => t.kind === kind);
        const caption = (templateId && list.find((t) => t.id === templateId)) || pick("caption");
        setCaptionId(caption?.id ?? NONE);
        setDetails((caption?.defaultDetails ?? []).filter(isDetailKey));
        setShopId(pick("shop_details")?.id ?? NONE);
      })
      .catch(() => live && setLoadError(true));
    return () => {
      live = false;
    };
  }, [open, templateId, photos]);

  // Photos are turned into JPEG files ahead of time, so tapping Share opens the share menu at once
  // (phones only allow it straight after a tap).
  useEffect(() => {
    if (!open || !item || photos.length === 0) return;
    const ctl = new AbortController();
    setPreparing(true);
    setFiles({});
    const stem = fileStem(item.title);
    Promise.all(photos.map((p, i) => toJpegFile(p.url, `${stem}-${i + 1}.jpg`, ctl.signal).then((f) => [p.id, f] as const)))
      .then((pairs) => setFiles(Object.fromEntries(pairs)))
      .catch((e) => {
        if (!ctl.signal.aborted) showToast(e instanceof Error ? e.message : "The photos could not be prepared.", "error");
      })
      .finally(() => !ctl.signal.aborted && setPreparing(false));
    return () => ctl.abort();
  }, [open, item, photos, showToast]);

  const captions = templates?.filter((t) => t.kind === "caption") ?? [];
  const shops = templates?.filter((t) => t.kind === "shop_details") ?? [];
  const caption = captions.find((t) => t.id === captionId) ?? null;
  const shop = shops.find((t) => t.id === shopId) ?? null;

  const built = useMemo(
    () => buildCaption({ template: caption?.body ?? null, item, details, shop: shop?.body ?? null }),
    [caption, item, details, shop],
  );
  // The message follows the choices until staff type in it; then their text is kept.
  useEffect(() => {
    if (!edited) setText(built);
  }, [built, edited]);

  const chosenFiles = picked.map((id) => files[id]).filter((f): f is File => !!f);
  const photoCount = item ? picked.length : 0;
  const tooLong = photoCount > 0 && text.length > WHATSAPP_CAPTION_MAX;
  const ready = (templates !== null || loadError) && (!item || photos.length === 0 || !preparing);
  const useMenu = item && photoCount > 0 ? support.files : support.text;

  const log = async (photosSent: number) => {
    if (logged.current) return;
    logged.current = true;
    try {
      if (item) await apiFetch(`/api/items/${item.id}/share`, { method: "POST", body: JSON.stringify({ templateId: caption?.id ?? null, photos: photosSent }) });
      else if (caption) await apiFetch(`/api/caption-templates/${caption.id}/share`, { method: "POST" });
    } catch (e) {
      // The share already happened; a refusal here (e.g. the item just sold out) is told, not undone.
      logged.current = false;
      showToast(e instanceof Error ? e.message : "The share was not recorded.", "error");
    }
  };

  const share = async () => {
    if (!text.trim()) return showToast("Write a message first.", "error");
    setBusy(true);
    // Copy first: Instagram drops text handed to it, so staff paste the caption there.
    const copied = copyText(text);
    try {
      if (item && chosenFiles.length > 0) await navigator.share({ files: chosenFiles, text });
      else await navigator.share({ text });
      await log(chosenFiles.length);
      showToast((await copied) ? "Shared. The caption is copied too — paste it in Instagram." : "Shared.", "success");
      onClose();
    } catch (e) {
      if (!isShareCancel(e)) showToast("The share menu could not open. Use Copy caption and Download photos instead.", "error");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (await copyText(text)) {
      showToast("Caption copied. Paste it in WhatsApp or Instagram.", "success");
      void log(0);
    } else showToast("Could not copy. Select the text and copy it by hand.", "error");
  };

  const download = () => {
    downloadFiles(chosenFiles);
    showToast(`${chosenFiles.length} photo${chosenFiles.length === 1 ? "" : "s"} saved to Downloads.`, "success");
    void log(chosenFiles.length);
  };

  const openWhatsApp = () => {
    window.open(whatsappUrl(text), "_blank", "noopener");
    void log(0);
  };

  const togglePhoto = (id: string) =>
    setPicked((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length >= MAX_SHARE_PHOTOS) {
        showToast(`Up to ${MAX_SHARE_PHOTOS} photos at a time.`, "info");
        return p;
      }
      // Keep the gallery order (cover first).
      return photos.map((x) => x.id).filter((x) => x === id || p.includes(x));
    });

  const pickCaption = (id: string) => {
    setCaptionId(id);
    const t = captions.find((c) => c.id === id);
    setDetails((t?.defaultDetails ?? []).filter(isDetailKey));
  };

  const footer = useMenu ? (
    <>
      <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
      <Button icon={<Share2 />} onClick={() => void share()} loading={busy} disabled={!ready}>
        {item && photos.length > 0 && preparing ? "Preparing photos…" : "Share"}
      </Button>
    </>
  ) : (
    <>
      <Button variant="secondary" onClick={onClose}>Close</Button>
      {item && photoCount > 0 && (
        <Button variant="secondary" icon={<Download />} onClick={download} disabled={!ready || chosenFiles.length === 0}>
          {preparing ? "Preparing photos…" : "Download photos"}
        </Button>
      )}
      <Button variant="secondary" icon={<Copy />} onClick={() => void copy()} disabled={!ready}>Copy caption</Button>
      <Button icon={<MessageCircle />} onClick={openWhatsApp} disabled={!ready || !text.trim()}>Open WhatsApp</Button>
    </>
  );

  return (
    <Dialog open={open} onClose={onClose} busy={busy} size="md" title={item ? `Share “${item.title}”` : `Share “${caption?.name ?? "message"}”`} footer={footer}>
      {loadError ? (
        <p className="text-fg">The captions didn’t load. You can still write the message below.</p>
      ) : templates === null ? (
        <SkeletonRows rows={3} label="Loading captions" />
      ) : null}

      {templates !== null && (
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField id="share-caption" label="Caption" value={captionId} onChange={(e) => pickCaption(e.target.value)}>
            {captions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}{t.isDefault ? " (default)" : ""}</option>
            ))}
            <option value={NONE}>{item ? "None — item name only" : "None"}</option>
          </SelectField>
          <SelectField id="share-shop" label="Shop details" value={shopId} onChange={(e) => setShopId(e.target.value)}>
            {shops.map((t) => (
              <option key={t.id} value={t.id}>{t.name}{t.isDefault ? " (default)" : ""}</option>
            ))}
            <option value={NONE}>None</option>
          </SelectField>
        </div>
      )}

      {item && (
        <div className="grid gap-2">
          <span id="share-details" className="text-sm font-semibold text-fg">Add to the message</span>
          <ChipGroup
            multiple
            labelledBy="share-details"
            options={DETAIL_FIELDS.map((f) => ({ value: f.key, label: f.label }))}
            value={details}
            onChange={(v) => setDetails(v.filter(isDetailKey))}
          />
        </div>
      )}

      {item && photos.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold text-fg">
            Photos <span className="font-normal text-muted">· {picked.length} of {photos.length} chosen</span>
          </legend>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {photos.map((p, i) => {
              const on = picked.includes(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={`Photo ${i + 1}${i === 0 ? " (cover)" : ""}`}
                    onClick={() => togglePhoto(p.id)}
                    className={cn(
                      "relative block aspect-portrait w-full overflow-hidden rounded-md border-2 transition-opacity duration-fast ease-brand",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft",
                      on ? "border-primary" : "border-line opacity-50",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- local uploads, as in ItemGallery */}
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    {on && (
                      <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-on">
                        <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <TextAreaField
        id="share-text"
        label="Message"
        rows={8}
        value={text}
        count={photoCount > 0 ? { value: text.length, max: WHATSAPP_CAPTION_MAX } : undefined}
        error={tooLong ? `WhatsApp shows only the first ${WHATSAPP_CAPTION_MAX.toLocaleString("en-IN")} characters under photos. Shorten it, or untick some details.` : null}
        help={
          edited
            ? "You changed the text, so the choices above no longer change it."
            : useMenu
              ? item && photoCount > 0
                ? "Pick WhatsApp or Instagram in the share menu. The caption is copied too, for Instagram."
                : "Pick WhatsApp, Instagram or another app in the share menu."
              : item && photoCount > 0
                ? "This browser has no share menu: copy the caption, download the photos, or open WhatsApp."
                : "This browser has no share menu: copy the caption or open WhatsApp."
        }
        onChange={(e) => {
          setText(e.target.value);
          setEdited(true);
        }}
      />
      {edited && (
        <div>
          <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={() => setEdited(false)}>Start again from the caption</Button>
        </div>
      )}
    </Dialog>
  );
}
