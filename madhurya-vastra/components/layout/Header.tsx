"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";

export default function Header() {
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 shadow-sm h-16 flex items-center px-4 md:px-6 justify-between">
      <div className="flex items-center gap-2">
        <span className="font-serif text-2xl font-bold text-brand-primary">
          Madhurya Vastra
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/manage-lists"
          className="w-9 h-9 rounded-full flex items-center justify-center text-brand-text-muted hover:text-brand-primary hover:bg-brand-secondary/10 transition-colors"
          title="Manage Lists"
        >
          <Settings className="w-5 h-5" />
        </Link>

        <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-10 h-10 rounded-full bg-brand-secondary/20 flex items-center justify-center text-brand-primary font-semibold hover:bg-brand-secondary/30 transition-colors"
        >
          {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-brand-text-primary truncate">
                {user?.name || "User"}
              </p>
              <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-brand-accent/20 text-brand-primary">
                {user?.role || "Owner"}
              </span>
            </div>
            <button
              onClick={() => {
                setDropdownOpen(false);
                signOut();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
