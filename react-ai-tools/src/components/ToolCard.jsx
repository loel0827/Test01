import { useRef } from "react";
import { Link } from "react-router-dom";
import { faviconUrl } from "../data/categories.js";
import { attachFloatingDragGhost } from "../utils/dragGhost.js";

export function ToolCard({
  categoryId,
  tool,
  isActive,
  isFav,
  onFavorite,
  onEdit,
  onDelete,
  onOpen,
  onReorderWithTarget,
}) {
  const articleRef = useRef(null);

  return (
    <article
      ref={articleRef}
      className={`tool-card${isActive ? " tool-card--active" : ""}`}
      data-tool-id={tool.id}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        const fromId = e.dataTransfer.getData("text/x-tool-id");
        const fromCat = e.dataTransfer.getData("text/x-tool-category-id");
        if (!fromId || fromCat !== categoryId || fromId === tool.id) return;
        e.preventDefault();
        e.stopPropagation();
        onReorderWithTarget(fromId, tool.id);
      }}
    >
      <div className="tool-card__row">
        <button
          type="button"
          className="tool-card__drag"
          draggable
          aria-label="순서 변경"
          title="드래그하여 순서 변경"
          onDragStart={(e) => {
            e.dataTransfer.setData("text/x-tool-id", tool.id);
            e.dataTransfer.setData("text/x-tool-category-id", categoryId);
            e.dataTransfer.effectAllowed = "move";
            attachFloatingDragGhost(e, articleRef.current, { extraClass: "drag-ghost-float--tool-card" });
          }}
          onClick={(e) => e.preventDefault()}
        >
          ⋮⋮
        </button>
        <div className="tool-card__name-wrap">
          <Link
            to={`/service/${tool.id}`}
            className="tool-card__name tool-card__name-link"
            title="서비스 게시판"
            onClick={(e) => e.stopPropagation()}
          >
            {tool.name}
          </Link>
          {tool.description ? (
            <span className="tooltip">
              <button type="button" className="tooltip__trigger" aria-label="서비스 설명">
                i
              </button>
              <span className="tooltip__content">{tool.description}</span>
            </span>
          ) : null}
        </div>
        <div className="tool-card__actions">
          <button
            type="button"
            className={`icon-btn icon-btn--ghost tool-card__fav${isFav ? " is-fav" : ""}`}
            title="즐겨찾기"
            aria-label="즐겨찾기"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavorite();
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--ghost"
            title="편집"
            aria-label="편집"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--ghost"
            title="삭제"
            aria-label="삭제"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
            </svg>
          </button>
        </div>
      </div>
      <a
        className="tool-card__body"
        href={tool.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onOpen()}
      >
        <div className="tool-card__circle">
          <img src={faviconUrl(tool.domain)} alt={tool.name} className="tool-card__logo" loading="lazy" />
        </div>
      </a>
    </article>
  );
}
