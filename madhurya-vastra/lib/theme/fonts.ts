import { Cormorant_Garamond, Eczar, Marcellus, Mukta } from "next/font/google";

// next/font needs fonts declared statically, so every font a theme may use is loaded here.
// Adding a font to a future theme = add it here, to FontKey (types.ts) and to font-stacks.ts.
const cormorant = Cormorant_Garamond({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});
const marcellus = Marcellus({ weight: "400", subsets: ["latin"], variable: "--font-marcellus", display: "swap" });
const eczar = Eczar({
  weight: ["500", "600"],
  subsets: ["latin", "devanagari"],
  variable: "--font-eczar",
  display: "swap",
});
const mukta = Mukta({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "devanagari"],
  variable: "--font-mukta",
  display: "swap",
});

/** Class names that define every --font-* variable; put on <html>. */
export const fontVariables = [cormorant, marcellus, eczar, mukta].map((f) => f.variable).join(" ");
