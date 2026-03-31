import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "../lib/supabaseClient.js";
import { displayIdToEmail, normalizeDisplayIdForSignup } from "../lib/authEmail.js";
import { isElevatedAdminDisplayId } from "../lib/adminDisplayIds.js";

const AuthContext = createContext(null);

function mergeAdminRole(displayId, dbRole) {
  const fromDb = dbRole === "admin" ? "admin" : "user";
  if (fromDb === "admin") return "admin";
  if (isElevatedAdminDisplayId(displayId)) return "admin";
  return "user";
}

async function fetchUserShape(sb, authUser) {
  const { data } = await sb.from("profiles").select("display_id, role").eq("id", authUser.id).maybeSingle();
  const displayId = data?.display_id ?? authUser.email?.split("@")[0] ?? "user";
  const role = mergeAdminRole(displayId, data?.role);
  return { id: displayId, uid: authUser.id, role };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  /** 로그아웃 후 늦게 끝난 fetchUserShape 가 다시 로그인 상태로 만드는 것 방지 */
  const applyGenRef = useRef(0);

  const applySession = useCallback(async (session) => {
    const sb = getSupabase();
    if (!session?.user || !sb) {
      applyGenRef.current += 1;
      setUser(null);
      setAccessToken(null);
      return;
    }
    const generation = (applyGenRef.current += 1);
    setAccessToken(session.access_token ?? null);
    const shape = await fetchUserShape(sb, session.user);
    if (generation !== applyGenRef.current) return;
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
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        applyGenRef.current += 1;
        setUser(null);
        setAccessToken(null);
        return;
      }
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
    applyGenRef.current += 1;
    setUser(null);
    setAccessToken(null);
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.auth.signOut({ scope: "local" });
      } catch (e) {
        console.warn("[auth signOut]", e);
      }
    }
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
