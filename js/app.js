const { categories, faviconUrl } = window.AI_TOOLS_DATA;

const STORAGE_CATEGORIES = "ai-tools-categories";
const STORAGE_FAVS = "ai-tools-favorites";
const STORAGE_ACTIVE = "ai-tools-active-tool";

const categoryIcons = {
  agent: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  image: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`,
  video: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 9l5 3-5 3V9z"/></svg>`,
  voice: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>`,
  music: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  edit: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21v-7M4 10v-3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"/></svg>`,
  business: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M2 13h20"/></svg>`,
};

function hydrateCategories() {
  try {
    const raw = localStorage.getItem(STORAGE_CATEGORIES);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    categories.length = 0;
    parsed.forEach((c) => categories.push(c));
  } catch {
    /* ignore */
  }
}

function persistCategories() {
  try {
    localStorage.setItem(STORAGE_CATEGORIES, JSON.stringify(categories));
  } catch {
    /* ignore */
  }
}

const categoryDefaultsSnapshot = JSON.parse(JSON.stringify(categories));
const defaultDescriptionById = {};
categoryDefaultsSnapshot.forEach((c) =>
  c.tools.forEach((t) => {
    if (t.description?.trim()) defaultDescriptionById[t.id] = t.description.trim();
  })
);
hydrateCategories();
if (localStorage.getItem(STORAGE_CATEGORIES)) {
  const existingIds = new Set(categories.map((c) => c.id));
  let appended = false;
  categoryDefaultsSnapshot.forEach((c) => {
    if (!existingIds.has(c.id)) {
      categories.push(JSON.parse(JSON.stringify(c)));
      existingIds.add(c.id);
      appended = true;
    }
  });
  if (appended) persistCategories();
}
let mergedDesc = false;
categories.forEach((c) =>
  c.tools.forEach((t) => {
    if (!t.description?.trim() && defaultDescriptionById[t.id]) {
      t.description = defaultDescriptionById[t.id];
      mergedDesc = true;
    }
  })
);
if (mergedDesc) persistCategories();

function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_FAVS);
    if (!raw) {
      const initial = new Set();
      categories.forEach((c) =>
        c.tools.forEach((t) => {
          if (t.defaultFav) initial.add(t.id);
        })
      );
      return initial;
    }
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveFavorites(set) {
  localStorage.setItem(STORAGE_FAVS, JSON.stringify([...set]));
}

function loadActiveToolId() {
  return localStorage.getItem(STORAGE_ACTIVE) || "chatgpt";
}

function saveActiveToolId(id) {
  localStorage.setItem(STORAGE_ACTIVE, id);
}

let favorites = loadFavorites();
let activeToolId = loadActiveToolId();
let favoritesOnly = false;
let searchQuery = "";

const main = document.getElementById("main");
const tplCategory = document.getElementById("tpl-category");
const tplCard = document.getElementById("tpl-card");
const tplAdd = document.getElementById("tpl-add-card");
const btnFavorites = document.getElementById("btnFavorites");
const searchInput = document.getElementById("searchInput");
const btnAddCategory = document.getElementById("btnAddCategory");
const addToolModal = document.getElementById("addToolModal");
const addToolForm = document.getElementById("addToolForm");
const modalCategoryName = document.getElementById("modalCategoryName");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const editToolModal = document.getElementById("editToolModal");
const editToolForm = document.getElementById("editToolForm");
const editModalCloseBtn = document.getElementById("editModalCloseBtn");
const editFavoriteBtn = document.getElementById("editFavoriteBtn");

let pendingAddCategoryId = "";
let pendingEditCategoryId = "";
let pendingEditToolId = "";

function openAddToolModal(categoryId, categoryName) {
  pendingAddCategoryId = categoryId;
  modalCategoryName.textContent = categoryName;
  addToolForm.reset();
  addToolModal.hidden = false;
}

function closeAddToolModal() {
  pendingAddCategoryId = "";
  addToolModal.hidden = true;
}

function openEditToolModal(categoryId, tool) {
  pendingEditCategoryId = categoryId;
  pendingEditToolId = tool.id;
  editToolForm.elements.name.value = tool.name;
  editToolForm.elements.url.value = tool.url;
  editToolForm.elements.description.value = tool.description || "";
  const fav = favorites.has(tool.id);
  editFavoriteBtn.setAttribute("aria-pressed", String(fav));
  editFavoriteBtn.classList.toggle("edit-fav-btn--on", fav);
  editToolModal.hidden = false;
}

function closeEditToolModal() {
  pendingEditCategoryId = "";
  pendingEditToolId = "";
  editToolModal.hidden = true;
}

function normalize(s) {
  return s.toLowerCase().trim();
}

function matchesSearch(tool, catName) {
  if (!searchQuery) return true;
  const q = normalize(searchQuery);
  return (
    normalize(tool.name).includes(q) ||
    normalize(catName).includes(q) ||
    normalize(tool.url).includes(q) ||
    normalize(tool.description || "").includes(q)
  );
}

function reorderCategories(sourceId, targetId) {
  if (sourceId === targetId) return;
  const si = categories.findIndex((c) => c.id === sourceId);
  const ti = categories.findIndex((c) => c.id === targetId);
  if (si < 0 || ti < 0) return;
  const removed = categories[si];
  const next = categories.filter((c) => c.id !== sourceId);
  const insertAt = next.findIndex((c) => c.id === targetId);
  if (insertAt >= 0) next.splice(insertAt, 0, removed);
  else next.push(removed);
  categories.length = 0;
  next.forEach((c) => categories.push(c));
  persistCategories();
  render();
}

function reorderToolsInCategory(categoryId, sourceToolId, targetToolId) {
  if (sourceToolId === targetToolId) return;
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return;
  const tools = cat.tools;
  const si = tools.findIndex((t) => t.id === sourceToolId);
  const ti = tools.findIndex((t) => t.id === targetToolId);
  if (si < 0 || ti < 0) return;
  const [removed] = tools.splice(si, 1);
  tools.splice(ti, 0, removed);
  persistCategories();
  render();
}

function moveToolToEndInCategory(categoryId, toolId) {
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return;
  const tools = cat.tools;
  const si = tools.findIndex((t) => t.id === toolId);
  if (si < 0) return;
  const [removed] = tools.splice(si, 1);
  tools.push(removed);
  persistCategories();
  render();
}

const TRANSPARENT_GIF =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

let floatingGhostEl = null;
let ghostOffsetX = 0;
let ghostOffsetY = 0;

function removeFloatingGhost() {
  if (floatingGhostEl) {
    floatingGhostEl.remove();
    floatingGhostEl = null;
  }
}

function onFloatingGhostDrag(e) {
  if (!floatingGhostEl) return;
  if (e.clientX === 0 && e.clientY === 0) return;
  floatingGhostEl.style.left = `${e.clientX - ghostOffsetX}px`;
  floatingGhostEl.style.top = `${e.clientY - ghostOffsetY}px`;
}

function onFloatingGhostDragEnd() {
  document.removeEventListener("drag", onFloatingGhostDrag, true);
  document.removeEventListener("dragend", onFloatingGhostDragEnd, true);
  removeFloatingGhost();
}

function beginFloatingDragGhost(e, sourceEl, opts = {}) {
  if (!(sourceEl instanceof HTMLElement)) return;
  removeFloatingGhost();
  const rect = sourceEl.getBoundingClientRect();
  const w = opts.width != null ? opts.width : rect.width;
  const clone = sourceEl.cloneNode(true);
  clone.classList.add("drag-ghost-float");
  if (opts.extraClass) clone.classList.add(opts.extraClass);
  clone.style.boxSizing = "border-box";
  clone.style.width = `${w}px`;
  clone.setAttribute("aria-hidden", "true");
  clone.removeAttribute("draggable");
  clone.querySelectorAll("[draggable]").forEach((n) => n.removeAttribute("draggable"));
  document.body.appendChild(clone);
  ghostOffsetX = e.clientX - rect.left;
  ghostOffsetY = e.clientY - rect.top;
  clone.style.left = `${e.clientX - ghostOffsetX}px`;
  clone.style.top = `${e.clientY - ghostOffsetY}px`;
  floatingGhostEl = clone;

  const img = new Image();
  img.src = TRANSPARENT_GIF;
  e.dataTransfer.setDragImage(img, 0, 0);

  document.addEventListener("drag", onFloatingGhostDrag, true);
  document.addEventListener("dragend", onFloatingGhostDragEnd, true);
}

function render() {
  main.innerHTML = "";

  categories.forEach((cat) => {
    const visibleTools = cat.tools.filter((t) => {
      if (!matchesSearch(t, cat.name)) return false;
      if (favoritesOnly && !favorites.has(t.id)) return false;
      return true;
    });

    if (favoritesOnly && visibleTools.length === 0) return;

    const frag = tplCategory.content.cloneNode(true);
    const section = frag.querySelector(".category");
    section.dataset.categoryId = cat.id;
    frag.querySelector("[data-category-name]").textContent = cat.name;
    const iconHost = frag.querySelector("[data-category-icon]");
    iconHost.innerHTML = categoryIcons[cat.icon] || categoryIcons.agent;

    const categoryHead = frag.querySelector("[data-category-head]");
    categoryHead.addEventListener("dragstart", (e) => {
      if (e.target.closest("button")) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData("text/x-category-id", cat.id);
      e.dataTransfer.effectAllowed = "move";
      beginFloatingDragGhost(e, categoryHead, {
        width: section.getBoundingClientRect().width,
        extraClass: "drag-ghost-float--category-head",
      });
    });

    const dragHandle = frag.querySelector("[data-drag-handle]");
    dragHandle.addEventListener("dragstart", (e) => {
      e.stopPropagation();
      e.dataTransfer.setData("text/x-category-id", cat.id);
      e.dataTransfer.effectAllowed = "move";
      beginFloatingDragGhost(e, categoryHead, {
        width: section.getBoundingClientRect().width,
        extraClass: "drag-ghost-float--category-head",
      });
    });
    section.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });
    section.addEventListener("drop", (e) => {
      const toolId = e.dataTransfer.getData("text/x-tool-id");
      const toolSourceCat = e.dataTransfer.getData("text/x-tool-category-id");
      const draggedCategoryId = e.dataTransfer.getData("text/x-category-id");

      if (draggedCategoryId && !toolId) {
        e.preventDefault();
        e.stopPropagation();
        if (draggedCategoryId !== cat.id) reorderCategories(draggedCategoryId, cat.id);
        return;
      }

      if (toolId && toolSourceCat === cat.id) {
        const onServiceCard = e.target.closest(".tool-card:not(.tool-card--add)");
        if (!onServiceCard) {
          e.preventDefault();
          e.stopPropagation();
          moveToolToEndInCategory(cat.id, toolId);
        }
      }
    });

    frag.querySelector("[data-edit-category]").addEventListener("click", (e) => {
      e.preventDefault();
      const next = prompt("카테고리 이름", cat.name);
      if (next == null || !next.trim()) return;
      cat.name = next.trim();
      persistCategories();
      render();
    });

    const grid = frag.querySelector("[data-tools]");
    grid.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    visibleTools.forEach((tool) => {
      const cardFrag = tplCard.content.cloneNode(true);
      const article = cardFrag.querySelector(".tool-card");
      article.dataset.toolId = tool.id;
      if (tool.id === activeToolId) article.classList.add("tool-card--active");

      const toolDrag = cardFrag.querySelector("[data-tool-drag]");
      toolDrag.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/x-tool-id", tool.id);
        e.dataTransfer.setData("text/x-tool-category-id", cat.id);
        e.dataTransfer.effectAllowed = "move";
        beginFloatingDragGhost(e, article, { extraClass: "drag-ghost-float--tool-card" });
      });
      toolDrag.addEventListener("click", (e) => e.preventDefault());

      article.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });
      article.addEventListener("drop", (e) => {
        const fromId = e.dataTransfer.getData("text/x-tool-id");
        const fromCat = e.dataTransfer.getData("text/x-tool-category-id");
        if (!fromId || fromCat !== cat.id || fromId === tool.id) return;
        e.preventDefault();
        e.stopPropagation();
        reorderToolsInCategory(cat.id, fromId, tool.id);
      });

      cardFrag.querySelector("[data-name]").textContent = tool.name;
      const descWrap = cardFrag.querySelector("[data-description-wrap]");
      const descEl = cardFrag.querySelector("[data-description]");
      if (tool.description?.trim()) {
        descWrap.hidden = false;
        descEl.textContent = tool.description.trim();
      } else {
        descWrap.hidden = true;
      }
      const link = cardFrag.querySelector("[data-link]");
      link.href = tool.url;

      const img = cardFrag.querySelector("[data-logo]");
      img.src = faviconUrl(tool.domain);
      img.alt = tool.name;

      const favBtn = cardFrag.querySelector(".tool-card__fav");
      if (favorites.has(tool.id)) favBtn.classList.add("is-fav");

      favBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (favorites.has(tool.id)) favorites.delete(tool.id);
        else favorites.add(tool.id);
        saveFavorites(favorites);
        render();
      });

      cardFrag.querySelector("[data-edit]").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openEditToolModal(cat.id, tool);
      });

      cardFrag.querySelector("[data-delete]").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`"${tool.name}" 항목을 삭제할까요?`)) return;
        const idx = cat.tools.findIndex((t) => t.id === tool.id);
        if (idx !== -1) cat.tools.splice(idx, 1);
        favorites.delete(tool.id);
        saveFavorites(favorites);
        if (activeToolId === tool.id) {
          activeToolId = categories.flatMap((c) => c.tools)[0]?.id || "";
          saveActiveToolId(activeToolId);
        }
        persistCategories();
        render();
      });

      link.addEventListener("click", () => {
        activeToolId = tool.id;
        saveActiveToolId(activeToolId);
        document.querySelectorAll(".tool-card--active").forEach((el) => el.classList.remove("tool-card--active"));
        article.classList.add("tool-card--active");
      });

      grid.appendChild(cardFrag);
    });

    const addFrag = tplAdd.content.cloneNode(true);
    const addBtn = addFrag.querySelector("[data-add-tool]");
    addBtn.addEventListener("click", () => {
      openAddToolModal(cat.id, cat.name);
    });
    addBtn.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });
    addBtn.addEventListener("drop", (e) => {
      const fromId = e.dataTransfer.getData("text/x-tool-id");
      const fromCat = e.dataTransfer.getData("text/x-tool-category-id");
      if (!fromId || fromCat !== cat.id) return;
      e.preventDefault();
      e.stopPropagation();
      moveToolToEndInCategory(cat.id, fromId);
    });
    grid.appendChild(addFrag);

    main.appendChild(frag);
  });

  if (favoritesOnly && main.children.length === 0) {
    const p = document.createElement("p");
    p.className = "category--empty-hint";
    p.textContent = "즐겨찾기에 등록된 도구가 없습니다. 카드의 별 아이콘을 눌러 추가해 보세요.";
    main.appendChild(p);
  }
}

btnFavorites.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  btnFavorites.setAttribute("aria-pressed", String(favoritesOnly));
  render();
});

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value;
  render();
});

btnAddCategory.addEventListener("click", () => {
  const name = prompt("새 카테고리 이름");
  if (!name?.trim()) return;
  const id = "cat-" + Date.now();
  categories.push({
    id,
    name: name.trim(),
    icon: "agent",
    tools: [],
  });
  persistCategories();
  render();
});

modalCloseBtn.addEventListener("click", closeAddToolModal);
modalCancelBtn.addEventListener("click", closeAddToolModal);
addToolModal.addEventListener("click", (e) => {
  if (e.target === addToolModal) closeAddToolModal();
});
window.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!addToolModal.hidden) closeAddToolModal();
  if (!editToolModal.hidden) closeEditToolModal();
});
editModalCloseBtn.addEventListener("click", closeEditToolModal);
editToolModal.addEventListener("click", (e) => {
  if (e.target === editToolModal) closeEditToolModal();
});
editFavoriteBtn.addEventListener("click", () => {
  const cur = editFavoriteBtn.getAttribute("aria-pressed") === "true";
  const next = !cur;
  editFavoriteBtn.setAttribute("aria-pressed", String(next));
  editFavoriteBtn.classList.toggle("edit-fav-btn--on", next);
});
editToolForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const cat = categories.find((c) => c.id === pendingEditCategoryId);
  const tool = cat?.tools.find((t) => t.id === pendingEditToolId);
  if (!tool) return;
  tool.name = editToolForm.elements.name.value.trim() || tool.name;
  const rawUrl = editToolForm.elements.url.value.trim() || tool.url;
  const withProto = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  try {
    tool.domain = new URL(withProto).hostname.replace(/^www\./, "");
    tool.url = withProto;
  } catch {
    alert("올바른 URL을 입력해 주세요.");
    return;
  }
  tool.description = editToolForm.elements.description.value.trim();
  const favOn = editFavoriteBtn.getAttribute("aria-pressed") === "true";
  if (favOn) favorites.add(tool.id);
  else favorites.delete(tool.id);
  saveFavorites(favorites);
  persistCategories();
  closeEditToolModal();
  render();
});
addToolForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const cat = categories.find((c) => c.id === pendingAddCategoryId);
  if (!cat) return;
  const name = addToolForm.elements.name.value.trim();
  const rawUrl = addToolForm.elements.url.value.trim();
  const description = addToolForm.elements.description.value.trim();
  const withProto = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  let domain = "example.com";
  try {
    domain = new URL(withProto).hostname.replace(/^www\./, "");
  } catch {
    alert("올바른 URL을 입력해 주세요.");
    return;
  }
  const id = "custom-" + Date.now();
  cat.tools.push({ id, name, url: withProto, domain, description });
  persistCategories();
  closeAddToolModal();
  render();
});

render();
