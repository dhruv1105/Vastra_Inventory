"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { isPlaceholderEmail } from "@/lib/auth/staff.mjs";
import type { Role } from "@/lib/auth/roles";

/** The signed-in person, as screens need it. The server re-checks everything (lib/auth/guard.ts). */
export interface AppUser {
  id: string;
  name: string;
  phone: string | null;
  /** null when the account only has the hidden placeholder email. */
  email: string | null;
  role: Role;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  /** Ends the session on the server, then goes to /login. */
  signOut: () => Promise<void>;
  /** Re-reads the session (after a password change, role change …). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data, isPending, refetch } = authClient.useSession();
  const router = useRouter();

  const user = useMemo<AppUser | null>(() => {
    const u = data?.user;
    if (!u) return null;
    return {
      id: u.id,
      name: u.name,
      phone: u.phoneNumber ?? null,
      email: isPlaceholderEmail(u.email) ? null : u.email,
      role: (u.role === "owner" ? "owner" : "seller") as Role,
      mustChangePassword: !!u.mustChangePassword,
    };
  }, [data]);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }, [router]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return <AuthContext.Provider value={{ user, loading: isPending, signOut, refresh }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
