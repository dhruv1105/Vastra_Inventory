"use client";

import { useRef } from "react";
import { Camera, X, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageFile } from "@/types";
import { useToast } from "@/context/ToastContext";

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

interface Props {
  images: ImageFile[];
  onChange: (images: ImageFile[]) => void;
}

const reindex = (images: ImageFile[]) => images.map((img, i) => ({ ...img, displayOrder: i }));

export default function ImageUploader({ images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    const slots = MAX_IMAGES - images.length;
    if (files.length > slots) {
      showToast(`Only ${MAX_IMAGES} photos allowed — extra photos were skipped`, "error");
    }

    const added: ImageFile[] = [];
    for (const file of files.slice(0, slots)) {
      if (!ACCEPTED.includes(file.type)) {
        showToast(`${file.name}: only JPEG, PNG or WebP allowed`, "error");
        continue;
      }
      if (file.size > MAX_BYTES) {
        showToast(`${file.name} is larger than 5MB`, "error");
        continue;
      }
      try {
        const base64 = await readAsDataUrl(file);
        added.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          base64,
          mimeType: file.type,
          displayOrder: 0,
          altText: null,
        });
      } catch {
        showToast(`Could not read ${file.name}`, "error");
      }
    }
    if (added.length) onChange(reindex([...images, ...added]));
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (id: string) => {
    const target = images.find((i) => i.id === id);
    if (target) URL.revokeObjectURL(target.preview);
    onChange(reindex(images.filter((i) => i.id !== id)));
  };

  const move = (index: number, delta: -1 | 1) => {
    const next = [...images];
    const swap = index + delta;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    onChange(reindex(next));
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {images.length < MAX_IMAGES && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-brand-secondary/50 rounded-card text-brand-secondary hover:bg-brand-primary/5 transition-colors"
        >
          <Camera className="w-10 h-10" />
          <span className="font-medium">Add Photos</span>
          <span className="text-xs text-brand-text-muted">
            {images.length}/{MAX_IMAGES} · JPEG, PNG or WebP · up to 5MB each
          </span>
        </button>
      )}

      {images.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pt-3 pb-2">
          {images.map((img, i) => (
            <div key={img.id} className="relative flex-shrink-0 w-28 h-28 rounded-input overflow-hidden border border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-brand-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  COVER
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(img.id)}
                aria-label="Remove photo"
                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-1 inset-x-1 flex justify-between">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move left"
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === images.length - 1}
                  aria-label="Move right"
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-brand-text-muted mt-1">First photo will be used as cover image</p>
    </div>
  );
}
