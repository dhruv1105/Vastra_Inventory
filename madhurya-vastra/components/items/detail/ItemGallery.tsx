"use client";

import { useState } from "react";
import { BrandMark } from "@/components/ui/Brand";
import { cn } from "@/lib/cn";
import type { ImageDetail } from "@/types";

/** Item photos: the cover first and large; tap a thumbnail to show it. No photo → the brand mark. */
export default function ItemGallery({ images, title, className }: { images: ImageDetail[]; title: string; className?: string }) {
  const [shown, setShown] = useState(0);
  const current = images[Math.min(shown, images.length - 1)];

  if (!current) {
    return (
      <div className={cn("grid h-40 w-full place-items-center content-center gap-2 rounded-lg border border-line bg-tint text-muted lg:h-auto lg:aspect-portrait", className)}>
        <BrandMark className="w-24 opacity-40" />
        <span className="text-sm">No photo yet</span>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", className)}>
      {/* Uploaded files and dev samples are served as-is; next/image is not set up for them yet.
          Phones and tablets: a fixed height showing the whole garment, so stock is one scroll away. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.cdnUrl}
        alt={current.altText || title}
        className="h-80 w-full rounded-lg border border-line bg-tint object-contain lg:aspect-portrait lg:h-auto lg:object-cover"
      />
      {images.length > 1 && (
        <div role="group" aria-label="Photos" className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              aria-label={`Photo ${i + 1} of ${images.length}${i === 0 ? " (cover)" : ""}${img.altText ? `: ${img.altText}` : ""}`}
              aria-pressed={img === current}
              onClick={() => setShown(i)}
              className={cn(
                "aspect-portrait w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors duration-fast ease-brand",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft",
                img === current ? "border-primary" : "border-transparent opacity-80 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.cdnUrl} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
