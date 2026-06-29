/**
 * PPTX -> HTML presentation (with video support)
 * Usage: node scripts/pptx-to-html.mjs <input.pptx> <outputDir>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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

function parseBg(xml) {
  const m = xml.match(/<p:bgPr>[\s\S]*?<a:srgbClr val="([0-9A-Fa-f]{6})"/);
  return m ? `#${m[1]}` : "#0A0A0A";
}

function parseXfrm(block) {
  const off = block.match(/<a:off x="(-?\d+)" y="(-?\d+)"/);
  const ext = block.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
  if (!off || !ext) return null;
  return {
    left: pct(off[1], SW),
    top: pct(off[2], SH),
    width: pct(ext[1], SW),
    height: pct(ext[2], SH),
  };
}

function parseTextRuns(block) {
  const parts = [];
  let align = "left";
  const ap = block.match(/<a:pPr[^>]*algn="([^"]+)"/);
  if (ap) {
    const map = { ctr: "center", r: "right", l: "left" };
    align = map[ap[1]] || "left";
  }
  for (const p of block.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)) {
    let line = "";
    let sz = 1200;
    let color = "#FFFFFF";
    let bold = false;
    for (const r of p[1].matchAll(/<a:r>([\s\S]*?)<\/a:r>/g)) {
      const rp = r[1];
      const t = rp.match(/<a:t>([\s\S]*?)<\/a:t>/);
      if (!t) continue;
      const szM = rp.match(/<a:rPr[^>]*sz="(\d+)"/);
      const colM = rp.match(/<a:srgbClr val="([0-9A-Fa-f]{6})"/);
      const bM = rp.match(/<a:rPr[^>]*\sb="1"/);
      if (szM) sz = Number(szM[1]);
      if (colM) color = `#${colM[1]}`;
      if (bM) bold = true;
      line += t[1];
    }
    if (line.trim()) parts.push({ text: line, sz, color, bold, align });
  }
  return parts;
}

function styleBox(box) {
  return `left:${box.left}%;top:${box.top}%;width:${box.width}%;height:${box.height}%;`;
}

function buildSlideHtml(slideXml, rels, assetsPrefix) {
  const bg = parseBg(slideXml);
  const layers = [];

  for (const block of slideXml.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g)) {
    const pic = block[1];
    const box = parseXfrm(pic);
    if (!box) continue;
    const video = pic.match(/<a:videoFile r:link="([^"]+)"/);
    const embed = pic.match(/<a:blip r:embed="([^"]+)"/);
    if (video) {
      const vTarget = rels[video[1]];
      const posterTarget = embed ? rels[embed[1]] : null;
      if (vTarget) {
        const vName = path.basename(vTarget);
        const posterName = posterTarget ? path.basename(posterTarget) : "";
        layers.push({
          z: layers.length,
          html: `<video class="layer-vid" src="${assetsPrefix}/${vName}" ${posterName ? `poster="${assetsPrefix}/${posterName}"` : ""} controls playsinline preload="metadata"></video>`,
          box,
          isVideo: true,
        });
      }
      continue;
    }
    if (embed) {
      const target = rels[embed[1]];
      if (!target) continue;
      const name = path.basename(target);
      layers.push({
        z: layers.length,
        html: `<img alt="" src="${assetsPrefix}/${name}" />`,
        box,
      });
    }
  }

  for (const block of slideXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)) {
    const sp = block[1];
    if (!sp.includes("<p:txBody>")) {
      const box = parseXfrm(sp);
      if (!box) continue;
      const fill = sp.match(/<a:srgbClr val="([0-9A-Fa-f]{6})"(?:><a:alpha val="(\d+)")?/);
      if (fill && sp.includes("<a:solidFill>")) {
        const alpha = fill[2] ? Number(fill[2]) / 100000 : 1;
        layers.push({
          z: layers.length,
          html: `<div class="layer-shape" style="background:${`#${fill[1]}`};opacity:${alpha}"></div>`,
          box,
        });
      }
      continue;
    }
    const box = parseXfrm(sp);
    if (!box) continue;
    const runs = parseTextRuns(sp);
    if (!runs.length) continue;
    const inner = runs
      .map((r) => {
        const fs = (r.sz / 100) * (100 / 51.435);
        return `<span style="color:${r.color};font-size:${fs}cqmin;font-weight:${r.bold ? 700 : 400};display:block;text-align:${r.align}">${escapeHtml(r.text)}</span>`;
      })
      .join("");
    layers.push({
      z: layers.length,
      html: `<div class="layer-text">${inner}</div>`,
      box,
    });
  }

  const body = layers
    .map(
      (l) =>
        `<div class="layer${l.isVideo ? " layer--video" : ""}" style="${styleBox(l.box)}">${l.html}</div>`
    )
    .join("\n");

  return `<div class="slide-canvas" style="background:${bg}">${body}</div>`;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slideTitle(slideXml) {
  const texts = [...slideXml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => m[1].trim()).filter(Boolean);
  const big = texts.find((t) => t.length > 2 && !/^\d{2}$/.test(t) && !/^\d{2}\s\/\s\d{2}$/.test(t));
  return big || texts[0] || "Slide";
}

function getSlideOrder(presXml, presRels) {
  const ids = [...presXml.matchAll(/<p:sldId[^>]*r:id="([^"]+)"/g)].map((m) => m[1]);
  return ids.map((id) => {
    const target = presRels[id];
    return path.basename(target, ".xml");
  });
}

function buildViewerHtml(slides, title) {
  const templates = slides
    .map(
      (s, i) =>
        `<template id="slide-tpl-${i}">${s.html}</template>`
    )
    .join("\n");

  const meta = JSON.stringify(slides.map((s) => ({ title: s.title })));

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
#topbar{grid-area:topbar;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-bottom:1px solid #1e1e1e;position:relative}
#slide-title{font-size:13px;color:var(--gray);letter-spacing:1px}
#slide-counter{font-size:12px;color:var(--gold-dim);font-weight:700;letter-spacing:2px}
#progress-bar{position:absolute;bottom:0;left:220px;height:2px;background:var(--gold);transition:width .4s cubic-bezier(.4,0,.2,1)}
#thumbs{grid-area:thumb;overflow-y:auto;border-right:1px solid #1e1e1e;padding:12px 10px;display:flex;flex-direction:column;gap:8px;scrollbar-width:thin}
.thumb-item{position:relative;cursor:pointer;border-radius:4px;overflow:hidden;border:1.5px solid transparent;transition:border-color .2s,transform .15s;flex-shrink:0;aspect-ratio:16/9;background:#111}
.thumb-item:hover{transform:translateX(2px);border-color:var(--gold-dim)}
.thumb-item.active{border-color:var(--gold)}
.thumb-num{position:absolute;top:4px;left:6px;font-size:9px;color:var(--gold);font-weight:700;z-index:2;text-shadow:0 1px 3px #000}
.thumb-label{position:absolute;bottom:0;left:0;right:0;padding:16px 6px 4px;font-size:8px;color:var(--gray);background:linear-gradient(transparent,rgba(0,0,0,.85));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:2}
#stage{grid-area:stage;display:flex;align-items:center;justify-content:center;padding:20px 24px 0;overflow:hidden;position:relative}
#stage-inner{width:100%;max-width:1200px;container-type:size}
.slide-canvas{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;container-type:size}
.slide-canvas .layer{position:absolute;box-sizing:border-box;overflow:hidden}
.slide-canvas .layer img,.slide-canvas .layer video{width:100%;height:100%;object-fit:cover;display:block}
.slide-canvas .layer--video{z-index:5}
.slide-canvas .layer-text{display:flex;flex-direction:column;justify-content:center;padding:2%;line-height:1.25;pointer-events:none}
.slide-canvas .layer-shape{pointer-events:none}
#controls{grid-area:controls;display:flex;align-items:center;justify-content:center;gap:16px;padding:0 24px 16px;border-top:1px solid #1e1e1e;margin-left:220px}
.ctrl-btn{background:#141414;border:1px solid #333;color:var(--white);padding:10px 22px;border-radius:8px;cursor:pointer;font-size:13px;letter-spacing:1px;transition:background .15s,border-color .15s}
.ctrl-btn:hover:not(:disabled){background:#1e1e1e;border-color:var(--gold-dim)}
.ctrl-btn:disabled{opacity:.35;cursor:not-allowed}
.ctrl-btn--gold{border-color:var(--gold);color:var(--gold)}
@media(max-width:900px){#app{grid-template-columns:1fr;grid-template-areas:"topbar" "stage" "controls"}#thumbs{display:none}#progress-bar{left:0}#controls{margin-left:0}}
</style>
</head>
<body>
<div id="app">
  <div id="logo"><div class="dot"></div><span>Screen Golf 1</span></div>
  <div id="topbar"><div id="slide-title"></div><div id="slide-counter"></div><div id="progress-bar"></div></div>
  <div id="thumbs"></div>
  <div id="stage"><div id="stage-inner"></div></div>
  <div id="controls">
    <button type="button" class="ctrl-btn" id="btn-prev">◀ 이전</button>
    <button type="button" class="ctrl-btn ctrl-btn--gold" id="btn-next">다음 ▶</button>
  </div>
</div>
${templates}
<script>
const SLIDE_META = ${meta};
let current = 0;
const stage = document.getElementById("stage-inner");
const thumbs = document.getElementById("thumbs");

function mountSlide(i) {
  stage.innerHTML = "";
  const tpl = document.getElementById("slide-tpl-" + i);
  if (!tpl) return;
  stage.appendChild(tpl.content.cloneNode(true));
  stage.querySelectorAll("video").forEach((v) => {
    v.muted = true;
    v.playsInline = true;
    v.controls = true;
    v.play().catch(() => {});
  });
}

function pauseVideos() {
  stage.querySelectorAll("video").forEach((v) => { try { v.pause(); } catch(e) {} });
}

function goTo(idx) {
  if (idx < 0 || idx >= SLIDE_META.length) return;
  pauseVideos();
  current = idx;
  mountSlide(current);
  document.getElementById("slide-title").textContent = SLIDE_META[current].title;
  document.getElementById("slide-counter").textContent = String(current + 1).padStart(2, "0") + " / " + String(SLIDE_META.length).padStart(2, "0");
  document.getElementById("progress-bar").style.width = ((current + 1) / SLIDE_META.length * 100) + "%";
  document.querySelectorAll(".thumb-item").forEach((el, j) => el.classList.toggle("active", j === current));
  document.getElementById("btn-prev").disabled = current === 0;
  document.getElementById("btn-next").disabled = current === SLIDE_META.length - 1;
}

function next() { if (current < SLIDE_META.length - 1) goTo(current + 1); }
function prev() { if (current > 0) goTo(current - 1); }

SLIDE_META.forEach((s, i) => {
  const d = document.createElement("div");
  d.className = "thumb-item" + (i === 0 ? " active" : "");
  d.innerHTML = '<span class="thumb-num">' + String(i + 1).padStart(2, "0") + '</span><span class="thumb-label">' + s.title.replace(/</g, "&lt;") + '</span>';
  d.onclick = () => goTo(i);
  thumbs.appendChild(d);
});

document.getElementById("btn-prev").onclick = prev;
document.getElementById("btn-next").onclick = next;
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); next(); }
  if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
});
goTo(0);
</script>
</body>
</html>`;
}

function convert(pptxPath, outDir) {
  const zip = new AdmZip(pptxPath);
  const extractDir = path.join(outDir, "_extract");
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  zip.extractAllTo(extractDir, true);

  const assetsDir = path.join(outDir, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });
  const mediaSrc = path.join(extractDir, "ppt/media");
  if (fs.existsSync(mediaSrc)) {
    for (const f of fs.readdirSync(mediaSrc)) {
      fs.copyFileSync(path.join(mediaSrc, f), path.join(assetsDir, f));
    }
  }

  const presRels = parseRels(path.join(extractDir, "ppt/_rels/presentation.xml.rels"));
  const presXml = fs.readFileSync(path.join(extractDir, "ppt/presentation.xml"), "utf8");
  const order = getSlideOrder(presXml, presRels);
  const assetsPrefix = "assets";

  const slides = order.map((slideName) => {
    const slidePath = path.join(extractDir, "ppt/slides", `${slideName}.xml`);
    const relsPath = path.join(extractDir, "ppt/slides/_rels", `${slideName}.xml.rels`);
    const slideXml = fs.readFileSync(slidePath, "utf8");
    const rels = parseRels(relsPath);
    return {
      title: slideTitle(slideXml),
      html: buildSlideHtml(slideXml, rels, assetsPrefix),
    };
  });

  const html = buildViewerHtml(slides, "스크린골프 중간보고");
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
  fs.rmSync(extractDir, { recursive: true, force: true });
  console.log(`OK: ${slides.length} slides -> ${outDir}`);
}

const pptxArg = process.argv[2];
const outArg = process.argv[3] || path.join(__dirname, "../react-ai-tools/public/screen-golf-1");

if (!pptxArg) {
  console.error("Usage: node scripts/pptx-to-html.mjs <file.pptx> [outputDir]");
  process.exit(1);
}

convert(path.resolve(pptxArg), path.resolve(outArg));
