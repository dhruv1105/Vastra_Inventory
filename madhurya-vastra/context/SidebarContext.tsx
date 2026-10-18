"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

const STORAGE_KEY = "sidebar-pref";
const LG_QUERY = "(min-width: 1024px)";

interface SidebarContextType {
  expanded: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // null = no explicit choice yet: follow the screen (expanded on laptops, icon rail on tablets).
  const [pref, setPref] = useState<"expanded" | "collapsed" | null>(null);
  const [isLg, setIsLg] = useState(
    () => typeof window !== "undefined" && window.matchMedia(LG_QUERY).matches
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "expanded" || saved === "collapsed") setPref(saved);
    } catch {}
    const mq = window.matchMedia(LG_QUERY);
    const onChange = () => setIsLg(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const expanded = pref ? pref === "expanded" : isLg;

  const toggle = useCallback(() => {
    const next = expanded ? "collapsed" : "expanded";
    setPref(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, [expanded]);

  return <SidebarContext.Provider value={{ expanded, toggle }}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
