/**
 * 데모용 개인 계정 (비밀번호는 클라이언트에만 있으므로 실서비스에서는 사용하지 마세요)
 * @type {{ id: string; password: string }[]}
 */
export const AUTH_ACCOUNTS = [
  { id: "sophie", password: "kakaovx" },
  { id: "Luna", password: "kakaovx" },
  { id: "Loel", password: "kakaovx" },
];

export function authenticate(rawId, rawPassword) {
  const id = rawId?.trim() ?? "";
  const password = rawPassword ?? "";
  const row = AUTH_ACCOUNTS.find((a) => a.id === id && a.password === password);
  return row ? { id: row.id } : null;
}

export function isKnownUserId(userId) {
  return AUTH_ACCOUNTS.some((a) => a.id === userId);
}
