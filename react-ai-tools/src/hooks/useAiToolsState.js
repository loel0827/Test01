import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { initialCategories, createInitialCategories } from "../data/initialData.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getSupabase } from "../lib/supabaseClient.js";
import { guestStorageKeys, userStorageKeys } from "../utils/storageKeys.js";

/** 게스트 키 (다른 모듈·문서 호환용) */
export const STORAGE_CATEGORIES = "ai-tools-categories";
export const STORAGE_FAVS = "ai-tools-favorites";
export const STORAGE_ACTIVE = "ai-tools-active-tool";

function keysForUser(user) {
  return user?.id ? userStorageKeys(user.id) : guestStorageKeys();
}

function loadCategoriesRaw(keys) {
  try {
    const raw = localStorage.getItem(keys.categories);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (isValidSavedCategories(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidSavedCategories(parsed) {
  if (!Array.isArray(parsed) || parsed.length === 0) return false;
  return parsed.every((cat) => {
    if (!cat || typeof cat !== "object") return false;
    if (!isNonEmptyString(cat.id) || !isNonEmptyString(cat.name)) return false;
    if (!Array.isArray(cat.tools)) return false;
    return cat.tools.every((tool) => {
      if (!tool || typeof tool !== "object") return false;
      return (
        isNonEmptyString(tool.id) &&
        isNonEmptyString(tool.name) &&
        isNonEmptyString(tool.url) &&
        isNonEmptyString(tool.domain)
      );
    });
  });
}

function defaultDescriptionByToolId() {
  const map = new Map();
  initialCategories.forEach((c) =>
    c.tools.forEach((t) => {
      if (t.description?.trim()) map.set(t.id, t.description.trim());
    })
  );
  return map;
}

function mergeDefaultDescriptions(saved) {
  const map = defaultDescriptionByToolId();
  return saved.map((c) => ({
    ...c,
    tools: c.tools.map((t) => ({
      ...t,
      description: t.description?.trim() ? t.description.trim() : (map.get(t.id) ?? ""),
    })),
  }));
}

function mergeMissingCategories(saved) {
  const defaults = createInitialCategories();
  const existing = new Set(saved.map((c) => c.id));
  const out = [...saved];
  defaults.forEach((c) => {
    if (!existing.has(c.id)) out.push(c);
  });
  return out;
}

function getInitialCategories(keys) {
  const saved = loadCategoriesRaw(keys);
  if (saved) return mergeDefaultDescriptions(mergeMissingCategories(saved));
  return createInitialCategories();
}

function buildDefaultFavorites(categories) {
  const s = new Set();
  categories.forEach((c) =>
    c.tools.forEach((t) => {
      if (t.defaultFav) s.add(t.id);
    })
  );
  return s;
}

function buildInitialFavorites(categories, keys) {
  try {
    const raw = localStorage.getItem(keys.favorites);
    if (!raw) {
      return buildDefaultFavorites(categories);
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : buildDefaultFavorites(categories);
  } catch {
    return buildDefaultFavorites(categories);
  }
}

function ensureSeededStorage(keys) {
  const seededCategories = getInitialCategories(keys);
  const needSeedCategories = !loadCategoriesRaw(keys);
  if (needSeedCategories) {
    try {
      localStorage.setItem(keys.categories, JSON.stringify(seededCategories));
    } catch {
      /* ignore */
    }
  }

  const hasFavorites = localStorage.getItem(keys.favorites);
  if (!hasFavorites) {
    try {
      localStorage.setItem(keys.favorites, JSON.stringify([...buildDefaultFavorites(seededCategories)]));
    } catch {
      /* ignore */
    }
  }

  const hasActive = localStorage.getItem(keys.active);
  if (!hasActive) {
    const firstToolId = seededCategories.flatMap((c) => c.tools)[0]?.id || "chatgpt";
    try {
      localStorage.setItem(keys.active, firstToolId);
    } catch {
      /* ignore */
    }
  }
}

function normalize(s) {
  return s.toLowerCase().trim();
}

function matchesSearch(tool, catName, q) {
  if (!q) return true;
  const n = normalize(q);
  return (
    normalize(tool.name).includes(n) ||
    normalize(catName).includes(n) ||
    normalize(tool.url).includes(n) ||
    normalize(tool.description || "").includes(n)
  );
}

export function useAiToolsState() {
  const { user } = useAuth();
  const keys = useMemo(() => keysForUser(user), [user?.id]);

  const k0 = keysForUser(user);
  ensureSeededStorage(k0);
  const [categories, setCategories] = useState(() => getInitialCategories(k0));
  const [favorites, setFavorites] = useState(() => {
    const loaded = getInitialCategories(k0);
    return buildInitialFavorites(loaded, k0);
  });
  const [activeToolId, setActiveToolId] = useState(() => localStorage.getItem(k0.active) || "chatgpt");
  const activeToolIdRef = useRef(activeToolId);
  useEffect(() => {
    activeToolIdRef.current = activeToolId;
  }, [activeToolId]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const categoriesRef = useRef(categories);
  const favoritesRef = useRef(favorites);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);
  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  const remoteTimerRef = useRef(null);
  const scheduleRemotePersist = useCallback(() => {
    const uid = user?.uid;
    if (!uid || !getSupabase()) return;
    if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
    remoteTimerRef.current = setTimeout(async () => {
      remoteTimerRef.current = null;
      const sb = getSupabase();
      if (!sb || !uid) return;
      const { error } = await sb.from("user_app_state").upsert({
        user_id: uid,
        categories: categoriesRef.current,
        favorites: [...favoritesRef.current],
        active_tool_id: activeToolIdRef.current,
        updated_at: new Date().toISOString(),
      });
      if (error) console.warn("[user_app_state]", error.message);
    }, 450);
  }, [user?.uid]);

  const prevSessionKeyRef = useRef(null);
  useEffect(() => {
    const key = user?.uid ? `u:${user.uid}` : "guest";
    if (prevSessionKeyRef.current === key) return;
    prevSessionKeyRef.current = key;
    const k = keysForUser(user);
    ensureSeededStorage(k);
    const loaded = getInitialCategories(k);
    setCategories(loaded);
    setFavorites(buildInitialFavorites(loaded, k));
    const aid = localStorage.getItem(k.active) || "chatgpt";
    activeToolIdRef.current = aid;
    setActiveToolId(aid);
    setSearchQuery("");
    setFavoritesOnly(false);
  }, [user]);

  useEffect(() => {
    if (!user?.uid || !getSupabase()) return;
    let cancelled = false;
    const sb = getSupabase();
    const k = keysForUser(user);
    (async () => {
      const { data, error } = await sb
        .from("user_app_state")
        .select("categories,favorites,active_tool_id")
        .eq("user_id", user.uid)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("[user_app_state load]", error.message);
        return;
      }
      if (data && isValidSavedCategories(data.categories)) {
        const merged = mergeDefaultDescriptions(mergeMissingCategories(data.categories));
        setCategories(merged);
        setFavorites(new Set(Array.isArray(data.favorites) ? data.favorites : []));
        const aid = data.active_tool_id || "chatgpt";
        activeToolIdRef.current = aid;
        setActiveToolId(aid);
        try {
          localStorage.setItem(k.categories, JSON.stringify(merged));
          localStorage.setItem(k.favorites, JSON.stringify([...(Array.isArray(data.favorites) ? data.favorites : [])]));
          localStorage.setItem(k.active, aid);
        } catch {
          /* ignore */
        }
      } else {
        ensureSeededStorage(k);
        const loaded = getInitialCategories(k);
        const favs = buildInitialFavorites(loaded, k);
        const aid = localStorage.getItem(k.active) || "chatgpt";
        setCategories(loaded);
        setFavorites(favs);
        activeToolIdRef.current = aid;
        setActiveToolId(aid);
        const { error: upErr } = await sb.from("user_app_state").upsert({
          user_id: user.uid,
          categories: loaded,
          favorites: [...favs],
          active_tool_id: aid,
          updated_at: new Date().toISOString(),
        });
        if (upErr) console.warn("[user_app_state seed]", upErr.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.id]);

  const persistCategories = useCallback(
    (next) => {
      try {
        localStorage.setItem(keys.categories, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      scheduleRemotePersist();
    },
    [keys.categories, scheduleRemotePersist]
  );

  const persistFavorites = useCallback(
    (set) => {
      try {
        localStorage.setItem(keys.favorites, JSON.stringify([...set]));
      } catch {
        /* ignore */
      }
      scheduleRemotePersist();
    },
    [keys.favorites, scheduleRemotePersist]
  );

  const persistActive = useCallback(
    (id) => {
      try {
        localStorage.setItem(keys.active, id);
      } catch {
        /* ignore */
      }
      scheduleRemotePersist();
    },
    [keys.active, scheduleRemotePersist]
  );

  const sections = useMemo(() => {
    return categories
      .map((cat) => ({
        ...cat,
        tools: cat.tools.filter((t) => {
          if (!matchesSearch(t, cat.name, searchQuery)) return false;
          if (favoritesOnly && !favorites.has(t.id)) return false;
          return true;
        }),
      }))
      .filter((cat) => !favoritesOnly || cat.tools.length > 0);
  }, [categories, searchQuery, favoritesOnly, favorites]);

  const toggleFavorite = useCallback(
    (toolId) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(toolId)) next.delete(toolId);
        else next.add(toolId);
        persistFavorites(next);
        return next;
      });
    },
    [persistFavorites]
  );

  const setFavoriteState = useCallback(
    (toolId, isFavorite) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFavorite) next.add(toolId);
        else next.delete(toolId);
        persistFavorites(next);
        return next;
      });
    },
    [persistFavorites]
  );

  const setActiveTool = useCallback(
    (id) => {
      activeToolIdRef.current = id;
      setActiveToolId(id);
      persistActive(id);
    },
    [persistActive]
  );

  const editTool = useCallback(
    (categoryId, toolId, name, url, description = "") => {
      setCategories((prev) => {
        const next = prev.map((c) => {
          if (c.id !== categoryId) return c;
          return {
            ...c,
            tools: c.tools.map((t) => {
              if (t.id !== toolId) return t;
              let finalUrl = url.trim() || t.url;
              const withProto = finalUrl.startsWith("http") ? finalUrl : `https://${finalUrl}`;
              let domain = t.domain;
              try {
                domain = new URL(withProto).hostname.replace(/^www\./, "");
                finalUrl = withProto;
              } catch {
                /* keep */
              }
              return {
                ...t,
                name: name.trim() || t.name,
                url: finalUrl,
                domain,
                description: description.trim(),
              };
            }),
          };
        });
        persistCategories(next);
        return next;
      });
    },
    [persistCategories]
  );

  const deleteTool = useCallback(
    (categoryId, toolId) => {
      setCategories((prev) => {
        const next = prev.map((c) =>
          c.id === categoryId ? { ...c, tools: c.tools.filter((t) => t.id !== toolId) } : c
        );
        persistCategories(next);
        if (activeToolIdRef.current === toolId) {
          const nid = next.flatMap((c) => c.tools)[0]?.id || "";
          activeToolIdRef.current = nid;
          persistActive(nid);
          queueMicrotask(() => setActiveToolId(nid));
        }
        return next;
      });
      setFavorites((prev) => {
        if (!prev.has(toolId)) return prev;
        const next = new Set(prev);
        next.delete(toolId);
        persistFavorites(next);
        return next;
      });
    },
    [persistCategories, persistFavorites, persistActive]
  );

  const addTool = useCallback(
    (categoryId, name, url, description = "") => {
      const raw = url.trim();
      const withProto = raw.startsWith("http") ? raw : `https://${raw}`;
      let domain = "example.com";
      try {
        domain = new URL(withProto).hostname.replace(/^www\./, "");
      } catch {
        return false;
      }
      const id = `custom-${Date.now()}`;
      setCategories((prev) => {
        const next = prev.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                tools: [
                  ...c.tools,
                  { id, name: name.trim(), url: withProto, domain, description: description.trim() },
                ],
              }
            : c
        );
        persistCategories(next);
        return next;
      });
      return true;
    },
    [persistCategories]
  );

  const addCategory = useCallback(
    (name) => {
      const id = `cat-${Date.now()}`;
      setCategories((prev) => {
        const next = [...prev, { id, name: name.trim(), icon: "agent", tools: [] }];
        persistCategories(next);
        return next;
      });
    },
    [persistCategories]
  );

  const editCategoryName = useCallback(
    (categoryId, name) => {
      setCategories((prev) => {
        const next = prev.map((c) => (c.id === categoryId ? { ...c, name: name.trim() } : c));
        persistCategories(next);
        return next;
      });
    },
    [persistCategories]
  );

  const reorderCategories = useCallback(
    (sourceId, targetId) => {
      if (sourceId === targetId) return;
      setCategories((prev) => {
        const si = prev.findIndex((c) => c.id === sourceId);
        if (si < 0) return prev;
        const removed = prev[si];
        const next = prev.filter((c) => c.id !== sourceId);
        const insertAt = next.findIndex((c) => c.id === targetId);
        if (insertAt >= 0) next.splice(insertAt, 0, removed);
        else next.push(removed);
        persistCategories(next);
        return next;
      });
    },
    [persistCategories]
  );

  const reorderTools = useCallback(
    (categoryId, sourceToolId, targetToolId) => {
      if (sourceToolId === targetToolId) return;
      setCategories((prev) => {
        const next = prev.map((c) => {
          if (c.id !== categoryId) return c;
          const tools = [...c.tools];
          const si = tools.findIndex((t) => t.id === sourceToolId);
          const ti = tools.findIndex((t) => t.id === targetToolId);
          if (si < 0 || ti < 0) return c;
          const [removed] = tools.splice(si, 1);
          tools.splice(ti, 0, removed);
          return { ...c, tools };
        });
        persistCategories(next);
        return next;
      });
    },
    [persistCategories]
  );

  const moveToolToEnd = useCallback(
    (categoryId, toolId) => {
      setCategories((prev) => {
        const next = prev.map((c) => {
          if (c.id !== categoryId) return c;
          const tools = [...c.tools];
          const si = tools.findIndex((t) => t.id === toolId);
          if (si < 0) return c;
          const [removed] = tools.splice(si, 1);
          tools.push(removed);
          return { ...c, tools };
        });
        persistCategories(next);
        return next;
      });
    },
    [persistCategories]
  );

  const findToolWithCategory = useCallback((toolId) => {
    for (const c of categories) {
      const tool = c.tools.find((t) => t.id === toolId);
      if (tool) return { tool, category: c };
    }
    return null;
  }, [categories]);

  return {
    categories,
    sections,
    favorites,
    activeToolId,
    favoritesOnly,
    setFavoritesOnly,
    searchQuery,
    setSearchQuery,
    toggleFavorite,
    setFavoriteState,
    setActiveTool,
    editTool,
    deleteTool,
    addTool,
    addCategory,
    editCategoryName,
    reorderCategories,
    reorderTools,
    moveToolToEnd,
    findToolWithCategory,
  };
}
