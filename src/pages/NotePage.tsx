import { Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { noteByPath } from "@/lib/registry";
import { openTab } from "@/lib/tabs";
import { difficultyBadgeClass } from "@/components/difficulty";

export default function NotePage() {
  const location = useLocation();
  const note = noteByPath(location.pathname);
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (!note) return;
    openTab(note.path, note.meta.title);
    let alive = true;
    note.load().then((mod) => {
      if (alive) setComponent(() => mod.default);
    });
    return () => {
      alive = false;
    };
  }, [note]);

  if (!note) {
    return <div className="p-8 text-muted-foreground">笔记不存在</div>;
  }

  const m = note.meta;
  return (
    <article className="mx-auto max-w-[900px] px-8 py-10">
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="mb-3 text-3xl font-bold">{m.title}</h1>
        <p className="mb-4 text-muted-foreground">{m.description}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${difficultyBadgeClass(m.difficulty)}`}
          >
            {m.difficulty}
          </span>
          {m.tags.map((t) => (
            <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              {t}
            </span>
          ))}
          <span className="text-muted-foreground">更新于 {m.updated}</span>
        </div>
      </header>
      <Suspense fallback={<div className="text-muted-foreground">加载中…</div>}>
        {Component ? <Component /> : null}
      </Suspense>
    </article>
  );
}
