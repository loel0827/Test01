import { Logo } from "./Logo.jsx";
import { AuthBar } from "./AuthBar.jsx";

export function Header({
  favoritesOnly,
  onToggleFavorites,
  searchQuery,
  onSearchChange,
  onAddCategory,
}) {
  return (
    <header className="site-header">
      <div className="site-header__brand">
        <Logo />
        <div>
          <h1 className="site-header__title">AI Tools Directory</h1>
          <p className="site-header__subtitle">생성형 AI 도구 모음</p>
        </div>
      </div>
      <div className="site-header__actions">
        <button
          type="button"
          className="link-btn"
          aria-pressed={favoritesOnly}
          onClick={onToggleFavorites}
        >
          <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          즐겨찾기 보기
        </button>
        <AuthBar />
        <button type="button" className="btn" onClick={onAddCategory}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            <path d="M12 11v6M9 14h6" />
          </svg>
          카테고리 추가
        </button>
        <label className="search-wrap">
          <svg className="search-wrap__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            className="search-input"
            placeholder="검색..."
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>
      </div>
    </header>
  );
}
