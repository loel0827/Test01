import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getSupabase } from "../lib/supabaseClient.js";

export function AdminSettingsPage() {
  const { user, accessToken, authReady } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newId, setNewId] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [newRole, setNewRole] = useState("user");

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || user?.role !== "admin") return;
    setLoading(true);
    const { data, error } = await sb.from("profiles").select("id, display_id, role, created_at").order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setRows(data ?? []);
    setMsg("");
  }, [user?.role]);

  useEffect(() => {
    if (authReady && user?.role === "admin") load();
  }, [authReady, user?.role, load]);

  const callApi = async (path, jsonBody) => {
    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(jsonBody),
    });
    return { res, data: await res.json().catch(() => ({})) };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!accessToken) {
      setMsg("세션 토큰이 없습니다. 다시 로그인하세요.");
      return;
    }
    if (newPw !== newPw2) {
      setMsg("비밀번호가 서로 다릅니다.");
      return;
    }
    setCreating(true);
    try {
      const { res, data } = await callApi("/api/admin-create-user", {
        displayId: newId.trim(),
        password: newPw,
        role: newRole,
      });
      if (!res.ok || !data.ok) {
        setMsg(data.error || `추가 실패 (${res.status}). Vercel에 SUPABASE_SERVICE_ROLE_KEY 설정 여부를 확인하세요.`);
        return;
      }
      setNewId("");
      setNewPw("");
      setNewPw2("");
      setNewRole("user");
      await load();
    } catch (err) {
      setMsg(String(err?.message || err));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (targetId, displayId) => {
    if (!accessToken) {
      setMsg("세션 토큰이 없습니다. 다시 로그인하세요.");
      return;
    }
    if (!window.confirm(`계정 「${displayId}」을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setDeleting(targetId);
    setMsg("");
    try {
      const { res, data } = await callApi("/api/admin-delete-user", { userId: targetId });
      if (!res.ok || !data.ok) {
        setMsg(data.error || `삭제 실패 (${res.status}). Vercel에 SUPABASE_SERVICE_ROLE_KEY 가 있는지 확인하세요.`);
        return;
      }
      await load();
    } catch (e) {
      setMsg(String(e.message || e));
    } finally {
      setDeleting(null);
    }
  };

  if (!authReady) {
    return (
      <div className="admin-users">
        <p>불러오는 중…</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-users admin-settings">
      <header className="admin-users__head">
        <Link to="/" className="link-btn">
          ← 홈
        </Link>
        <h1 className="admin-users__title">환경설정</h1>
      </header>
      <p className="admin-users__note">
        계정 추가·삭제는 Vercel의 <code>/api/admin-create-user</code>, <code>/api/admin-delete-user</code>와 환경 변수{" "}
        <code>SUPABASE_SERVICE_ROLE_KEY</code>가 필요합니다. 로컬(<code>npm run dev</code>)만 사용하면 API가 없어 실패할 수 있습니다.
      </p>
      {msg ? <p className="login-modal__error admin-users__msg">{msg}</p> : null}

      <section className="admin-settings__section">
        <h2 className="admin-settings__h2">계정 추가</h2>
        <form className="admin-settings__form" onSubmit={handleCreate}>
          <label className="login-modal__label">
            아이디
            <input
              className="login-modal__input"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="예: Luna"
              autoComplete="off"
              required
            />
          </label>
          <label className="login-modal__label">
            비밀번호
            <input
              className="login-modal__input"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
          <label className="login-modal__label">
            비밀번호 확인
            <input
              className="login-modal__input"
              type="password"
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
          <label className="login-modal__label">
            역할
            <select className="login-modal__input" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              <option value="user">일반</option>
              <option value="admin">관리자</option>
            </select>
          </label>
          <button type="submit" className="login-modal__btn login-modal__btn--primary admin-settings__submit" disabled={creating}>
            {creating ? "추가 중…" : "계정 추가"}
          </button>
        </form>
      </section>

      <section className="admin-settings__section">
        <h2 className="admin-settings__h2">전체 계정</h2>
        {loading ? (
          <p>목록 불러오는 중…</p>
        ) : (
          <table className="admin-users__table">
            <thead>
              <tr>
                <th>표시 아이디</th>
                <th>역할</th>
                <th>가입일</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.display_id}</td>
                  <td>{r.role}</td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleString("ko-KR") : "—"}</td>
                  <td>
                    {r.id === user.uid ? (
                      <span className="admin-users__self">본인</span>
                    ) : (
                      <button
                        type="button"
                        className="link-btn admin-users__del"
                        disabled={deleting === r.id}
                        onClick={() => handleDelete(r.id, r.display_id)}
                      >
                        {deleting === r.id ? "삭제 중…" : "삭제"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
