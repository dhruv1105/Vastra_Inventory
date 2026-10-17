// A theme is data, not code: every colour, font role, radius and motion value the UI uses comes
// from a ThemeConfig rendered as CSS variables (see css.ts). Today the default preset is
// hard-wired; later an admin screen can store and switch ThemeConfigs (festival themes etc.) —
// see docs/theming.md and docs/roadmap.md.

/** Hex colour, e.g. "#6D37C0". */
export type Hex = `#${string}`;

export type ColorTokens = {
  primary: Hex;
  primaryHover: Hex;
  primarySoft: Hex;
  onPrimary: Hex;
  tint: Hex;
  tintStrong: Hex;
  canvas: Hex;
  surface: Hex;
  border: Hex;
  fg: Hex;
  muted: Hex;
  zari: Hex;
  zariTint: Hex;
  success: Hex;
  successTint: Hex;
  danger: Hex;
  dangerTint: Hex;
};

/** Font roles map to fonts loaded in fonts.ts — a theme can only pick from loaded fonts. */
export type FontKey = "cormorant" | "marcellus" | "eczar" | "mukta";

export type FontRoles = {
  /** The "Madhurya Vastra" wordmark only. */
  brand: FontKey;
  /** Page and section titles, tagline. */
  display: FontKey;
  /** Short expressive phrases: empty-state titles, welcome line. */
  accent: FontKey;
  /** Everything else, including numbers. */
  ui: FontKey;
};

export type MotionTokens = {
  /** Intro played on login / first open of a session. */
  intro: "bloom" | "none";
  fastMs: number;
  baseMs: number;
  slowMs: number;
  ease: string;
};

export type RadiusTokens = { sm: string; md: string; lg: string };

export type ThemeConfig = {
  id: string;
  name: string;
  colors: { light: ColorTokens; dark: ColorTokens };
  fonts: FontRoles;
  radius: RadiusTokens;
  motion: MotionTokens;
};
