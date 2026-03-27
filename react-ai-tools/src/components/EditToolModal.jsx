import { useEffect, useState } from "react";

export function EditToolModal({ isOpen, tool, isFavorite, onClose, onSave }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    if (!isOpen || !tool) return;
    setName(tool.name || "");
    setUrl(tool.url || "");
    setDescription(tool.description || "");
    setFavorite(!!isFavorite);
  }, [isOpen, tool, isFavorite]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !tool) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name,
      url,
      description,
      favorite,
    });
  };

  return (
    <div className="modal-backdrop modal-backdrop--light" onClick={onClose}>
      <section
        className="modal modal--edit"
        role="dialog"
        aria-modal="true"
        aria-label="도구 편집"
        onClick={(ev) => ev.stopPropagation()}
      >
        <header className="modal__header modal__header--edit">
          <div>
            <h3 className="modal__title modal__title--edit">도구 편집</h3>
            <p className="modal__subtitle modal__subtitle--edit">도구의 이름, URL, 설명을 변경할 수 있습니다.</p>
          </div>
          <button type="button" className="icon-btn icon-btn--ghost modal__close--light" aria-label="닫기" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal__form modal__form--edit">
          <div className="modal__row">
            <label className="modal__row-label" htmlFor="edit-tool-name">
              이름
            </label>
            <input
              id="edit-tool-name"
              className="modal__input--edit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="modal__row">
            <label className="modal__row-label" htmlFor="edit-tool-url">
              URL
            </label>
            <input
              id="edit-tool-url"
              className="modal__input--edit"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <div className="modal__row">
            <label className="modal__row-label" htmlFor="edit-tool-desc">
              설명
            </label>
            <input
              id="edit-tool-desc"
              className="modal__input--edit"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="OpenAI의 대화형 AI"
            />
          </div>
          <div className="modal__row modal__row--fav">
            <span className="modal__row-label">즐겨찾기</span>
            <button
              type="button"
              className={`edit-fav-btn${favorite ? " edit-fav-btn--on" : ""}`}
              aria-pressed={favorite}
              aria-label="즐겨찾기"
              onClick={() => setFavorite((v) => !v)}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          </div>
          <div className="modal__actions modal__actions--edit">
            <button type="submit" className="btn btn--save">
              저장
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
