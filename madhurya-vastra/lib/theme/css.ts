import { fontStacks } from "./font-stacks";
import type { ColorTokens, ThemeConfig } from "./types";

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

/** "#6D37C0" → "109 55 192", so Tailwind can add opacity: rgb(var(--mv-primary) / 0.3). */
export function hexToChannels(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function colorVars(colors: ColorTokens): string {
  return Object.entries(colors)
    .map(([k, v]) => `--mv-${kebab(k)}:${hexToChannels(v)};`)
    .join("");
}

/**
 * SECURITY: the output is injected as a <style> tag. Today the config is a constant in code.
 * When themes become admin-editable, validate on the server before saving: colours must match
 * /^#[0-9a-f]{6}$/i, fonts must be FontKey values, radius must match /^\d{1,2}px$/, ease must be
 * one of a fixed list — never pass free text into this function.
 *
 * The theme as CSS. Light is the default; dark applies when <html data-theme="dark">.
 * Following the OS dark setting is switched on once every screen uses tokens (redesign R6),
 * so half-converted screens never show light-only colours on a dark page.
 */
export function themeToCss(theme: ThemeConfig): string {
  const { fonts, radius, motion } = theme;
  const shared =
    `--mv-font-brand:${fontStacks[fonts.brand]};` +
    `--mv-font-display:${fontStacks[fonts.display]};` +
    `--mv-font-accent:${fontStacks[fonts.accent]};` +
    `--mv-font-ui:${fontStacks[fonts.ui]};` +
    `--mv-radius-sm:${radius.sm};--mv-radius-md:${radius.md};--mv-radius-lg:${radius.lg};` +
    `--mv-dur-fast:${motion.fastMs}ms;--mv-dur-base:${motion.baseMs}ms;--mv-dur-slow:${motion.slowMs}ms;` +
    `--mv-ease:${motion.ease};`;
  return (
    `:root{${shared}${colorVars(theme.colors.light)}color-scheme:light}` +
    `:root[data-theme="dark"]{${colorVars(theme.colors.dark)}color-scheme:dark}`
  );
}
