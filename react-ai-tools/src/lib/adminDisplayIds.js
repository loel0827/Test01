/**
 * DB profiles.role 이 아직 admin 이 아닐 때 UI 관리자 권한 부여용.
 * VITE_ADMIN_DISPLAY_IDS=alice,bob (쉼표) 없으면 기본 kakaovx
 */
export function isElevatedAdminDisplayId(displayId) {
  const raw = import.meta.env.VITE_ADMIN_DISPLAY_IDS;
  const list = raw?.trim()
    ? raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : ["kakaovx"];
  return list.includes(String(displayId ?? "").trim().toLowerCase());
}
