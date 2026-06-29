import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function ScreenGolf1Page() {
  const [frameSrc, setFrameSrc] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setFrameSrc("/screen-golf-1/index.html"), 50);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="screen-golf-page">
      <Link to="/" className="screen-golf-page__back link-btn">
        ← 홈
      </Link>
      {!frameSrc ? (
        <p className="screen-golf-page__loading">스크린골프1 불러오는 중…</p>
      ) : (
        <iframe
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
