import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { fontVariables } from "@/lib/theme/fonts";
import { themeToCss } from "@/lib/theme/css";
import { activeTheme } from "@/lib/theme/presets";

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
const themeCss = themeToCss(activeTheme);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontVariables}>
      <head>
        <style id="mv-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className="font-sans bg-canvas text-fg antialiased">
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
