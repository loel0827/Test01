const TRANSPARENT_GIF =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

let ghostEl = null;
let offX = 0;
let offY = 0;

function removeGhost() {
  if (ghostEl) {
    ghostEl.remove();
    ghostEl = null;
  }
}

function onDrag(e) {
  if (!ghostEl) return;
  if (e.clientX === 0 && e.clientY === 0) return;
  ghostEl.style.left = `${e.clientX - offX}px`;
  ghostEl.style.top = `${e.clientY - offY}px`;
}

function onDragEnd() {
  document.removeEventListener("drag", onDrag, true);
  document.removeEventListener("dragend", onDragEnd, true);
  removeGhost();
}

/**
 * @param {import("react").DragEvent} e
 * @param {HTMLElement | null} sourceEl
 * @param {{ width?: number; extraClass?: string }} [opts]
 */
export function attachFloatingDragGhost(e, sourceEl, opts = {}) {
  if (!sourceEl) return;
  removeGhost();
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
  offX = e.clientX - rect.left;
  offY = e.clientY - rect.top;
  clone.style.left = `${e.clientX - offX}px`;
  clone.style.top = `${e.clientY - offY}px`;
  ghostEl = clone;

  const img = new Image();
  img.src = TRANSPARENT_GIF;
  e.dataTransfer.setDragImage(img, 0, 0);

  document.addEventListener("drag", onDrag, true);
  document.addEventListener("dragend", onDragEnd, true);
}
