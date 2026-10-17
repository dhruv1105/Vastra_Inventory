"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, DollarSign, LayoutDashboard, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { expanded, toggle } = useSidebar();

  const navItems = [
    { name: "Inventory", href: "/inventory", icon: Home },
    { name: "Add Item", href: "/items/new", icon: PlusCircle },
    { name: "Sales", href: "/sales", icon: DollarSign },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];

  return (
    <aside
      style={{ width: "var(--sidebar-w)" }}
      className="hidden md:flex flex-col shrink-0 bg-white border-r border-gray-100 sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden z-40 transition-[width] duration-200"
    >
      <nav className={`flex-1 py-4 space-y-1 ${expanded ? "px-4 lg:py-6 space-y-2" : "px-2"}`}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={expanded ? undefined : item.name}
              className={`flex items-center rounded-lg transition-all duration-200 ${
                expanded ? "flex-row gap-3 px-4 py-3" : "flex-col gap-1 px-1 py-2"
              } ${
                isActive
                  ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                  : "text-brand-text-muted hover:bg-brand-secondary/10 hover:text-brand-primary"
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? "fill-white/20" : ""}`} />
              <span
                className={`font-medium leading-tight ${
                  expanded ? "text-base" : "text-[10px] text-center"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className={`border-t border-gray-100 p-2 ${expanded ? "lg:p-4" : ""}`}>
        <button
          type="button"
          onClick={toggle}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={expanded}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className={`w-full flex items-center rounded-lg text-brand-text-muted hover:bg-brand-secondary/10 hover:text-brand-primary transition-colors ${
            expanded ? "gap-3 px-4 py-2.5" : "flex-col gap-1 px-1 py-2"
          }`}
        >
          {expanded ? <PanelLeftClose className="w-5 h-5 shrink-0" /> : <PanelLeftOpen className="w-5 h-5 shrink-0" />}
          <span className={expanded ? "text-sm font-medium" : "text-[10px] font-medium"}>
            {expanded ? "Collapse" : "Expand"}
          </span>
        </button>
      </div>
    </aside>
  );
}
