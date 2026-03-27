import { useRef } from "react";
import { CategoryIcon } from "./CategoryIcon.jsx";
import { ToolCard } from "./ToolCard.jsx";
import { attachFloatingDragGhost } from "../utils/dragGhost.js";

export function CategorySection({
  category,
  activeToolId,
  favorites,
  onFavorite,
  onEdit,
  onDelete,
  onOpen,
  onAddTool,
  onEditCategory,
  onReorderCategories,
  onReorderTools,
  onMoveToolToEnd,
}) {
  const sectionRef = useRef(null);
  const headRef = useRef(null);

  return (
    <section
      ref={sectionRef}
      className="category"
      data-category-id={category.id}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        const toolId = e.dataTransfer.getData("text/x-tool-id");
        const toolSourceCat = e.dataTransfer.getData("text/x-tool-category-id");
        const draggedCategoryId = e.dataTransfer.getData("text/x-category-id");

        // 카테고리 전체 순서: 도구 페이로드가 없을 때만 (헤더/그리드/카드 위 모두 드롭 가능)
        if (draggedCategoryId && !toolId) {
          e.preventDefault();
          e.stopPropagation();
          if (draggedCategoryId !== category.id) {
            onReorderCategories(draggedCategoryId, category.id);
          }
          return;
        }

        // 같은 카테고리 안 도구: 카드가 처리하지 않은 영역(그리드 여백 등) → 맨 끝으로
        if (toolId && toolSourceCat === category.id) {
          const onServiceCard = e.target.closest(".tool-card:not(.tool-card--add)");
          if (!onServiceCard) {
            e.preventDefault();
            e.stopPropagation();
            onMoveToolToEnd(category.id, toolId);
          }
        }
      }}
    >
      <div
        ref={headRef}
        className="category__head"
        draggable
        onDragStart={(e) => {
          if (e.target.closest("button")) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData("text/x-category-id", category.id);
          e.dataTransfer.effectAllowed = "move";
          attachFloatingDragGhost(e, headRef.current, {
            width: sectionRef.current?.getBoundingClientRect().width,
            extraClass: "drag-ghost-float--category-head",
          });
        }}
      >
        <button
          type="button"
          className="category__drag"
          draggable
          aria-label="카테고리 순서 변경"
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData("text/x-category-id", category.id);
            e.dataTransfer.effectAllowed = "move";
            attachFloatingDragGhost(e, headRef.current, {
              width: sectionRef.current?.getBoundingClientRect().width,
              extraClass: "drag-ghost-float--category-head",
            });
          }}
        >
          ⋮⋮
        </button>
        <h2 className="category__title">
          <CategoryIcon type={category.icon} />
          <span className="category__hash">#</span>
          <span className="category__name-pill">
            <span>{category.name}</span>
          </span>
          <button
            type="button"
            className="icon-btn icon-btn--ghost category__edit-cat"
            draggable={false}
            title="카테고리 이름 편집"
            aria-label="카테고리 편집"
            onClick={() => {
              const next = window.prompt("카테고리 이름", category.name);
              if (next == null || !next.trim()) return;
              onEditCategory(category.id, next);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </h2>
      </div>
      <div
        className="category__grid"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
      >
        {category.tools.map((tool) => (
          <ToolCard
            key={tool.id}
            categoryId={category.id}
            tool={tool}
            isActive={tool.id === activeToolId}
            isFav={favorites.has(tool.id)}
            onFavorite={() => onFavorite(tool.id)}
            onEdit={() => onEdit(category.id, tool)}
            onDelete={() => onDelete(category.id, tool)}
            onOpen={() => onOpen(tool.id)}
            onReorderWithTarget={(fromId, toId) => onReorderTools(category.id, fromId, toId)}
          />
        ))}
        <button
          type="button"
          className="tool-card tool-card--add"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            const fromId = e.dataTransfer.getData("text/x-tool-id");
            const fromCat = e.dataTransfer.getData("text/x-tool-category-id");
            if (!fromId || fromCat !== category.id) return;
            e.preventDefault();
            e.stopPropagation();
            onMoveToolToEnd(category.id, fromId);
          }}
          onClick={() => onAddTool(category.id, category.name)}
        >
          <span className="tool-card--add__plus">+</span>
          <span className="tool-card--add__label">새 도구 추가</span>
        </button>
      </div>
    </section>
  );
}
