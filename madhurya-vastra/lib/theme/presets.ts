import type { FontRoles, ThemeConfig } from "./types";

// Colours sampled from assets/Madhurya vastra Logo.png: wordmark #6D37C0, petals #9E69E4 → #713BC4.
// Approved in the R0 redesign mock (docs/redesign/mock.html). Values documented in docs/theming.md.
export const madhuryaTheme: ThemeConfig = {
  id: "madhurya",
  name: "Madhurya",
  colors: {
    light: {
      primary: "#6D37C0",
      primaryHover: "#5A2BA3",
      primarySoft: "#9E69E4",
      onPrimary: "#FFFFFF",
      tint: "#F3ECFC",
      tintStrong: "#E7DAFA",
      canvas: "#FBF9FE",
      surface: "#FFFFFF",
      border: "#E7DFF3",
      fg: "#241A33",
      muted: "#6E6680",
      zari: "#B8923A",
      zariTint: "#F6EEDC",
      success: "#2E7D5B",
      successTint: "#E3F2EA",
      danger: "#C0392B",
      dangerTint: "#FBE7E4",
    },
    dark: {
      primary: "#B48CF0",
      primaryHover: "#C6A6F5",
      primarySoft: "#8752D4",
      onPrimary: "#1A1225",
      tint: "#2A2140",
      tintStrong: "#352A52",
      canvas: "#16111F",
      surface: "#211A2D",
      border: "#3A3150",
      fg: "#EEE8F7",
      muted: "#A79FB8",
      zari: "#D4B062",
      zariTint: "#3A3020",
      success: "#5FBF95",
      successTint: "#1D3329",
      danger: "#E57368",
      dangerTint: "#3D2220",
    },
  },
  // Decision D5: Cormorant matches the logo wordmark; Marcellus reads best for titles.
  fonts: { brand: "cormorant", display: "marcellus", accent: "eczar", ui: "mukta" },
  radius: { sm: "6px", md: "10px", lg: "16px" },
  motion: { intro: "bloom", fastMs: 150, baseMs: 200, slowMs: 250, ease: "cubic-bezier(.2,.7,.2,1)" },
};

/**
 * Font sets compared in the R0 mock. A is in use; B and C are kept for future admin / festival
 * themes (docs/theming.md "Kept for later").
 */
export const fontSets: Record<"a" | "b" | "c", FontRoles> = {
  a: madhuryaTheme.fonts,
  b: { brand: "cormorant", display: "cormorant", accent: "eczar", ui: "mukta" },
  c: { brand: "cormorant", display: "eczar", accent: "eczar", ui: "mukta" },
};

export const activeTheme = madhuryaTheme;
