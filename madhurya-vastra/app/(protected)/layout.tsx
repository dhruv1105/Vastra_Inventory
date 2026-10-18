"use client";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import { BrandMark } from "@/components/ui/Brand";
import Loader from "@/components/ui/Loader";
import Intro, { useIntroOnce } from "@/components/ui/Intro";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";

function Shell({ children }: { children: React.ReactNode }) {
  const { expanded } = useSidebar();
  // First open of the app in this browser session: the logo intro (skipped with reduced motion).
  const [showIntro, introDone] = useIntroOnce();
  return (
    <div
      style={{ "--sidebar-w": expanded ? "15rem" : "5.5rem" } as React.CSSProperties}
      className="flex min-h-dvh flex-col bg-canvas text-fg"
    >
      {showIntro && <Intro onDone={introDone} />}
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && pathname === "/") {
      router.push("/inventory");
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas">
        <div className="grid justify-items-center gap-4 text-primary">
          <BrandMark className="w-24" />
          <Loader label="Opening Madhurya Vastra" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <SidebarProvider>
      <Shell>{children}</Shell>
    </SidebarProvider>
  );
}
