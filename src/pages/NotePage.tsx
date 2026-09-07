import { Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { breadcrumbParts } from "@/lib/registry";
import { noteByPath } from "@/lib/registry";
import { openTab } from "@/lib/tabs";
import { difficultyBadgeClass } from "@/components/difficulty";
import { Toc } from "@/components/layout/Toc";

export default function NotePage() {
  const location = useLocation();
  const note = noteByPath(location.pathname);
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [loadError, setLoadError] = useState(false);
  const openedRef = useRef<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!note || openedRef.current === note.path) return;
    openedRef.current = note.path;
    openTab(note.path, note.meta.title);
  }, [note]);

  useEffect(() => {
    if (!note) return;
    let alive = true;
    setComponent(null);
    setLoadError(false);
    note
      .load()
      .then((mod) => {
        if (alive) setComponent(() => mod.default);
      })
      .catch(() => {
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, [note]);

  if (!note) {
    return <div className="p-8 text-muted">笔记不存在</div>;
  }

  if (loadError) {
    return (
      <div className="p-8 text-muted">
        笔记加载失败，可能是版本更新导致缓存失效，请刷新页面重试。
      </div>
    );
  }

  const m = note.meta;
  const crumbs = breadcrumbParts(note.slug.slice(0, 3));

  return (
    /* main 是唯一滚动容器：外壳随内容增长（min-h-full），内容列不再自带滚动 */
    <div className="relative mx-auto flex min-h-full max-w-[1200px] items-start">
      {/* 左：内容块流（高度随内容增长，滚动交给 main） */}
      <div ref={contentRef} className="min-w-0 flex-1 px-8 py-7">
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
            <span
              className={`rounded px-2 py-0.5 font-sans font-medium ${difficultyBadgeClass(m.difficulty)}`}
            >
              {m.difficulty}
            </span>
            <span className="text-border">·</span>
            {m.tags.map((t) => (
              <span key={t} className="rounded border border-border px-1.5 py-0.5">
                {t}
              </span>
            ))}
            <span className="text-border">·</span>
            <span>更新于 {m.updated}</span>
          </div>
        </header>

        <Suspense fallback={<div className="text-muted">加载中…</div>}>
          {Component ? <Component /> : null}
        </Suspense>
      </div>

      {/* 右：大纲栏。sticky 钉在 main 可视区（顶栏+标签栏 92px 之外），自身内滚 */}
      <aside className="sticky top-0 hidden h-[calc(100vh-92px)] w-64 shrink-0 self-start xl:block">
        <Toc containerRef={contentRef} resetKey={note.path} />
      </aside>
    </div>
  );
}
