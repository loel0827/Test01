/** Insert after PPT page number (1-based). Page 17 → new slide becomes page 18. */
export const CUSTOM_INSERT_AFTER_PAGE = 17;

export function getCustomSlideMeta() {
  return {
    title: "PCG 추가 설명",
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
.slide-frame--html{background:#0A0A0A;color:#fff;font-family:"Pretendard","Malgun Gothic","Apple SD Gothic Neo",sans-serif;container-type:size}
.pcg-slide{width:100%;height:100%;padding:5.5% 6% 4.5%;display:flex;flex-direction:column;background:#0A0A0A;overflow:hidden}
.pcg-slide__section{font-size:max(11px,2.4cqh);font-weight:700;color:#C9A84C;letter-spacing:.12em;margin-bottom:1.2%}
.pcg-slide__title{font-size:max(20px,4.8cqh);font-weight:700;color:#fff;line-height:1.2;margin-bottom:.6%}
.pcg-slide__subtitle{font-size:max(11px,2.2cqh);color:#A8A8A8;margin-bottom:3.5%;line-height:1.4}
.pcg-table-wrap{flex:1;min-height:0;border:1px solid #3A3A3A;border-radius:10px;background:#1B1B1B;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.pcg-table{width:100%;height:100%;border-collapse:collapse;table-layout:fixed;font-size:max(11px,2.1cqh);line-height:1.55}
.pcg-table th,.pcg-table td{padding:3% 3.2%;text-align:left;vertical-align:top;border-bottom:1px solid #2A2A2A}
.pcg-table thead th{font-size:max(12px,2.5cqh);font-weight:700;background:#141414;color:#C9A84C;border-bottom:1px solid #3A3A3A}
.pcg-table thead th.col-pcg{color:#E8C86A}
.pcg-table tbody tr:last-child th,.pcg-table tbody tr:last-child td{border-bottom:none}
.pcg-table tbody th{width:13%;font-size:max(12px,2.4cqh);font-weight:700;color:#C9A84C;background:#161616}
.pcg-table tbody td{color:#A8A8A8}
.pcg-table tbody td.col-pcg{color:#E8E8E8}
.pcg-table col.col-cat{width:13%}
.pcg-table col.col-foliage{width:43.5%}
.pcg-table col.col-pcg{width:43.5%}
.pcg-slide__footer{margin-top:3%;display:flex;align-items:center;justify-content:space-between;font-size:max(8px,1.65cqh);letter-spacing:.04em}
.pcg-slide__footer-brand{color:#3A3A3A}
.pcg-slide__footer-page{color:#707070}
.thumb-item--html .thumb-html-preview{width:100%;height:100%;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:8px;background:#0A0A0A;color:#C9A84C;font-size:7px;line-height:1.35;border:1px solid #2A2A2A}
.thumb-item--html .thumb-html-preview strong{display:block;font-size:8px;color:#fff;margin-bottom:3px}
.thumb-item--html .thumb-html-preview span{color:#888}`;
}

export function getPcgFoliageHtml() {
  return `<div class="pcg-slide">
  <div class="pcg-slide__head">
    <div class="pcg-slide__section">04</div>
    <h2 class="pcg-slide__title">PCG 추가 설명</h2>
    <p class="pcg-slide__subtitle">🌲 기존 포리지(Foliage) 툴과의 차이점</p>
  </div>
  <div class="pcg-table-wrap">
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
          <th scope="col" class="col-pcg">PCG (절차적 콘텐츠 생성)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">배치 방식</th>
          <td>브러시로 직접 칠하거나 랜드스케이프 레이어 연동</td>
          <td class="col-pcg">노드 기반의 수학적/논리적 규칙 배치</td>
        </tr>
        <tr>
          <th scope="row">수정 용이성</th>
          <td>지형을 수정하면 포리지가 공중에 뜨거나 파묻혀서 다시 칠해야 함</td>
          <td class="col-pcg">지형이 바뀌면 에셋들이 실시간으로 알아서 내려앉음</td>
        </tr>
        <tr>
          <th scope="row">확장성</th>
          <td>단순 식생(나무, 풀) 배치에 국한됨</td>
          <td class="col-pcg">식생은 물론 건물 배치, 울타리 자동 연결, 프롭 생성 등 만능 활용 가능</td>
        </tr>
      </tbody>
    </table>
  </div>
  <footer class="pcg-slide__footer">
    <span class="pcg-slide__footer-brand">REAL SCREEN GOLF — UE5</span>
    <span class="pcg-slide__footer-page">PCG COMPARISON</span>
  </footer>
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
    return '<div class="thumb-html-preview"><strong>04 · PCG 추가 설명</strong><span>Foliage vs PCG 비교</span></div>';
  }
  return "";
}`;
}
