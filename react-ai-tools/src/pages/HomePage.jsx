import { useState } from "react";
import { Header } from "../components/Header.jsx";
import { CategorySection } from "../components/CategorySection.jsx";
import { AddToolModal } from "../components/AddToolModal.jsx";
import { EditToolModal } from "../components/EditToolModal.jsx";
import { useTools } from "../context/ToolsContext.jsx";

export function HomePage() {
  const [addModal, setAddModal] = useState({ open: false, categoryId: "", categoryName: "" });
  const [editModal, setEditModal] = useState({ open: false, categoryId: "", tool: null });

  const {
    sections,
    favorites,
    activeToolId,
    favoritesOnly,
    setFavoritesOnly,
    searchQuery,
    setSearchQuery,
    toggleFavorite,
    setFavoriteState,
    setActiveTool,
    editTool,
    deleteTool,
    addTool,
    addCategory,
    editCategoryName,
    reorderCategories,
    reorderTools,
    moveToolToEnd,
  } = useTools();

  const handleEdit = (categoryId, tool) => {
    setEditModal({ open: true, categoryId, tool });
  };

  const handleEditSave = ({ name, url, description, favorite }) => {
    const { categoryId, tool } = editModal;
    if (!tool) return;
    editTool(categoryId, tool.id, name, url, description);
    setFavoriteState(tool.id, !!favorite);
    setEditModal({ open: false, categoryId: "", tool: null });
  };

  const handleDelete = (categoryId, tool) => {
    if (!window.confirm(`"${tool.name}" 항목을 삭제할까요?`)) return;
    deleteTool(categoryId, tool.id);
  };

  const handleAddTool = (categoryId, categoryName) => {
    setAddModal({ open: true, categoryId, categoryName });
  };

  const handleAddToolSubmit = ({ name, url, description }) => {
    if (!name?.trim() || !url?.trim()) return;
    const ok = addTool(addModal.categoryId, name, url, description || "");
    if (!ok) {
      window.alert("올바른 URL을 입력해 주세요.");
      return;
    }
    setAddModal({ open: false, categoryId: "", categoryName: "" });
  };

  const handleAddCategory = () => {
    const name = window.prompt("새 카테고리 이름");
    if (!name?.trim()) return;
    addCategory(name);
  };

  return (
    <>
      <Header
        favoritesOnly={favoritesOnly}
        onToggleFavorites={() => setFavoritesOnly((v) => !v)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddCategory={handleAddCategory}
      />
      <main className="main">
        {favoritesOnly && sections.length === 0 ? (
          <p className="category--empty-hint">
            즐겨찾기에 등록된 도구가 없습니다. 카드의 별 아이콘을 눌러 추가해 보세요.
          </p>
        ) : (
          sections.map((cat) => (
            <CategorySection
              key={cat.id}
              category={cat}
              activeToolId={activeToolId}
              favorites={favorites}
              onFavorite={toggleFavorite}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onOpen={setActiveTool}
              onAddTool={handleAddTool}
              onEditCategory={editCategoryName}
              onReorderCategories={reorderCategories}
              onReorderTools={reorderTools}
              onMoveToolToEnd={moveToolToEnd}
            />
          ))
        )}
      </main>
      <AddToolModal
        isOpen={addModal.open}
        categoryName={addModal.categoryName}
        onClose={() => setAddModal({ open: false, categoryId: "", categoryName: "" })}
        onSubmit={handleAddToolSubmit}
      />
      <EditToolModal
        isOpen={editModal.open}
        tool={editModal.tool}
        isFavorite={editModal.tool ? favorites.has(editModal.tool.id) : false}
        onClose={() => setEditModal({ open: false, categoryId: "", tool: null })}
        onSave={handleEditSave}
      />
    </>
  );
}
