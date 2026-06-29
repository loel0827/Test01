/** Insert after PPT page number (1-based). Page 17 → new slide becomes page 18. */
export const CUSTOM_INSERT_AFTER_PAGE = 17;

export function getCustomSlideMeta() {
  return {
    title: "PCG · Foliage 비교",
    type: "html",
    id: "pcg-foliage",
  };
}

export function mergeCustomSlides(slides) {
  const insertAt = CUSTOM_INSERT_AFTER_PAGE;
  const next = [...slides];
  next.splice(insertAt, 0, getCustomSlideMeta());
  return next;
}

export function getCustomSlideStyles() {
  return `
.slide-frame--html{background:#fff;color:#111;font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;container-type:size}
.pcg-slide{width:100%;height:100%;padding:5% 6%;display:flex;flex-direction:column;background:#fff;overflow:auto}
.pcg-slide__title{font-size:clamp(14px,2.8cqw,28px);font-weight:700;color:#111;margin-bottom:4%;line-height:1.35}
.pcg-slide__title-icon{margin-right:.35em}
.pcg-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:clamp(9px,1.45cqw,15px);line-height:1.55}
.pcg-table th,.pcg-table td{padding:2.8% 2.5%;text-align:left;vertical-align:top;border-bottom:1px solid #bdbdbd}
.pcg-table thead th{font-weight:700;border-bottom:2px solid #888;background:#fff}
.pcg-table tbody th{width:14%;font-weight:700;background:#fff}
.pcg-table col.col-cat{width:14%}
.pcg-table col.col-foliage{width:43%}
.pcg-table col.col-pcg{width:43%}
.thumb-item--html .thumb-html-preview{width:100%;height:100%;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:8px;background:#fff;color:#111;font-size:7px;line-height:1.3}
.thumb-item--html .thumb-html-preview strong{display:block;font-size:8px;margin-bottom:4px}
.thumb-item--html .thumb-html-preview span{color:#444}`;
}

export function getPcgFoliageHtml() {
  return `<div class="pcg-slide">
  <h2 class="pcg-slide__title"><span class="pcg-slide__title-icon">🌲</span>기존 포리지(Foliage) 툴과의 차이점</h2>
  <table class="pcg-table">
    <colgroup>
      <col class="col-cat" />
      <col class="col-foliage" />
      <col class="col-pcg" />
    </colgroup>
    <thead>
      <tr>
        <th scope="col">구분</th>
        <th scope="col">기존 포리지 (Foliage) 툴</th>
        <th scope="col">PCG (절차적 콘텐츠 생성)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">배치 방식</th>
        <td>브러시로 직접 칠하거나 랜드스케이프 레이어 연동</td>
        <td>노드 기반의 수학적/논리적 규칙 배치</td>
      </tr>
      <tr>
        <th scope="row">수정 용이성</th>
        <td>지형을 수정하면 포리지가 공중에 뜨거나 파묻혀서 다시 칠해야 함</td>
        <td>지형이 바뀌면 에셋들이 실시간으로 알아서 내려앉음</td>
      </tr>
      <tr>
        <th scope="row">확장성</th>
        <td>단순 식생(나무, 풀) 배치에 국한됨</td>
        <td>식생은 물론 건물 배치, 울타리 자동 연결, 프롭 생성 등 만능 활용 가능</td>
      </tr>
    </tbody>
  </table>
</div>`;
}

export function getCustomSlideScript() {
  const html = getPcgFoliageHtml().replace(/`/g, "\\`").replace(/\$/g, "\\$");
  return `
const PCG_FOLIAGE_HTML = \`${html}\`;

function buildHtmlSlide(id) {
  if (id === "pcg-foliage") {
    const frame = document.createElement("div");
    frame.className = "slide-frame slide-frame--html";
    frame.innerHTML = PCG_FOLIAGE_HTML;
    return frame;
  }
  return null;
}

function buildThumbHtml(s) {
  if (s.id === "pcg-foliage") {
    return '<div class="thumb-html-preview"><strong>🌲 PCG · Foliage</strong><span>배치 · 수정 · 확장성 비교</span></div>';
  }
  return "";
}`;
}
