/** Web Request/Response API — Node 기본 런타임에서는 req.json()이 없어 멈출 수 있음 */
export const config = { runtime: "edge" };

const BOARD_KEY = "ai-tools-board-posts-shared-v2";

const KV_FETCH_MS = 12_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function getKvConfig() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function kvCommand(command) {
  const cfg = getKvConfig();
  if (!cfg) throw new Error("KV_NOT_CONFIGURED");
  const ac = typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(KV_FETCH_MS) : undefined;
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    signal: ac,
  });
  if (!res.ok) throw new Error(`KV_HTTP_${res.status}`);
  const payload = await res.json();
  if (payload?.error) throw new Error(`KV_ERR_${payload.error}`);
  return payload?.result;
}

function normalizeBoardRow(row) {
  if (!row || typeof row !== "object") return { service: [], tutorial: [] };
  return {
    service: Array.isArray(row.service) ? row.service : [],
    tutorial: Array.isArray(row.tutorial) ? row.tutorial : [],
  };
}

function normalizeAllData(all) {
  if (!all || typeof all !== "object" || Array.isArray(all)) return {};
  const out = {};
  for (const toolId of Object.keys(all)) {
    out[toolId] = normalizeBoardRow(all[toolId]);
  }
  return out;
}

async function readAll() {
  const raw = await kvCommand(["GET", BOARD_KEY]);
  if (!raw) return {};
  try {
    return normalizeAllData(JSON.parse(raw));
  } catch {
    return {};
  }
}

async function writeAll(all) {
  await kvCommand(["SET", BOARD_KEY, JSON.stringify(normalizeAllData(all))]);
}

function readBody(req) {
  return req.json().catch(() => ({}));
}

export default async function handler(req) {
  try {
    if (!getKvConfig()) {
      return json(
        {
          ok: false,
          error: "KV_NOT_CONFIGURED",
          message: "Vercel KV environment variables are missing.",
        },
        503
      );
    }

    if (req.method === "GET") {
      const toolId = new URL(req.url).searchParams.get("toolId") || "";
      if (!toolId) return json({ ok: false, error: "toolId is required" }, 400);
      const all = await readAll();
      const boards = normalizeBoardRow(all[toolId]);
      return json({ ok: true, boards });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const toolId = String(body.toolId || "").trim();
      const board = body.board === "tutorial" ? "tutorial" : "service";
      const title = String(body.title || "").trim();
      const content = String(body.body || "").trim();
      const author = body.author ? String(body.author).trim() : null;
      if (!toolId || !title) return json({ ok: false, error: "toolId and title are required" }, 400);

      const all = await readAll();
      const row = normalizeBoardRow(all[toolId]);
      const post = {
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title,
        body: content,
        createdAt: Date.now(),
        author: author || null,
      };
      row[board].push(post);
      all[toolId] = row;
      await writeAll(all);
      return json({ ok: true, post });
    }

    if (req.method === "DELETE") {
      const body = await readBody(req);
      const toolId = String(body.toolId || "").trim();
      const board = body.board === "tutorial" ? "tutorial" : "service";
      const postId = String(body.postId || "").trim();
      if (!toolId || !postId) return json({ ok: false, error: "toolId and postId are required" }, 400);

      const all = await readAll();
      const row = normalizeBoardRow(all[toolId]);
      row[board] = row[board].filter((p) => p?.id !== postId);
      all[toolId] = row;
      await writeAll(all);
      return json({ ok: true });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500);
  }
}
