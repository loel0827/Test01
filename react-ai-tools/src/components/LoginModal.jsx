import { useState } from "react";

export function LoginModal({ isOpen, onClose, onLogin, onSignUp }) {
  const [mode, setMode] = useState("login");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setId("");
    setPassword("");
    setPassword2("");
    setError("");
  };

  const handleClose = () => {
    resetForm();
    setMode("login");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (mode === "signup") {
      if (password !== password2) {
        setError("비밀번호가 서로 다릅니다.");
        return;
      }
      setBusy(true);
      try {
        const res = await onSignUp(id, password);
        if (res.ok) {
          resetForm();
          if (res.needsConfirm) {
            setError("");
            window.alert("가입되었습니다. Supabase에서 이메일 확인을 켜 두었다면 메일을 확인한 뒤 로그인하세요.");
          }
          onClose();
        } else {
          setError(res.error || "가입에 실패했습니다.");
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      const res = await onLogin(id, password);
      if (res.ok) {
        resetForm();
        onClose();
      } else {
        setError(res.error || "아이디 또는 비밀번호가 올바르지 않습니다.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-modal-overlay" role="presentation" onClick={handleClose}>
      <div className="login-modal" role="dialog" aria-labelledby="login-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="login-modal__head">
          <h2 id="login-modal-title" className="login-modal__title">
            {mode === "login" ? "로그인" : "회원가입"}
          </h2>
          <button type="button" className="icon-btn icon-btn--ghost" aria-label="닫기" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="login-modal__tabs">
          <button
            type="button"
            className={`login-modal__tab${mode === "login" ? " login-modal__tab--active" : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            로그인
          </button>
          <button
            type="button"
            className={`login-modal__tab${mode === "signup" ? " login-modal__tab--active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
          >
            회원가입
          </button>
        </div>
        <form className="login-modal__form" onSubmit={handleSubmit}>
          <label className="login-modal__label">
            아이디
            <input
              className="login-modal__input"
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoComplete="username"
              placeholder="예: Loel, Luna"
              required
            />
          </label>
          <label className="login-modal__label">
            비밀번호
            <input
              className="login-modal__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="비밀번호"
              required
              minLength={mode === "signup" ? 6 : undefined}
            />
          </label>
          {mode === "signup" ? (
            <label className="login-modal__label">
              비밀번호 확인
              <input
                className="login-modal__input"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                placeholder="비밀번호 다시 입력"
                required
                minLength={6}
              />
            </label>
          ) : null}
          {error ? <p className="login-modal__error">{error}</p> : null}
          <p className="login-modal__hint">
            내부적으로 <code>@shortcut.internal</code> 이메일로 로그인됩니다. Loel 계정은 이메일{" "}
            <code>loel@shortcut.internal</code> 로 만듭니다.
          </p>
          <div className="login-modal__actions">
            <button type="button" className="login-modal__btn login-modal__btn--ghost" onClick={handleClose} disabled={busy}>
              취소
            </button>
            <button type="submit" className="login-modal__btn login-modal__btn--primary" disabled={busy}>
              {busy ? "처리 중…" : mode === "login" ? "로그인" : "가입"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
