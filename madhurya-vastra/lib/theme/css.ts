import { fontStacks } from "./font-stacks";
import type { ColorTokens, FontKey, ThemeConfig } from "./types";

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RADIUS = /^\d{1,2}px$/;
/** Only these easing curves may be used, so a theme value can never carry other CSS. */
export const EASINGS = ["cubic-bezier(.2,.7,.2,1)", "ease-out", "ease-in-out", "linear"] as const;

/** "#6D37C0" → "109 55 192", so Tailwind can add opacity: rgb(var(--mv-primary) / 0.3). */
export function hexToChannels(hex: string): string {
  if (!HEX.test(hex)) throw new Error(`Theme colour "${hex}" is not a #RRGGBB hex value`);
  const h = hex.slice(1);
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function colorVars(colors: ColorTokens): string {
  return Object.entries(colors)
    .map(([k, v]) => `--mv-${kebab(k)}:${hexToChannels(v)};`)
    .join("");
}

function font(key: FontKey): string {
  if (!Object.prototype.hasOwnProperty.call(fontStacks, key)) throw new Error(`Theme font "${key}" is not loaded`);
  return fontStacks[key];
}

function radius(v: string): string {
  if (!RADIUS.test(v)) throw new Error(`Theme radius "${v}" must look like 10px`);
  return v;
}

function ms(v: number): string {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 2000) throw new Error(`Theme duration ${v} must be 0–2000 ms`);
  return `${n}ms`;
}

function ease(v: string): string {
  if (!(EASINGS as readonly string[]).includes(v)) throw new Error(`Theme easing "${v}" is not in the allowed list`);
  return v;
}

/**
 * The theme as CSS, injected as a <style> tag by app/layout.tsx. Every value is validated here
 * (hex colours, loaded fonts, px radii, integer ms, listed easings), so a theme loaded from the
 * database later cannot inject CSS or markup — an invalid theme throws instead of rendering.
 *
 * Light is the default; dark applies when <html data-theme="dark">. With followSystem the OS
 * dark setting applies too, unless <html data-theme="light"> was chosen explicitly.
 */
export function themeToCss(theme: ThemeConfig, { followSystem = false }: { followSystem?: boolean } = {}): string {
  const { fonts, motion } = theme;
  const shared =
    `--mv-font-brand:${font(fonts.brand)};` +
    `--mv-font-display:${font(fonts.display)};` +
    `--mv-font-accent:${font(fonts.accent)};` +
    `--mv-font-ui:${font(fonts.ui)};` +
    `--mv-radius-sm:${radius(theme.radius.sm)};--mv-radius-md:${radius(theme.radius.md)};--mv-radius-lg:${radius(theme.radius.lg)};` +
    `--mv-dur-fast:${ms(motion.fastMs)};--mv-dur-base:${ms(motion.baseMs)};--mv-dur-slow:${ms(motion.slowMs)};` +
    `--mv-ease:${ease(motion.ease)};`;
  const dark = `${colorVars(theme.colors.dark)}color-scheme:dark`;
  return (
    `:root{${shared}${colorVars(theme.colors.light)}color-scheme:light}` +
    (followSystem ? `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark}}}` : "") +
    `:root[data-theme="dark"]{${dark}}`
  );
}
