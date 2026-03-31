import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase } from "../lib/supabaseClient.js";
import { displayIdToEmail, normalizeDisplayIdForSignup } from "../lib/authEmail.js";

const AuthContext = createContext(null);

async function fetchUserShape(sb, authUser) {
  const { data } = await sb.from("profiles").select("display_id, role").eq("id", authUser.id).maybeSingle();
  if (data?.display_id) {
    return { id: data.display_id, uid: authUser.id, role: data.role === "admin" ? "admin" : "user" };
  }
  const fallback = authUser.email?.split("@")[0] ?? "user";
  return { id: fallback, uid: authUser.id, role: "user" };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const applySession = useCallback(async (session) => {
    const sb = getSupabase();
    if (!session?.user || !sb) {
      setUser(null);
      setAccessToken(null);
      return;
    }
    setAccessToken(session.access_token ?? null);
    const shape = await fetchUserShape(sb, session.user);
    setUser(shape);
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setAuthReady(true);
      return;
    }
    let cancelled = false;
    sb.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      applySession(session).finally(() => {
        if (!cancelled) setAuthReady(true);
      });
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const login = useCallback(async (rawId, rawPassword) => {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: "Supabase가 설정되지 않았습니다. (.env 의 VITE_SUPABASE_ANON_KEY)" };
    let email;
    try {
      email = displayIdToEmail(rawId);
    } catch {
      return { ok: false, error: "아이디 형식이 올바르지 않습니다." };
    }
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password: rawPassword ?? "",
    });
    if (error) return { ok: false, error: translateAuthError(error.message) };
    await applySession(data.session);
    return { ok: true };
  }, [applySession]);

  const signUp = useCallback(async (rawId, rawPassword) => {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: "Supabase가 설정되지 않았습니다." };
    const displayId = normalizeDisplayIdForSignup(rawId);
    if (!displayId) {
      return { ok: false, error: "아이디는 영문·숫자·._- 만, 1~32자 로 입력하세요." };
    }
    const pw = rawPassword ?? "";
    if (pw.length < 6) return { ok: false, error: "비밀번호는 6자 이상이어야 합니다." };
    let email;
    try {
      email = displayIdToEmail(displayId);
    } catch {
      return { ok: false, error: "아이디 형식이 올바르지 않습니다." };
    }
    const { data, error } = await sb.auth.signUp({
      email,
      password: pw,
      options: { data: { display_id: displayId } },
    });
    if (error) return { ok: false, error: translateAuthError(error.message) };
    if (data.session) await applySession(data.session);
    return { ok: true, needsConfirm: !data.session };
  }, [applySession]);

  const logout = useCallback(async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setUser(null);
    setAccessToken(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, signUp, accessToken, authReady }),
    [user, login, logout, signUp, accessToken, authReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function translateAuthError(msg) {
  if (!msg) return "로그인에 실패했습니다.";
  if (/invalid login credentials/i.test(msg)) return "아이디 또는 비밀번호가 올바르지 않습니다.";
  if (/email not confirmed/i.test(msg)) return "이메일 인증이 필요합니다. Supabase Auth 설정을 확인하세요.";
  if (/user already registered/i.test(msg)) return "이미 가입된 아이디(이메일)입니다.";
  return msg;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
