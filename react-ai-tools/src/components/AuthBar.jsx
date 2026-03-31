import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { LoginModal } from "./LoginModal.jsx";

export function AuthBar({ className = "" }) {
  const { user, login, logout, signUp } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className={`auth-bar ${className}`.trim()}>
        {user ? (
          <>
            <span className="auth-bar__user" title="로그인 중">
              {user.id}
              {user.role === "admin" ? " · 관리자" : ""}
            </span>
            {user.role === "admin" ? (
              <Link to="/admin/settings" className="link-btn auth-bar__settings">
                환경설정
              </Link>
            ) : null}
            <button type="button" className="link-btn" onClick={() => logout()}>
              로그아웃
            </button>
          </>
        ) : (
          <>
            <button type="button" className="link-btn" onClick={() => setModalOpen(true)}>
              로그인
            </button>
          </>
        )}
      </div>
      <LoginModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onLogin={login}
        onSignUp={signUp}
      />
    </>
  );
}
