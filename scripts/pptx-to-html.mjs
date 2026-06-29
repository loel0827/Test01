/**
 * PPTX -> HTML presentation (PNG slides + embedded video)
 * Usage: node scripts/pptx-to-html.mjs <input.pptx> [outputDir]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import AdmZip from "adm-zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SW = 9144000;
const SH = 5143500;

function pct(n, total) {
  return (Number(n) / total) * 100;
}

function parseRels(relsPath) {
  const map = {};
  if (!fs.existsSync(relsPath)) return map;
  const xml = fs.readFileSync(relsPath, "utf8");
  for (const m of xml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    map[m[1]] = m[2].replace(/^\.\.\//, "");
  }
  return map;
}

function slideTitle(slideXml) {
  const texts = [...slideXml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
  const big = texts.find(
    (t) => t.length > 2 && !/^\d{2}$/.test(t) && !/^\d{2}\s\/\s\d{2}$/.test(t)
  );
  return big || texts[0] || "Slide";
}

function getSlideOrder(presXml, presRels) {
  const ids = [...presXml.matchAll(/<p:sldId[^>]*r:id="([^"]+)"/g)].map((m) => m[1]);
  return ids.map((id) => path.basename(presRels[id], ".xml"));
}

function detectVideo(slideXml, rels) {
  for (const block of slideXml.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g)) {
    const pic = block[1];
    const video = pic.match(/<a:videoFile r:link="([^"]+)"/);
    if (!video) continue;
    const vTarget = rels[video[1]];
    if (!vTarget) continue;
    const off = pic.match(/<a:off x="(-?\d+)" y="(-?\d+)"/);
    const ext = pic.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
    const poster = pic.match(/<a:blip r:embed="([^"]+)"/);
    const posterTarget = poster ? rels[poster[1]] : null;
    return {
      src: path.basename(vTarget),
      poster: posterTarget ? path.basename(posterTarget) : null,
      box:
        off && ext
          ? {
              left: pct(off[1], SW),
              top: pct(off[2], SH),
              width: pct(ext[1], SW),
              height: pct(ext[2], SH),
            }
          : { left: 0, top: 0, width: 100, height: 100 },
    };
  }
  return null;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function exportPngSlides(pptxPath, outDir) {
  const ps1 = path.join(__dirname, "pptx-export-png.ps1");
  const result = spawnSync(
    "powershell",
    ["-ExecutionPolicy", "Bypass", "-File", ps1, "-PptxPath", pptxPath, "-OutDir", outDir],
    { encoding: "utf8", timeout: 300000 }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "PowerPoint PNG export failed");
  }
  const slidesDir = path.join(outDir, "assets", "slides");
  const files = fs.readdirSync(slidesDir).filter((f) => /^slide-\d+\.png$/i.test(f));
  if (!files.length) {
    throw new Error("No slide PNG files were exported");
  }
  return files.sort();
}

function extractMedia(pptxPath, assetsDir) {
  const zip = new AdmZip(pptxPath);
  const extractDir = path.join(assetsDir, "_extract");
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(assetsDir, { recursive: true });
  zip.extractAllTo(extractDir, true);
  const mediaSrc = path.join(extractDir, "ppt/media");
  if (fs.existsSync(mediaSrc)) {
    for (const f of fs.readdirSync(mediaSrc)) {
      fs.copyFileSync(path.join(mediaSrc, f), path.join(assetsDir, f));
    }
  }
  fs.rmSync(extractDir, { recursive: true, force: true });
}

function cleanupOldLayerAssets(assetsDir) {
  if (!fs.existsSync(assetsDir)) return;
  for (const f of fs.readdirSync(assetsDir)) {
    if (/^image\d+\.png$/i.test(f)) {
      fs.unlinkSync(path.join(assetsDir, f));
    }
  }
}

function buildViewerHtml(slides, title) {
  const meta = JSON.stringify(slides);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#080808;--gold:#C9A84C;--gold-dim:#6B5520;--white:#fff;--gray:#888}
html,body{background:var(--bg);color:var(--white);font-family:Arial,sans-serif;height:100%;overflow:hidden;user-select:none}
#app{display:grid;grid-template-rows:56px 1fr 80px;grid-template-columns:220px 1fr;grid-template-areas:"logo topbar" "thumb stage" "thumb controls";height:100vh;max-height:100vh}
#logo{grid-area:logo;display:flex;align-items:center;gap:10px;padding:0 18px;border-bottom:1px solid #1e1e1e;border-right:1px solid #1e1e1e}
#logo .dot{width:8px;height:8px;border-radius:50%;background:var(--gold);box-shadow:0 0 6px var(--gold)}
#logo span{font-size:11px;letter-spacing:2px;color:var(--gold);font-weight:700;text-transform:uppercase}
#topbar{grid-area:topbar;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-bottom:1px solid #1e1e1e;position:relative;gap:16px}
#topbar-left{display:flex;align-items:center;gap:14px;min-width:0}
#slide-title{font-size:13px;color:var(--gray);letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#slide-counter{font-size:12px;color:var(--gold-dim);font-weight:700;letter-spacing:2px;flex-shrink:0}
#btn-fullscreen{font-size:12px;padding:6px 14px;flex-shrink:0}
#progress-bar{position:absolute;bottom:0;left:220px;height:2px;background:var(--gold);transition:width .4s cubic-bezier(.4,0,.2,1)}
#thumbs{grid-area:thumb;overflow-y:auto;border-right:1px solid #1e1e1e;padding:12px 10px;display:flex;flex-direction:column;gap:8px;scrollbar-width:thin}
.thumb-item{position:relative;cursor:pointer;border-radius:4px;overflow:hidden;border:1.5px solid transparent;transition:border-color .2s,transform .15s;flex-shrink:0;aspect-ratio:16/9;background:#111}
.thumb-item:hover{transform:translateX(2px);border-color:var(--gold-dim)}
.thumb-item.active{border-color:var(--gold)}
.thumb-item img{width:100%;height:100%;object-fit:cover;display:block;opacity:.85}
.thumb-num{position:absolute;top:4px;left:6px;font-size:9px;color:var(--gold);font-weight:700;z-index:2;text-shadow:0 1px 3px #000}
.thumb-label{position:absolute;bottom:0;left:0;right:0;padding:16px 6px 4px;font-size:8px;color:var(--gray);background:linear-gradient(transparent,rgba(0,0,0,.85));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:2}
#stage{grid-area:stage;display:flex;align-items:center;justify-content:center;padding:20px 24px 0;overflow:hidden}
#stage-inner{width:100%;max-width:1200px}
.slide-frame{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:#0a0a0a;border-radius:2px}
.slide-frame img.slide-png{width:100%;height:100%;object-fit:contain;display:block;background:#0a0a0a;position:relative;z-index:2}
.slide-frame img.slide-png.is-hidden{opacity:0}
.slide-frame video.slide-video{position:absolute;object-fit:cover;z-index:1;inset:0;width:100%;height:100%;display:block;background:#000}
#controls{grid-area:controls;display:flex;align-items:center;justify-content:center;gap:16px;padding:0 24px 16px;border-top:1px solid #1e1e1e;margin-left:220px}
.ctrl-btn{background:#141414;border:1px solid #333;color:var(--white);padding:10px 22px;border-radius:8px;cursor:pointer;font-size:13px;letter-spacing:1px;transition:background .15s,border-color .15s}
.ctrl-btn:hover:not(:disabled){background:#1e1e1e;border-color:var(--gold-dim)}
.ctrl-btn:disabled{opacity:.35;cursor:not-allowed}
.ctrl-btn--gold{border-color:var(--gold);color:var(--gold)}
.fs-mode{position:fixed;inset:0;z-index:10000;background:#000;display:none;flex-direction:column}
.fs-mode.is-open{display:flex}
.fs-header{height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid #222;flex-shrink:0;gap:12px}
.fs-header-title{font-size:13px;color:var(--gray);letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fs-header-right{display:flex;align-items:center;gap:12px;flex-shrink:0}
.fs-counter{font-size:12px;color:var(--gold-dim);font-weight:700;letter-spacing:2px}
.fs-body{flex:1;display:flex;align-items:center;justify-content:center;min-height:0;position:relative;padding:8px 64px}
.fs-stage{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
.fs-stage .slide-frame{width:100%;height:100%;max-height:100%;aspect-ratio:16/9;border-radius:0}
.fs-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:5;background:rgba(20,20,20,.85);border:1px solid #444;color:var(--white);width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .15s,border-color .15s}
.fs-nav:hover:not(:disabled){background:#1e1e1e;border-color:var(--gold-dim)}
.fs-nav:disabled{opacity:.3;cursor:not-allowed}
.fs-nav--prev{left:16px}
.fs-nav--next{right:16px}
.fs-hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);font-size:11px;color:#555;letter-spacing:1px}
@media(max-width:900px){#app{grid-template-columns:1fr;grid-template-areas:"topbar" "stage" "controls"}#thumbs{display:none}#progress-bar{left:0}#controls{margin-left:0}.fs-body{padding:8px 48px}.fs-nav{width:36px;height:36px;font-size:14px}}
</style>
</head>
<body>
<div id="app">
  <div id="logo"><div class="dot"></div><span>Screen Golf 1</span></div>
  <div id="topbar">
    <div id="topbar-left">
      <div id="slide-title"></div>
      <button type="button" class="ctrl-btn ctrl-btn--gold" id="btn-fullscreen">⛶ 전체보기</button>
    </div>
    <div id="slide-counter"></div>
    <div id="progress-bar"></div>
  </div>
  <div id="thumbs"></div>
  <div id="stage"><div id="stage-inner"></div></div>
  <div id="controls">
    <button type="button" class="ctrl-btn" id="btn-prev">◀ 이전</button>
    <button type="button" class="ctrl-btn ctrl-btn--gold" id="btn-next">다음 ▶</button>
  </div>
</div>
<div id="fullscreen" class="fs-mode" aria-hidden="true">
  <header class="fs-header">
    <span class="fs-header-title" id="fs-title"></span>
    <div class="fs-header-right">
      <span class="fs-counter" id="fs-counter"></span>
      <button type="button" class="ctrl-btn ctrl-btn--gold" id="fs-close">닫기 ✕</button>
    </div>
  </header>
  <div class="fs-body">
    <button type="button" class="fs-nav fs-nav--prev" id="fs-prev" aria-label="이전 슬라이드">◀</button>
    <div class="fs-stage" id="fs-stage-inner"></div>
    <button type="button" class="fs-nav fs-nav--next" id="fs-next" aria-label="다음 슬라이드">▶</button>
    <span class="fs-hint">← → Space · Esc 종료</span>
  </div>
</div>
<script>
const SLIDES = ${meta};
let current = 0;
let fullscreenOpen = false;
const stage = document.getElementById("stage-inner");
const fsEl = document.getElementById("fullscreen");
const fsStage = document.getElementById("fs-stage-inner");
const thumbs = document.getElementById("thumbs");

function pauseAllVideos() {
  document.querySelectorAll("video").forEach((v) => { try { v.pause(); } catch(e) {} });
}

function buildSlideFrame(i, autoplayVideo) {
  const s = SLIDES[i];
  const frame = document.createElement("div");
  frame.className = "slide-frame";
  const img = document.createElement("img");
  img.className = "slide-png";
  img.src = s.src;
  img.alt = s.title;
  frame.appendChild(img);
  if (s.video) {
    const v = document.createElement("video");
    v.className = "slide-video";
    v.src = s.video.src;
    if (s.video.poster) v.poster = s.video.poster;
    v.controls = true;
    v.playsInline = true;
    v.preload = "metadata";
    v.muted = true;
    v.addEventListener("play", () => img.classList.add("is-hidden"));
    v.addEventListener("pause", () => img.classList.remove("is-hidden"));
    v.addEventListener("ended", () => img.classList.remove("is-hidden"));
    frame.insertBefore(v, img);
    if (autoplayVideo) v.play().catch(() => {});
  }
  return frame;
}

function mountSlideTo(container, i, autoplayVideo) {
  container.innerHTML = "";
  container.appendChild(buildSlideFrame(i, autoplayVideo));
}

function updateChrome() {
  document.getElementById("slide-title").textContent = SLIDES[current].title;
  document.getElementById("slide-counter").textContent =
    String(current + 1).padStart(2, "0") + " / " + String(SLIDES.length).padStart(2, "0");
  document.getElementById("progress-bar").style.width = ((current + 1) / SLIDES.length * 100) + "%";
  document.querySelectorAll(".thumb-item").forEach((el, j) => el.classList.toggle("active", j === current));
  document.getElementById("btn-prev").disabled = current === 0;
  document.getElementById("btn-next").disabled = current === SLIDES.length - 1;
}

function updateFsChrome() {
  document.getElementById("fs-title").textContent = SLIDES[current].title;
  document.getElementById("fs-counter").textContent =
    String(current + 1).padStart(2, "0") + " / " + String(SLIDES.length).padStart(2, "0");
  document.getElementById("fs-prev").disabled = current === 0;
  document.getElementById("fs-next").disabled = current === SLIDES.length - 1;
}

function renderSlides() {
  pauseAllVideos();
  mountSlideTo(stage, current, !fullscreenOpen);
  if (fullscreenOpen) {
    mountSlideTo(fsStage, current, true);
    updateFsChrome();
  }
  updateChrome();
}

function goTo(idx) {
  if (idx < 0 || idx >= SLIDES.length) return;
  current = idx;
  renderSlides();
}

function next() { if (current < SLIDES.length - 1) goTo(current + 1); }
function prev() { if (current > 0) goTo(current - 1); }

function openFullscreen() {
  if (fullscreenOpen) return;
  fullscreenOpen = true;
  fsEl.classList.add("is-open");
  fsEl.setAttribute("aria-hidden", "false");
  renderSlides();
  const req = fsEl.requestFullscreen || fsEl.webkitRequestFullscreen;
  if (req) req.call(fsEl).catch(() => {});
}

function closeFullscreen() {
  if (!fullscreenOpen) return;
  fullscreenOpen = false;
  fsEl.classList.remove("is-open");
  fsEl.setAttribute("aria-hidden", "true");
  fsStage.innerHTML = "";
  renderSlides();
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

SLIDES.forEach((s, i) => {
  const d = document.createElement("div");
  d.className = "thumb-item" + (i === 0 ? " active" : "");
  d.innerHTML =
    '<img src="' + s.src + '" alt="" />' +
    '<span class="thumb-num">' + String(i + 1).padStart(2, "0") + "</span>" +
    '<span class="thumb-label">' + s.title.replace(/</g, "&lt;") + "</span>";
  d.onclick = () => goTo(i);
  thumbs.appendChild(d);
});

document.getElementById("btn-prev").onclick = prev;
document.getElementById("btn-next").onclick = next;
document.getElementById("btn-fullscreen").onclick = openFullscreen;
document.getElementById("fs-close").onclick = closeFullscreen;
document.getElementById("fs-prev").onclick = prev;
document.getElementById("fs-next").onclick = next;

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && fullscreenOpen) {
    fullscreenOpen = false;
    fsEl.classList.remove("is-open");
    fsEl.setAttribute("aria-hidden", "true");
    fsStage.innerHTML = "";
    renderSlides();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && fullscreenOpen) { e.preventDefault(); closeFullscreen(); return; }
  if (e.key === "f" || e.key === "F") {
    if (e.target.closest("input, textarea")) return;
    e.preventDefault();
    fullscreenOpen ? closeFullscreen() : openFullscreen();
    return;
  }
  if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); next(); }
  if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
});

window.addEventListener("message", (e) => {
  if (e.data && e.data.type === "OPEN_FULLSCREEN") openFullscreen();
});

goTo(0);
</script>
</body>
</html>`;
}

function convert(pptxPath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const assetsDir = path.join(outDir, "assets");

  console.log("Exporting slides to PNG via PowerPoint...");
  exportPngSlides(pptxPath, outDir);

  console.log("Extracting media...");
  cleanupOldLayerAssets(assetsDir);
  extractMedia(pptxPath, assetsDir);

  const zip = new AdmZip(pptxPath);
  const extractDir = path.join(outDir, "_meta_extract");
  fs.rmSync(extractDir, { recursive: true, force: true });
  zip.extractAllTo(extractDir, true);

  const presRels = parseRels(path.join(extractDir, "ppt/_rels/presentation.xml.rels"));
  const presXml = fs.readFileSync(path.join(extractDir, "ppt/presentation.xml"), "utf8");
  const order = getSlideOrder(presXml, presRels);

  const slides = order.map((slideName, i) => {
    const slidePath = path.join(extractDir, "ppt/slides", `${slideName}.xml`);
    const relsPath = path.join(extractDir, "ppt/slides/_rels", `${slideName}.xml.rels`);
    const slideXml = fs.readFileSync(slidePath, "utf8");
    const rels = parseRels(relsPath);
    const video = detectVideo(slideXml, rels);
    const entry = {
      title: slideTitle(slideXml),
      src: `assets/slides/slide-${String(i + 1).padStart(2, "0")}.png`,
    };
    if (video) {
      entry.video = {
        src: `assets/${video.src}`,
        poster: video.poster ? `assets/${video.poster}` : null,
        box: video.box,
      };
    }
    return entry;
  });

  fs.rmSync(extractDir, { recursive: true, force: true });

  const html = buildViewerHtml(slides, "스크린골프 중간보고");
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
  console.log(`OK: ${slides.length} slides -> ${outDir}`);
}

const pptxArg = process.argv[2];
const outArg = process.argv[3] || path.join(__dirname, "../react-ai-tools/public/screen-golf-1");

if (!pptxArg) {
  console.error("Usage: node scripts/pptx-to-html.mjs <file.pptx> [outputDir]");
  process.exit(1);
}

convert(path.resolve(pptxArg), path.resolve(outArg));
