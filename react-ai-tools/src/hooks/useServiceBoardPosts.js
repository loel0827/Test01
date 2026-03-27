import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

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

/** 예전 계정별 게시판 키를 공용 키로 한 번만 합침 */
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

async function fetchBoardsFromServer(toolId) {
  const res = await fetch(`/api/board?toolId=${encodeURIComponent(toolId)}`);
  if (!res.ok) throw new Error(`API_${res.status}`);
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error || "API_ERROR");
  return {
    service: Array.isArray(data?.boards?.service) ? data.boards.service : [],
    tutorial: Array.isArray(data?.boards?.tutorial) ? data.boards.tutorial : [],
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
  const [remoteEnabled, setRemoteEnabled] = useState(true);
  const [remoteBoards, setRemoteBoards] = useState({ service: [], tutorial: [] });

  const data = useMemo(() => readAllRaw(STORAGE_BOARD_POSTS), [version]);
  const localBoards = useMemo(() => {
    const row = data[toolId];
    if (!row || typeof row !== "object") return { service: [], tutorial: [] };
    return {
      service: Array.isArray(row.service) ? row.service : [],
      tutorial: Array.isArray(row.tutorial) ? row.tutorial : [],
    };
  }, [data, toolId]);

  const boards = remoteEnabled ? remoteBoards : localBoards;

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (!toolId) return;
    if (!remoteEnabled) return;
    fetchBoardsFromServer(toolId)
      .then((next) => {
        if (!cancelled) setRemoteBoards(next);
      })
      .catch(() => {
        if (!cancelled) setRemoteEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toolId, remoteEnabled, version]);

  const addPost = useCallback(
    async (board, { title, body }) => {
      const t = title?.trim();
      const b = body?.trim();
      if (!t) return false;

      if (remoteEnabled) {
        const res = await fetch("/api/board", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toolId,
            board,
            title: t,
            body: b || "",
            author: user?.id ?? null,
          }),
        });
        if (res.ok) {
          bump();
          return true;
        }
        setRemoteEnabled(false);
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
      bump();
      return true;
    },
    [toolId, bump, user?.id, remoteEnabled]
  );

  const deletePost = useCallback(
    async (board, postId) => {
      if (remoteEnabled) {
        const res = await fetch("/api/board", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolId, board, postId }),
        });
        if (res.ok) {
          bump();
          return;
        }
        setRemoteEnabled(false);
      }

      const all = readAllRaw(STORAGE_BOARD_POSTS);
      const cur = all[toolId];
      if (!cur || typeof cur !== "object") return;
      const key = board === "service" ? "service" : "tutorial";
      const list = Array.isArray(cur[key]) ? cur[key].filter((p) => p.id !== postId) : [];
      all[toolId] = { ...cur, [key]: list };
      writeAllRaw(STORAGE_BOARD_POSTS, all);
      bump();
    },
    [toolId, bump, remoteEnabled]
  );

  return { servicePosts: boards.service, tutorialPosts: boards.tutorial, addPost, deletePost };
}
