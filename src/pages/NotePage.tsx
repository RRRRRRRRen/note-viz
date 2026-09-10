import { Component, Suspense, lazy, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { breadcrumbParts, noteByPath } from "@/lib/registry";
import { openTab } from "@/lib/tabs";
import { difficultyBadgeClass, NoteTypeBadge } from "@/components/badges";
import { Toc } from "@/components/layout/Toc";
import { backlinks } from "virtual:backlinks";

/** 笔记 chunk 加载失败（典型场景：发版后旧 chunk 被删、浏览器缓存失效）的兜底 UI */
class NoteLoadErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="p-8 text-muted">
          笔记加载失败，可能是版本更新导致缓存失效，请刷新页面重试。
        </div>
      );
    }
    return this.props.children;
  }
}

export default function NotePage() {
  const location = useLocation();
  const note = noteByPath(location.pathname);
  const openedRef = useRef<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 每篇笔记一个 lazy 组件；memo 保证同一篇内重渲不重建，换篇时随 note 变化重建
  const LazyNote = useMemo(() => (note ? lazy(() => note.load()) : null), [note]);

  useEffect(() => {
    if (!note || openedRef.current === note.path) return;
    openedRef.current = note.path;
    openTab(note.path, note.meta.title);
  }, [note]);

  if (!note) {
    return <div className="p-8 text-muted">笔记不存在</div>;
  }

  const m = note.meta;
  const crumbs = breadcrumbParts(note.slug.slice(0, 3));
  const refSources = backlinks[note.path] ?? [];

  return (
    /* main 是唯一滚动容器：外壳随内容增长（min-h-full），内容列不再自带滚动 */
    <div className="relative mx-auto flex min-h-full max-w-[1200px] items-start">
      {/* 左：内容块流（高度随内容增长，滚动交给 main） */}
      <div ref={contentRef} className="min-w-0 flex-1 px-8 py-7">
        {m.type === "draft" && (
          <div className="mb-5 rounded-lg border border-dashed border-warn/60 bg-warn/10 px-4 py-2.5 text-xs leading-relaxed text-warn">
            草稿——内容未完成，仅通过 URL 直达；不出现在导航、搜索与各聚合页。
          </div>
        )}
        <nav className="mb-5 flex items-center gap-2 text-[11px] text-muted meta-mono">
          <span>NoteViz</span>
          {crumbs.map((c) => (
            <span key={c.slug} className="flex items-center gap-2">
              <span className="text-border">/</span>
              <span>{c.label}</span>
            </span>
          ))}
        </nav>

        <header className="mb-7">
          <p className="eyebrow">学习详情</p>
          <h1 className="max-w-[800px] text-3xl leading-tight font-semibold">{m.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted meta-mono">
            <NoteTypeBadge type={m.type} />
            <span
              className={`rounded px-2 py-0.5 font-sans font-medium ${difficultyBadgeClass(m.difficulty)}`}
            >
              {m.difficulty}
            </span>
            <span className="text-border">·</span>
            {m.tags.map((t) => (
              <Link
                key={t}
                to={`/tag/${encodeURIComponent(t)}`}
                className="rounded border border-border px-1.5 py-0.5 transition-colors hover:border-accent hover:text-accent"
              >
                {t}
              </Link>
            ))}
            <span className="text-border">·</span>
            <span>更新于 {m.updated}</span>
          </div>
        </header>

        {/* MotionConfig 挂在笔记层而非应用根：framer-motion 不进首屏，笔记动效仍尊重系统"减少动态效果" */}
        <MotionConfig reducedMotion="user">
          <NoteLoadErrorBoundary key={note.path}>
            <Suspense fallback={<div className="text-muted">加载中…</div>}>
              {LazyNote ? <LazyNote /> : null}
            </Suspense>
          </NoteLoadErrorBoundary>
        </MotionConfig>

        {refSources.length > 0 && (
          <section className="mt-12 border-t border-border pt-4">
            <div className="mb-2.5 text-[10px] tracking-[0.1em] text-muted uppercase meta-mono">
              被引用 / referenced by
            </div>
            <p className="mb-3 text-xs text-muted">以下笔记链接到了本篇（前置知识 / 延伸阅读）：</p>
            <ul className="space-y-1.5">
              {refSources.map((p) => (
                <li key={p}>
                  <Link
                    to={p}
                    className="text-[13px] text-accent underline-offset-4 transition-colors hover:underline"
                  >
                    ↩ {noteByPath(p)?.meta.title ?? p}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* 右：大纲栏。sticky 钉在 main 可视区（chrome 高度 --chrome-h 之外），自身内滚 */}
      <aside className="sticky top-0 hidden h-[calc(100vh-var(--chrome-h))] w-64 shrink-0 self-start xl:block">
        <Toc containerRef={contentRef} resetKey={note.path} />
      </aside>
    </div>
  );
}
