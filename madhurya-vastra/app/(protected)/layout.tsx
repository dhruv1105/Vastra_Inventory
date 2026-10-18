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
import ChangePasswordForm from "@/components/account/ChangePasswordForm";
import { Logo } from "@/components/ui/Brand";
import { useToast } from "@/context/ToastContext";

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

  // middleware.ts sends visitors without a session cookie to /login; this catches an expired or
  // revoked session (e.g. the owner turned the account off).
  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
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

  // Signed in with a temporary password: choose a new one before anything else
  // (the API refuses other requests until then).
  if (user.mustChangePassword) {
    return <FirstPassword />;
  }

  return (
    <SidebarProvider>
      <Shell>{children}</Shell>
    </SidebarProvider>
  );
}

function FirstPassword() {
  const { user, refresh, signOut } = useAuth();
  const { showToast } = useToast();
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4 py-8">
      <div className="grid w-full max-w-sm gap-4 rounded-lg bg-surface p-6 shadow-xl">
        <Logo className="mx-auto w-40" />
        <h1 className="text-center font-accent text-2xl font-semibold text-fg">Welcome, {user?.name?.split(" ")[0]}</h1>
        <p className="text-center text-muted">You signed in with a temporary password. Choose your own to continue.</p>
        <ChangePasswordForm
          firstTime
          onDone={async () => {
            await refresh();
            showToast("Password saved", "success");
          }}
        />
        <button type="button" onClick={signOut} className="text-center text-sm text-muted underline underline-offset-2 hover:text-fg">
          Not you? Sign out
        </button>
      </div>
    </div>
  );
}
