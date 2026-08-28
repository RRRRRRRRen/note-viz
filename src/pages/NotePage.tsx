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
    note.load().then((mod) => {
      if (alive) setComponent(() => mod.default);
    });
    return () => {
      alive = false;
    };
  }, [note]);

  if (!note) {
    return <div className="p-8 text-muted">笔记不存在</div>;
  }

  const m = note.meta;
  const crumbs = breadcrumbParts(note.slug.slice(0, 3));

  return (
    <div className="mx-auto flex h-full max-w-[1200px]">
      {/* 左：内容（在 main 的滚动容器内自然滚动） */}
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

      {/* 右：大纲栏。h-full 锁定为内容区高度，超出在自身盒子内滚动 */}
      <aside className="hidden w-56 shrink-0 xl:block">
        <Toc containerRef={contentRef} resetKey={note.path} />
      </aside>
    </div>
  );
}
