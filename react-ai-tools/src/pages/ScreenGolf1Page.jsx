import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export function ScreenGolf1Page() {
  const [frameSrc, setFrameSrc] = useState("");
  const frameRef = useRef(null);

  useEffect(() => {
    const id = window.setTimeout(() => setFrameSrc("/screen-golf-1/index.html"), 50);
    return () => clearTimeout(id);
  }, []);

  function openFullscreen() {
    frameRef.current?.contentWindow?.postMessage({ type: "OPEN_FULLSCREEN" }, "*");
  }

  return (
    <div className="screen-golf-page">
      <div className="screen-golf-page__toolbar">
        <Link to="/" className="screen-golf-page__back link-btn">
          ← 홈
        </Link>
        {frameSrc ? (
          <button type="button" className="screen-golf-page__fullscreen link-btn" onClick={openFullscreen}>
            ⛶ 전체보기
          </button>
        ) : null}
      </div>
      {!frameSrc ? (
        <p className="screen-golf-page__loading">스크린골프1 불러오는 중…</p>
      ) : (
        <iframe
          ref={frameRef}
          className="screen-golf-page__frame"
          src={frameSrc}
          title="스크린골프 중간보고"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      )}
    </div>
  );
}
