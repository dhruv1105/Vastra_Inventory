"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { KeyRound, LogOut, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/context/ToastContext";
import { BrandMark, Wordmark } from "@/components/ui/Brand";
import Menu, { MenuHeader, MenuItem } from "@/components/ui/Menu";
import ThemeSwitch from "@/components/ui/ThemeSwitch";
import Dialog from "@/components/ui/Dialog";
import ChangePasswordForm from "@/components/account/ChangePasswordForm";
import { pageTitle } from "./nav";
import { HIT_AREA, HIT_AREA_ROW } from "@/components/ui/hitArea";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", seller: "Seller" };

/**
 * Top bar. Phones: lotus + the current screen's name (pages hide their own title below md).
 * Tablet and up: lotus + wordmark. Right: account menu with role, Staff (owner), password, theme,
 * sign out.
 */
export default function Header() {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const [changing, setChanging] = useState(false);
  const title = pageTitle(pathname);
  const initial = user?.name?.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-nav flex h-16 w-full items-center justify-between gap-3 border-b border-line bg-surface px-4 md:px-6">
      <Link href="/inventory" className={`relative flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft ${HIT_AREA_ROW}`}>
        <BrandMark alt="Madhurya Vastra — home" className="w-10 shrink-0" />
        <Wordmark className="hidden text-2xl md:inline" />
        <span className="truncate font-display text-xl text-fg md:hidden">{title}</span>
      </Link>

      <Menu
        label="Account menu"
        trigger={<span className="font-display text-lg leading-none">{initial}</span>}
        triggerClassName={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-tint text-primary transition-colors duration-fast hover:border-primary-soft ${HIT_AREA}`}
      >
        <MenuHeader>
          <div className="truncate font-semibold text-fg">{user?.name || "Signed in"}</div>
          {user?.role && (
            <span className="mt-1 inline-block rounded-full bg-zari-tint px-2 text-xs font-semibold text-zari">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          )}
        </MenuHeader>
        {user?.role === "owner" && (
          <MenuItem icon={<Users />} onSelect={() => router.push("/staff")}>
            Staff
          </MenuItem>
        )}
        <MenuItem icon={<KeyRound />} onSelect={() => setChanging(true)}>
          Change password
        </MenuItem>
        <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-fg">
          <span>Theme</span>
          <ThemeSwitch />
        </div>
        <MenuItem tone="danger" icon={<LogOut />} onSelect={signOut}>
          Sign out
        </MenuItem>
      </Menu>

      <Dialog open={changing} title="Change your password" onClose={() => setChanging(false)}>
        <p>Your other phones and computers will be signed out.</p>
        <ChangePasswordForm
          onCancel={() => setChanging(false)}
          onDone={() => {
            setChanging(false);
            showToast("Password changed", "success");
          }}
        />
      </Dialog>
    </header>
  );
}
