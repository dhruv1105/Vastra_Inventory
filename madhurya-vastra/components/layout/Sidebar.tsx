"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, DollarSign, LayoutDashboard } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Inventory", href: "/inventory", icon: Home },
    { name: "Add Item", href: "/items/new", icon: PlusCircle },
    { name: "Sales", href: "/sales", icon: DollarSign },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 min-h-[calc(100vh-4rem)] z-40">
      <nav className="flex-1 py-6 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                  : "text-brand-text-muted hover:bg-brand-secondary/10 hover:text-brand-primary"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "fill-white/20" : ""}`} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
