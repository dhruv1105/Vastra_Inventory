"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { AppUser, signOut as cognitoSignOut, getSession } from "@/lib/auth";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (user: AppUser) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const session = await getSession();
        if (session) {
          // Typically we would decode the session token and fetch the user profile
          // But since Cognito is a placeholder, this part will be handled in the login page
          // or a sync-user API call.
        }
      } catch (error) {
        console.error("Failed to restore session", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const signIn = (appUser: AppUser) => {
    setUser(appUser);
  };

  const signOut = () => {
    cognitoSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
