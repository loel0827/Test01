import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { faviconUrl } from "../data/categories.js";
import { useTools } from "../context/ToolsContext.jsx";
import { useServiceBoardPosts } from "../hooks/useServiceBoardPosts.js";
import { WriteBoardPostModal } from "../components/WriteBoardPostModal.jsx";
import { AuthBar } from "../components/AuthBar.jsx";

function formatDate(ts) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

function PostList({ posts, board, onDelete }) {
  if (!posts.length) {
    return <p className="service-board__empty">아직 작성된 글이 없습니다.</p>;
  }
  return (
    <ul className="service-board__post-list">
      {posts.map((p) => (
        <li key={p.id} className="service-board__post">
          <div className="service-board__post-head">
            <h3 className="service-board__post-title">{p.title}</h3>
            <div className="service-board__post-meta">
              <span className="service-board__post-author">{p.author ? p.author : "익명"}</span>
              <time dateTime={new Date(p.createdAt).toISOString()}>{formatDate(p.createdAt)}</time>
              <button
                type="button"
                className="service-board__post-del"
                onClick={() => {
                  if (window.confirm("이 글을 삭제할까요?")) onDelete(board, p.id);
                }}
                aria-label="글 삭제"
              >
                삭제
              </button>
            </div>
          </div>
          {p.body ? <p className="service-board__post-body">{p.body}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function ServiceBoardPage() {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const { findToolWithCategory, setActiveTool } = useTools();
  const resolved = useMemo(() => (toolId ? findToolWithCategory(toolId) : null), [toolId, findToolWithCategory]);
  const { servicePosts, tutorialPosts, addPost, deletePost } = useServiceBoardPosts(toolId || "");
  const [writeOpen, setWriteOpen] = useState(false);

  if (!toolId || !resolved) {
    return (
      <div className="service-board service-board--page">
        <div className="service-board__not-found">
          <p>서비스를 찾을 수 없습니다.</p>
          <Link to="/" className="service-board__link-home">
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  const { tool, category } = resolved;
  const desc = tool.description?.trim() || "설명이 없습니다.";

  const handleVisit = () => {
    window.open(tool.url, "_blank", "noopener,noreferrer");
    setActiveTool(tool.id);
  };

  const handleSubmitPost = async (board, payload) => {
    const ok = await addPost(board, payload);
    if (!ok) window.alert("제목을 입력해 주세요.");
    return ok;
  };

  return (
    <div className="service-board service-board--page">
      <header className="service-board__top">
        <div className="service-board__top-row">
          <button type="button" className="service-board__back icon-btn icon-btn--ghost" aria-label="뒤로" onClick={() => navigate(-1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="service-board__brand">
            <div className="service-board__logo-wrap">
              <img src={faviconUrl(tool.domain)} alt="" className="service-board__logo" width={40} height={40} />
            </div>
            <div>
              <h1 className="service-board__name">{tool.name}</h1>
              <p className="service-board__subtitle">{category.name}</p>
            </div>
          </div>
          <div className="service-board__top-actions">
            <AuthBar />
            <button type="button" className="service-board__btn service-board__btn--muted" onClick={handleVisit}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
              </svg>
              사이트 방문
            </button>
            <button type="button" className="service-board__btn service-board__btn--primary" onClick={() => setWriteOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              + 글 작성
            </button>
          </div>
        </div>
      </header>

      <div className="service-board__panels">
        <section className="service-board__panel">
          <h2 className="service-board__panel-title">도구 정보</h2>
          <div className="service-board__info-row">
            <p className="service-board__info-desc">
              <span className="service-board__info-label">설명:</span> {desc}
            </p>
            <p className="service-board__info-url">
              <span className="service-board__info-label">URL:</span>{" "}
              <a href={tool.url} target="_blank" rel="noopener noreferrer" className="service-board__url-link">
                {tool.url}
              </a>
            </p>
          </div>
        </section>

        <section className="service-board__panel">
          <div className="service-board__panel-head">
            <h2 className="service-board__panel-title">서비스 설명</h2>
            <span className="service-board__count">{servicePosts.length}개의 글</span>
          </div>
          <PostList posts={servicePosts} board="service" onDelete={deletePost} />
        </section>

        <section className="service-board__panel">
          <div className="service-board__panel-head">
            <h2 className="service-board__panel-title">튜토리얼 / 사용법</h2>
            <span className="service-board__count">{tutorialPosts.length}개의 글</span>
          </div>
          <PostList posts={tutorialPosts} board="tutorial" onDelete={deletePost} />
        </section>
      </div>

      <WriteBoardPostModal isOpen={writeOpen} onClose={() => setWriteOpen(false)} onSubmit={handleSubmitPost} />
    </div>
  );
}
