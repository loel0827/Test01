import { useEffect, useState } from "react";

export function AddToolModal({ isOpen, categoryName, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setUrl("");
    setDescription("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name,
      url,
      description,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="AI 도구 추가"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <div>
            <h3 className="modal__title">AI 도구 추가</h3>
            <p className="modal__subtitle">{categoryName} 카테고리에 새로운 AI 도구를 추가합니다.</p>
          </div>
          <button type="button" className="icon-btn icon-btn--ghost" aria-label="닫기" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal__form">
          <label className="modal__field">
            <span>서비스 이름</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: ChatGPT"
              required
            />
          </label>
          <label className="modal__field">
            <span>서비스 URL</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
            />
          </label>
          <label className="modal__field">
            <span>서비스 설명</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="서비스에 대한 간단한 설명을 입력하세요."
              rows={4}
            />
          </label>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn btn--primary">
              추가
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
