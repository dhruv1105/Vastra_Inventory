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

/** The nav item a path belongs to (also matches child paths such as /inventory/123). */
export function activeNav(pathname: string): NavItem | undefined {
  return NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));
}
