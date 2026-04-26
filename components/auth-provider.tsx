"use client";

import { createContext, useContext, useEffect, useState } from "react";

import {
  clearStoredAuthToken,
  fetchAuthSession,
  getStoredAuthToken,
  listenForAuthChanges,
  loginWithGoogleCredential,
  setStoredAuthToken,
  type AuthUser,
  type GoogleLoginResponse,
} from "@/lib/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: (credential: string) => Promise<GoogleLoginResponse>;
  refreshSession: () => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshSession() {
    const token = getStoredAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const result = await fetchAuthSession();
      setUser(result.user);
    } catch (_error) {
      clearStoredAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle(credential: string) {
    const result = await loginWithGoogleCredential(credential);
    if (result.access_token) {
      setStoredAuthToken(result.access_token);
      setUser(result.user);
    } else {
      clearStoredAuthToken();
      setUser(null);
    }
    return result;
  }

  function signOut() {
    clearStoredAuthToken();
    setUser(null);
  }

  useEffect(() => {
    void refreshSession();
    return listenForAuthChanges(() => {
      void refreshSession();
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        refreshSession,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
