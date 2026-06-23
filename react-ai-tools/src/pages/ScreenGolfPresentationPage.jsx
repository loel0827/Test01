import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function ScreenGolfPresentationPage() {
  const [frameSrc, setFrameSrc] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setFrameSrc("/screen-golf-presentation.html"), 50);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="screen-golf-page">
      <Link to="/" className="screen-golf-page__back link-btn">
        ← 홈
      </Link>
      {!frameSrc ? (
        <p className="screen-golf-page__loading">프레젠테이션 불러오는 중…</p>
      ) : (
        <iframe
          className="screen-golf-page__frame"
          src={frameSrc}
          title="Real Screen Golf — Game Design"
          allowFullScreen
        />
      )}
    </div>
  );
}
