// Browser side of sharing (docs/plans/sharing.md): hand photos + caption to the phone's share menu
// (Web Share API), or fall back to copy / download / WhatsApp link where there is no share menu
// (laptops, and phones on a plain-http address — the share menu needs HTTPS or localhost).

/** Longest side of a shared photo; keeps files small enough to send quickly from the shop. */
const MAX_SIDE = 2048;
const JPEG_QUALITY = 0.9;

/** Whether this browser can hand files to the share menu. */
export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File([new Uint8Array(1)], "check.jpg", { type: "image/jpeg" })] });
  } catch {
    return false;
  }
}

/** Whether this browser has a share menu at all (text only is enough for a generic caption). */
export const canShareText = () => typeof navigator !== "undefined" && !!navigator.share;

/** "Lavender Georgette Saree" → "lavender-georgette-saree" (for file names). */
export function fileStem(title: string): string {
  const s = title.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s.slice(0, 60) || "madhurya-vastra";
}

/**
 * One photo as a JPEG file: WhatsApp shows WebP as a sticker and Instagram refuses it, so every
 * photo is redrawn on a canvas (white behind any transparency) and saved as JPEG.
 */
export async function toJpegFile(url: string, name: string, signal?: AbortSignal): Promise<File> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("A photo could not be loaded.");
  const bitmap = await createImageBitmap(await res.blob());
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't prepare photos.");
  ctx.fillStyle = "#FFFFFF"; // data, not styling: JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", JPEG_QUALITY));
  if (!blob) throw new Error("A photo could not be prepared.");
  return new File([blob], name, { type: "image/jpeg" });
}

/** Copies text; works on plain http too (falls back to a hidden textarea). Resolves false if it couldn't. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the old way
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

/** WhatsApp (app on phones, WhatsApp Web on laptops) with the text filled in; the person picks the chat. */
export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/** Saves files through the browser's downloads. */
export function downloadFiles(files: File[]): void {
  for (const f of files) {
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

export const isShareCancel = (err: unknown) => (err as Error | null)?.name === "AbortError";
