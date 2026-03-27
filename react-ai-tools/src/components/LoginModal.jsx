import { useState } from "react";

export function LoginModal({ isOpen, onClose, onLogin }) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const ok = onLogin(id, password);
    if (ok) {
      setId("");
      setPassword("");
      onClose();
    } else {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  const handleClose = () => {
    setError("");
    onClose();
  };

  return (
    <div className="login-modal-overlay" role="presentation" onClick={handleClose}>
      <div className="login-modal" role="dialog" aria-labelledby="login-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="login-modal__head">
          <h2 id="login-modal-title" className="login-modal__title">
            로그인
          </h2>
          <button type="button" className="icon-btn icon-btn--ghost" aria-label="닫기" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
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
              placeholder="아이디"
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
              autoComplete="current-password"
              placeholder="비밀번호"
              required
            />
          </label>
          {error ? <p className="login-modal__error">{error}</p> : null}
          <div className="login-modal__actions">
            <button type="button" className="login-modal__btn login-modal__btn--ghost" onClick={handleClose}>
              취소
            </button>
            <button type="submit" className="login-modal__btn login-modal__btn--primary">
              로그인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
