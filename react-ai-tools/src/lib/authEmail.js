/** 로그인용 아이디 → Supabase Auth 이메일 (비밀번호 로그인) */
export function displayIdToEmail(rawId) {
  const id = String(rawId ?? "").trim().toLowerCase();
  if (!id) throw new Error("EMPTY_ID");
  const safe = id.replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_");
  if (!safe) throw new Error("INVALID_ID");
  return `${safe}@shortcut.internal`;
}

export function normalizeDisplayIdForSignup(rawId) {
  const s = String(rawId ?? "").trim();
  if (!s || s.length > 32) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(s)) return null;
  return s;
}
