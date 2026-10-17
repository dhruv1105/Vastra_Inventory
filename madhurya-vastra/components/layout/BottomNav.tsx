"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, DollarSign, LayoutDashboard } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Inventory", href: "/inventory", icon: Home },
    { name: "Add Item", href: "/items/new", icon: PlusCircle },
    { name: "Sales", href: "/sales", icon: DollarSign },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 md:hidden pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex justify-around items-center h-[var(--bottom-nav-h)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 [@media(max-height:500px)]:space-y-0 ${
                isActive ? "text-brand-primary" : "text-brand-text-muted"
              }`}
            >
              <Icon
                className={`w-6 h-6 [@media(max-height:500px)]:w-5 [@media(max-height:500px)]:h-5 ${isActive ? "fill-brand-primary/20" : ""}`}
              />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
