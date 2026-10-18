"use client";

import { useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Star, Trash2, X } from "lucide-react";
import Section from "@/components/ui/Section";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import type { ImageFile } from "@/types";

export const MAX_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const reindex = (images: ImageFile[]) => images.map((img, i) => ({ ...img, displayOrder: i }));

type Props = { images: ImageFile[]; onChange: (images: ImageFile[]) => void; number: number };

/** Photos: pick up to 8, first is the cover, tap a photo to preview, describe it or make it the cover. */
export default function PhotosSection({ images, onChange, number }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = images.find((i) => i.id === openId) ?? null;
  const openIndex = open ? images.indexOf(open) : -1;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    const slots = MAX_IMAGES - images.length;
    if (files.length > slots) showToast(`Only ${MAX_IMAGES} photos fit — the extra ${files.length - slots} were skipped.`, "error");
    const added: ImageFile[] = [];
    for (const file of files.slice(0, slots)) {
      if (!ACCEPTED.includes(file.type)) {
        showToast(`${file.name} is not a JPEG, PNG or WebP photo.`, "error");
        continue;
      }
      if (file.size > MAX_BYTES) {
        showToast(`${file.name} is larger than 5 MB.`, "error");
        continue;
      }
      try {
        const base64 = await readAsDataUrl(file);
        added.push({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), base64, mimeType: file.type, displayOrder: 0, altText: null });
      } catch {
        showToast(`Could not read ${file.name}.`, "error");
      }
    }
    if (added.length) onChange(reindex([...images, ...added]));
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (id: string) => {
    const target = images.find((i) => i.id === id);
    if (target) URL.revokeObjectURL(target.preview);
    onChange(reindex(images.filter((i) => i.id !== id)));
    setOpenId(null);
  };

  const move = (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(index, 1);
    next.splice(to, 0, moved);
    onChange(reindex(next));
  };

  const setAlt = (id: string, altText: string) => onChange(images.map((i) => (i.id === id ? { ...i, altText: altText || null } : i)));

  const picker = (
    <input ref={inputRef} type="file" accept={ACCEPTED.join(",")} multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => handleFiles(e.target.files)} />
  );

  return (
    <Section id="photos" title="Photos" number={number} hint={`${images.length}/${MAX_IMAGES} · first photo is the cover`}>
      {picker}
      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="grid justify-items-center gap-1.5 rounded-lg border-2 border-dashed border-primary-soft bg-tint px-4 py-8 text-center text-primary transition-colors duration-fast hover:bg-tint-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft"
        >
          <Camera aria-hidden="true" className="h-8 w-8" />
          <span className="font-semibold">Add photos</span>
          <span className="text-sm text-muted">Up to {MAX_IMAGES} · JPEG, PNG or WebP · 5 MB each</span>
        </button>
      ) : (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.id} className="relative">
              <button
                type="button"
                onClick={() => setOpenId(img.id)}
                aria-label={`Photo ${i + 1}${i === 0 ? " (cover)" : ""}${img.altText ? `: ${img.altText}` : ""}. Open to preview, describe or reorder.`}
                className="block aspect-[3/4] w-full overflow-hidden rounded-md border border-line bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft"
              >
                {/* Local blob preview; next/image cannot optimise object URLs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" className="h-full w-full object-cover" />
                {img.altText && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-fg/70 to-transparent px-1.5 pb-1 pt-4 text-left text-xs text-canvas">
                    {img.altText}
                  </span>
                )}
              </button>
              {i === 0 && (
                <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-zari px-2 text-xs font-bold uppercase tracking-wider text-surface">Cover</span>
              )}
              <button
                type="button"
                onClick={() => remove(img.id)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-fg/60 text-canvas hover:bg-fg/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </li>
          ))}
          {images.length < MAX_IMAGES && (
            <li>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="grid aspect-[3/4] w-full place-content-center justify-items-center gap-1 rounded-md border-2 border-dashed border-primary-soft bg-tint text-sm font-semibold text-primary hover:bg-tint-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft"
              >
                <Camera aria-hidden="true" className="h-6 w-6" />
                Add photo
              </button>
            </li>
          )}
        </ul>
      )}

      <Dialog
        open={!!open}
        title={open ? `Photo ${openIndex + 1} of ${images.length}${openIndex === 0 ? " · cover" : ""}` : ""}
        onClose={() => setOpenId(null)}
        size="md"
        footer={
          open && (
            <>
              <Button variant="danger-ghost" icon={<Trash2 />} onClick={() => remove(open.id)}>
                Remove
              </Button>
              {openIndex > 0 && (
                <Button variant="secondary" icon={<Star />} onClick={() => move(openIndex, -openIndex)}>
                  Make cover
                </Button>
              )}
              <Button onClick={() => setOpenId(null)}>Done</Button>
            </>
          )
        }
      >
        {open && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.preview} alt={open.altText ?? ""} className="mx-auto max-h-[50dvh] w-auto rounded-md object-contain" />
            <div className="flex items-center justify-between gap-2">
              <Button size="sm" variant="ghost" icon={<ChevronLeft />} disabled={openIndex === 0} onClick={() => move(openIndex, -1)}>
                Move earlier
              </Button>
              <Button size="sm" variant="ghost" iconRight={<ChevronRight />} disabled={openIndex === images.length - 1} onClick={() => move(openIndex, 1)}>
                Move later
              </Button>
            </div>
            <TextField
              id="photo-alt"
              label="Describe this photo"
              help="Shown to customers who can't see the photo, e.g. “Front drape with zari border”."
              maxLength={120}
              value={open.altText ?? ""}
              onChange={(e) => setAlt(open.id, e.target.value)}
            />
          </>
        )}
      </Dialog>
    </Section>
  );
}
