"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BrandMark, Wordmark } from "@/components/ui/Brand";
import Menu, { MenuHeader, MenuItem } from "@/components/ui/Menu";
import ThemeSwitch from "@/components/ui/ThemeSwitch";
import { activeNav } from "./nav";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", seller: "Seller" };

/**
 * Top bar. Phones: lotus + the current screen's name (pages hide their own title below md).
 * Tablet and up: lotus + wordmark. Right: account menu with role, theme and sign out.
 */
export default function Header() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const title = activeNav(pathname)?.name ?? "";
  const initial = user?.name?.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-nav flex h-16 w-full items-center justify-between gap-3 border-b border-line bg-surface px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <BrandMark alt="Madhurya Vastra" className="w-10 shrink-0" />
        <Wordmark className="hidden text-2xl md:inline" />
        <span className="truncate font-display text-xl text-fg md:hidden">{title}</span>
      </div>

      <Menu
        label="Account menu"
        trigger={<span className="font-display text-lg leading-none">{initial}</span>}
        triggerClassName="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-tint text-primary transition-colors duration-fast hover:border-primary-soft"
      >
        <MenuHeader>
          <div className="truncate font-semibold text-fg">{user?.name || "Signed in"}</div>
          {user?.role && (
            <span className="mt-1 inline-block rounded-full bg-zari-tint px-2 text-xs font-semibold text-zari">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          )}
        </MenuHeader>
        <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-fg">
          <span>Theme</span>
          <ThemeSwitch />
        </div>
        <MenuItem tone="danger" icon={<LogOut />} onSelect={signOut}>
          Sign out
        </MenuItem>
      </Menu>
    </header>
  );
}
