import { createClient } from "@supabase/supabase-js";

/** 공개 URL (프로젝트마다 다름). Anon 키는 반드시 환경 변수로만 넣을 것. */
const DEFAULT_URL = "https://twazhfpyouadslwhezkn.supabase.co";

/**
 * @returns {import("@supabase/supabase-js").SupabaseClient | null}
 */
export function getSupabase() {
  const url = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL).replace(/\/$/, "");
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!key) return null;
  return createClient(url, key);
}

export function isSupabaseConfigured() {
  return !!import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
}
