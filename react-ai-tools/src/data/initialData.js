import { defaultCategories } from "./categories.js";

/**
 * 배포/첫 접속 시 사용할 기본 도구 데이터(immutable source)
 */
export const initialCategories = defaultCategories;

export function createInitialCategories() {
  return JSON.parse(JSON.stringify(initialCategories));
}
