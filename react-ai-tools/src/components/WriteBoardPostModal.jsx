import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export function WriteBoardPostModal({ isOpen, onClose, onSubmit, initialBoard = "service" }) {
  const { user } = useAuth();
  const [board, setBoard] = useState(initialBoard);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (isOpen) {
      setBoard(initialBoard);
      setTitle("");
      setBody("");
    }
  }, [isOpen, initialBoard]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const ok = onSubmit(board, { title, body });
    if (ok) {
      setTitle("");
      setBody("");
      setBoard(initialBoard);
      onClose();
    }
  };

  const handleClose = () => {
    setTitle("");
    setBody("");
    onClose();
  };

  return (
    <div className="board-modal-overlay" role="presentation" onClick={handleClose}>
      <div
        className="board-modal"
        role="dialog"
        aria-labelledby="board-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="board-modal__head">
          <h2 id="board-modal-title" className="board-modal__title">
            글 작성
          </h2>
          <button type="button" className="board-modal__close icon-btn icon-btn--ghost" aria-label="닫기" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form className="board-modal__form" onSubmit={handleSubmit}>
          <p className="board-modal__hint">
            {user
              ? `작성자는 「${user.id}」로 표시됩니다. 모든 사용자에게 보입니다.`
              : "비로그인 상태에서는 익명으로 등록됩니다. 모든 사용자에게 보입니다."}
          </p>
          <fieldset className="board-modal__boards">
            <legend className="visually-hidden">게시판 선택</legend>
            <label className="board-modal__radio">
              <input type="radio" name="board" value="service" checked={board === "service"} onChange={() => setBoard("service")} />
              서비스 설명
            </label>
            <label className="board-modal__radio">
              <input type="radio" name="board" value="tutorial" checked={board === "tutorial"} onChange={() => setBoard("tutorial")} />
              튜토리얼 / 사용법
            </label>
          </fieldset>
          <label className="board-modal__label">
            제목
            <input
              className="board-modal__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              required
              maxLength={200}
            />
          </label>
          <label className="board-modal__label">
            내용
            <textarea
              className="board-modal__textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={6}
              maxLength={8000}
            />
          </label>
          <div className="board-modal__actions">
            <button type="button" className="board-modal__btn board-modal__btn--ghost" onClick={handleClose}>
              취소
            </button>
            <button type="submit" className="board-modal__btn board-modal__btn--primary">
              등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
