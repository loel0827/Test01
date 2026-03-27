import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { LoginModal } from "./LoginModal.jsx";

export function AuthBar({ className = "" }) {
  const { user, login, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className={`auth-bar ${className}`.trim()}>
        {user ? (
          <>
            <span className="auth-bar__user" title="로그인 중">
              {user.id}
            </span>
            <button type="button" className="link-btn" onClick={logout}>
              로그아웃
            </button>
          </>
        ) : (
          <button type="button" className="link-btn" onClick={() => setModalOpen(true)}>
            로그인
          </button>
        )}
      </div>
      <LoginModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onLogin={login} />
    </>
  );
}
