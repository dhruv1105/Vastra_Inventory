import type { Config } from "tailwindcss";

// Every value points at a theme CSS variable (lib/theme/css.ts). Never add hex values here —
// change the theme preset in lib/theme/presets.ts instead.
const c = (name: string) => `rgb(var(--mv-${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        // Phone landscape and other very short viewports: slimmer chrome.
        short: { raw: "(max-height: 500px)" },
      },
      colors: {
        primary: { DEFAULT: c("primary"), hover: c("primary-hover"), soft: c("primary-soft"), on: c("on-primary") },
        tint: { DEFAULT: c("tint"), strong: c("tint-strong") },
        canvas: c("canvas"),
        surface: c("surface"),
        line: c("border"),
        fg: c("fg"),
        muted: c("muted"),
        zari: { DEFAULT: c("zari"), tint: c("zari-tint") },
        success: { DEFAULT: c("success"), tint: c("success-tint") },
        danger: { DEFAULT: c("danger"), tint: c("danger-tint") },
        lavender: { DEFAULT: c("lavender"), glow: c("lavender-glow") },
        // Legacy names, kept so screens not yet redesigned keep working. Removed in redesign R6.
        brand: {
          primary: c("primary"),
          secondary: c("primary-soft"),
          accent: c("zari"),
          background: c("canvas"),
          surface: c("surface"),
          text: { primary: c("fg"), muted: c("muted") },
        },
      },
      fontFamily: {
        brand: ["var(--mv-font-brand)"],
        display: ["var(--mv-font-display)"],
        accent: ["var(--mv-font-accent)"],
        sans: ["var(--mv-font-ui)"],
        // Legacy: font-serif was the wordmark font.
        serif: ["var(--mv-font-brand)"],
      },
      borderRadius: {
        sm: "var(--mv-radius-sm)",
        md: "var(--mv-radius-md)",
        lg: "var(--mv-radius-lg)",
        // Legacy names.
        card: "var(--mv-radius-lg)",
        input: "var(--mv-radius-md)",
      },
      transitionDuration: {
        fast: "var(--mv-dur-fast)",
        base: "var(--mv-dur-base)",
        slow: "var(--mv-dur-slow)",
      },
      // Stacking layers, lowest to highest. Use these names, never numbers.
      zIndex: { nav: "40", menu: "50", toast: "60", dialog: "70" },
      transitionTimingFunction: {
        brand: "var(--mv-ease)",
      },
    },
  },
  plugins: [],
};
export default config;
