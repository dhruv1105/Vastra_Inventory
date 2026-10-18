import { Home, LayoutDashboard, ListChecks, PlusCircle, ReceiptIndianRupee, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  /** Full name: sidebar, header title, tooltips. */
  name: string;
  /** Bottom-nav label on phones, where five items share the width. */
  short: string;
  icon: LucideIcon;
};

/** The one list of staff screens. Sidebar, bottom nav and the phone header title all read it. */
export const NAV: NavItem[] = [
  { href: "/inventory", name: "Inventory", short: "Inventory", icon: Home },
  { href: "/items/new", name: "Add Item", short: "Add Item", icon: PlusCircle },
  { href: "/sales", name: "Sales", short: "Sales", icon: ReceiptIndianRupee },
  { href: "/dashboard", name: "Dashboard", short: "Dashboard", icon: LayoutDashboard },
  { href: "/manage-lists", name: "Manage Lists", short: "Lists", icon: ListChecks },
];

/** Screens reached from the account menu, not the bars (titles for the phone header). */
export const MENU_PAGES: Pick<NavItem, "href" | "name">[] = [{ href: "/staff", name: "Staff" }];

/** An item's own page (/items/<id>, not /items/new) is part of Inventory, where it was opened from. */
const ITEM_PAGE = /^\/items\/(?!new(?:\/|$))[^/]+/;

/** The nav item a path belongs to (also matches child paths such as /inventory/123). */
export function activeNav(pathname: string): NavItem | undefined {
  if (ITEM_PAGE.test(pathname)) return NAV.find((n) => n.href === "/inventory");
  return NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));
}

/** Title for the phone header: a nav item or a menu page. */
export function pageTitle(pathname: string): string {
  return activeNav(pathname)?.name ?? MENU_PAGES.find((p) => pathname === p.href || pathname.startsWith(p.href + "/"))?.name ?? "";
}
