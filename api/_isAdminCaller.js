/** DB role admin 이 아니어도 표시 아이디로 관리 API 허용 (기본 kakaovx) */
module.exports = function isAdminCaller(profile) {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  const raw = process.env.ADMIN_DISPLAY_IDS || "kakaovx";
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(String(profile.display_id || "").toLowerCase());
};
