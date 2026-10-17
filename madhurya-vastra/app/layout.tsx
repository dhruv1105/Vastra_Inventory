import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { fontVariables } from "@/lib/theme/fonts";
import { themeToCss } from "@/lib/theme/css";
import { activeTheme, FOLLOW_SYSTEM_THEME } from "@/lib/theme/presets";
import { ThemeProvider, themeBootScript } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "Madhurya Vastra | Grace in Every Thread",
  description: "Inventory management for Madhurya Vastra",
  manifest: "/manifest.json",
  icons: { icon: "/brand/icon-192.png", apple: "/brand/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: activeTheme.colors.light.primary,
};

// Theme tokens are generated from a typed config (lib/theme), not user input, so injecting them
// as a <style> tag is safe. Later the config can come from the database (admin theming).
const themeCss = themeToCss(activeTheme, { followSystem: FOLLOW_SYSTEM_THEME });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: themeBootScript may set data-theme before React hydrates.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <style id="mv-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="font-sans bg-canvas text-fg antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
