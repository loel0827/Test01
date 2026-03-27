/** 게스트(비로그인) — 기존 키와 동일 */
export const GUEST_STORAGE_KEYS = {
  categories: "ai-tools-categories",
  favorites: "ai-tools-favorites",
  active: "ai-tools-active-tool",
};

export function guestStorageKeys() {
  return GUEST_STORAGE_KEYS;
}

/** 로그인 사용자별 설정 분리 */
export function userStorageKeys(userId) {
  const safe = encodeURIComponent(String(userId).replace(/[^a-zA-Z0-9._-]/g, "_"));
  return {
    categories: `ai-tools-categories--u--${safe}`,
    favorites: `ai-tools-favorites--u--${safe}`,
    active: `ai-tools-active-tool--u--${safe}`,
  };
}
