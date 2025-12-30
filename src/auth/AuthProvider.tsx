import React, { useEffect, useState } from "react";
import { me, logout as apiLogout } from "../api/authClient";
import type { AuthUser } from "./authTypes";
import { AUTH_USER_KEY } from "./authTypes";
import { loadUserFromStorage } from "./authStorage";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    loadUserFromStorage()
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const u = await me();
        setUser(u);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
      } catch {
        setUser(null);
        localStorage.removeItem(AUTH_USER_KEY);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  async function doLogout() {
    setUser(null);
    localStorage.removeItem(AUTH_USER_KEY);

    try {
      await apiLogout();
    } catch (err) {
      console.warn("logout failed", err);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isReady,
        isAuthed: !!user,
        loginSuccess: (u) => {
          setUser(u);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
        },
        logout: doLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
