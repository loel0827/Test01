import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { getSupabase } from "../lib/supabaseClient.js";

export const STORAGE_BOARD_POSTS = "ai-tools-board-posts";

const MERGE_FLAG = "ai-tools-board-posts-merged-v1";

/** @typedef {{ id: string; title: string; body: string; createdAt: number; author?: string | null }} BoardPost */

function readAllRaw(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const p = JSON.parse(raw);
    if (typeof p !== "object" || p === null || Array.isArray(p)) return {};
    return p;
  } catch {
    return {};
  }
}

function writeAllRaw(storageKey, data) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function mergeBoardBuckets(target, addition) {
  for (const toolId of Object.keys(addition)) {
    const row = addition[toolId];
    if (!row || typeof row !== "object") continue;
    if (!target[toolId]) target[toolId] = { service: [], tutorial: [] };
    const t = target[toolId];
    const existing = new Set();
    for (const p of t.service || []) existing.add(p.id);
    for (const p of t.tutorial || []) existing.add(p.id);
    for (const p of Array.isArray(row.service) ? row.service : []) {
      if (p?.id && !existing.has(p.id)) {
        t.service.push(p);
        existing.add(p.id);
      }
    }
    for (const p of Array.isArray(row.tutorial) ? row.tutorial : []) {
      if (p?.id && !existing.has(p.id)) {
        t.tutorial.push(p);
        existing.add(p.id);
      }
    }
  }
}

function ensureBoardPostsMergedOnce() {
  try {
    if (localStorage.getItem(MERGE_FLAG)) return;
    const main = readAllRaw(STORAGE_BOARD_POSTS);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("ai-tools-board-posts--u--")) continue;
      mergeBoardBuckets(main, readAllRaw(key));
    }
    writeAllRaw(STORAGE_BOARD_POSTS, main);
    localStorage.setItem(MERGE_FLAG, "1");
  } catch {
    /* ignore */
  }
}

let boardMergeChecked = false;

/** @param {import("@supabase/supabase-js").SupabaseClient} sb */
function rowToPost(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body ?? "",
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    author: row.author ?? null,
  };
}

/**
 * @param {string} toolId
 */
export function useServiceBoardPosts(toolId) {
  const { user } = useAuth();
  if (!boardMergeChecked) {
    boardMergeChecked = true;
    ensureBoardPostsMergedOnce();
  }

  const [version, setVersion] = useState(0);
  /** Supabase 사용 가능 여부(키 있음 + 마지막 로드 성공) */
  const [useRemote, setUseRemote] = useState(() => !!getSupabase());
  const [remoteBoards, setRemoteBoards] = useState({ service: [], tutorial: [] });

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const data = useMemo(() => readAllRaw(STORAGE_BOARD_POSTS), [version]);
  const localBoards = useMemo(() => {
    const row = data[toolId];
    if (!row || typeof row !== "object") return { service: [], tutorial: [] };
    return {
      service: Array.isArray(row.service) ? row.service : [],
      tutorial: Array.isArray(row.tutorial) ? row.tutorial : [],
    };
  }, [data, toolId]);

  const boards = useRemote ? remoteBoards : localBoards;

  useEffect(() => {
    let cancelled = false;
    if (!toolId) return;

    const sb = getSupabase();
    if (!sb) {
      setUseRemote(false);
      return;
    }

    (async () => {
      const { data: rows, error } = await sb
        .from("board_posts")
        .select("id,tool_id,board,title,body,author,created_at")
        .eq("tool_id", toolId)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.warn("[board_posts]", error.message);
        setUseRemote(false);
        return;
      }

      const service = [];
      const tutorial = [];
      for (const row of rows || []) {
        const post = rowToPost(row);
        if (row.board === "tutorial") tutorial.push(post);
        else service.push(post);
      }
      setRemoteBoards({ service, tutorial });
      setUseRemote(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [toolId, version]);

  const addPost = useCallback(
    async (board, { title, body }) => {
      const t = title?.trim();
      const b = body?.trim();
      if (!t) return false;

      const sb = getSupabase();
      if (sb && useRemote) {
        const { error } = await sb.from("board_posts").insert({
          tool_id: toolId,
          board: board === "tutorial" ? "tutorial" : "service",
          title: t,
          body: b || "",
          author: user?.id ?? null,
        });
        if (!error) {
          bump();
          return true;
        }
        console.warn("[board_posts insert]", error.message);
      }

      const all = readAllRaw(STORAGE_BOARD_POSTS);
      const cur = all[toolId] && typeof all[toolId] === "object" ? all[toolId] : {};
      const service = Array.isArray(cur.service) ? [...cur.service] : [];
      const tutorial = Array.isArray(cur.tutorial) ? [...cur.tutorial] : [];
      const post = {
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: t,
        body: b || "",
        createdAt: Date.now(),
        author: user?.id ?? null,
      };
      if (board === "service") service.push(post);
      else tutorial.push(post);
      all[toolId] = { service, tutorial };
      writeAllRaw(STORAGE_BOARD_POSTS, all);
      setUseRemote(false);
      bump();
      return true;
    },
    [toolId, bump, user?.id, useRemote]
  );

  const deletePost = useCallback(
    async (board, postId) => {
      const sb = getSupabase();
      if (sb && useRemote) {
        const { error } = await sb.from("board_posts").delete().eq("id", postId);
        if (!error) {
          bump();
          return;
        }
        console.warn("[board_posts delete]", error.message);
      }

      const all = readAllRaw(STORAGE_BOARD_POSTS);
      const cur = all[toolId];
      if (!cur || typeof cur !== "object") return;
      const key = board === "service" ? "service" : "tutorial";
      const list = Array.isArray(cur[key]) ? cur[key].filter((p) => p.id !== postId) : [];
      all[toolId] = { ...cur, [key]: list };
      writeAllRaw(STORAGE_BOARD_POSTS, all);
      setUseRemote(false);
      bump();
    },
    [toolId, bump, useRemote]
  );

  return { servicePosts: boards.service, tutorialPosts: boards.tutorial, addPost, deletePost };
}
