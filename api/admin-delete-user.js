const { createClient } = require("@supabase/supabase-js");

function env(name, ...alts) {
  for (const n of [name, ...alts]) {
    const v = process.env[n];
    if (v) return v;
  }
  return "";
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

  const targetId = body?.userId;
  if (!targetId || typeof targetId !== "string") {
    res.status(400).json({ ok: false, error: "Missing userId" });
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

  if (targetId === user.id) {
    res.status(400).json({ ok: false, error: "Cannot delete self" });
    return;
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
  if (delErr) {
    res.status(500).json({ ok: false, error: delErr.message });
    return;
  }

  res.status(200).json({ ok: true });
};
