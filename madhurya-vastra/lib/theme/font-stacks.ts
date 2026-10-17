import type { FontKey } from "./types";

/** CSS value for each font key, with a fallback stack. The --font-* variables come from fonts.ts. */
export const fontStacks: Record<FontKey, string> = {
  cormorant: 'var(--font-cormorant), Georgia, "Times New Roman", serif',
  marcellus: "var(--font-marcellus), Georgia, serif",
  eczar: "var(--font-eczar), Georgia, serif",
  mukta: 'var(--font-mukta), "Segoe UI", system-ui, sans-serif',
};
