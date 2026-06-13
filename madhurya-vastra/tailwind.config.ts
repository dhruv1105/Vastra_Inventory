import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#6B3FA0", // deep purple
          secondary: "#9B6FD0", // light purple
          accent: "#C9A84C", // gold
          background: "#FAFAFA",
          surface: "#FFFFFF",
          text: {
            primary: "#1A1A2E",
            muted: "#6B7280"
          }
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "serif"],
        sans: ['"Inter"', "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        input: "8px",
      }
    },
  },
  plugins: [],
};
export default config;
