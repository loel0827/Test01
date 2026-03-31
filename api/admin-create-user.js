const { createClient } = require("@supabase/supabase-js");

function env(name, ...alts) {
  for (const n of [name, ...alts]) {
    const v = process.env[n];
    if (v) return v;
  }
  return "";
}

function displayIdToEmail(rawId) {
  const id = String(rawId ?? "")
    .trim()
    .toLowerCase();
  const safe = id.replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_");
  if (!safe) throw new Error("INVALID_ID");
  return `${safe}@shortcut.internal`;
}

function isValidDisplayId(s) {
  const t = String(s ?? "").trim();
  return t.length >= 1 && t.length <= 32 && /^[a-zA-Z0-9._-]+$/.test(t);
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const supabaseUrl = env("SUPABASE_URL", "VITE_SUPABASE_URL");
  const anonKey = env("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceKey) {
    res.status(500).json({ ok: false, error: "Server misconfigured (URL / anon / service role)" });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ ok: false, error: "Invalid JSON" });
      return;
    }
  }

  const displayIdRaw = body?.displayId;
  const password = body?.password;
  const makeAdmin = body?.role === "admin";

  if (!isValidDisplayId(displayIdRaw)) {
    res.status(400).json({ ok: false, error: "아이디는 영문·숫자·._- 만 1~32자" });
    return;
  }
  const displayId = String(displayIdRaw).trim();
  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ ok: false, error: "비밀번호 6자 이상" });
    return;
  }

  let email;
  try {
    email = displayIdToEmail(displayId);
  } catch {
    res.status(400).json({ ok: false, error: "Invalid id" });
    return;
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser(authHeader.slice(7));
  if (userErr || !user) {
    res.status(401).json({ ok: false, error: "Invalid session" });
    return;
  }

  const { data: me, error: profErr } = await userClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profErr || me?.role !== "admin") {
    res.status(403).json({ ok: false, error: "Forbidden" });
    return;
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_id: displayId },
  });

  if (createErr) {
    res.status(400).json({ ok: false, error: createErr.message });
    return;
  }

  const newId = created?.user?.id;
  if (makeAdmin && newId) {
    const { error: upErr } = await admin.from("profiles").update({ role: "admin" }).eq("id", newId);
    if (upErr) {
      res.status(500).json({ ok: false, error: upErr.message });
      return;
    }
  }

  res.status(200).json({ ok: true, userId: newId });
};
