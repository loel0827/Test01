import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { authenticate, isKnownUserId } from "../config/authUsers.js";

const SESSION_KEY = "ai-tools-auth-session";

const AuthContext = createContext(null);

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.userId && isKnownUserId(p.userId)) return { id: p.userId };
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession());

  const login = useCallback((rawId, rawPassword) => {
    const u = authenticate(rawId, rawPassword);
    if (!u) return false;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: u.id }));
    } catch {
      /* ignore */
    }
    setUser(u);
    return true;
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
