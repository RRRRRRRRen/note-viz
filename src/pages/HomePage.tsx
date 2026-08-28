import { Link } from "react-router-dom";
import { ChevronRight, FileText } from "lucide-react";
import { domainTrees, latestNotes } from "@/lib/registry";
import { taxonomyIcon } from "@/lib/icons";
import { difficultyBadgeClass } from "@/components/difficulty";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[900px] px-8 py-12">
      <h1 className="mb-2 text-4xl font-bold tracking-tight">NoteViz</h1>
      <p className="mb-10 text-muted-foreground">
        问答 · 案例分析 · 面试题详解 —— 用交互与可视化讲透知识点
      </p>

      <h2 className="mb-4 text-lg font-semibold">领域</h2>
      <div className="mb-10 grid grid-cols-2 gap-4">
        {domainTrees.map((d) => {
          const Icon = taxonomyIcon(d.icon);
          const noteCount = d.techs.reduce(
            (acc, t) => acc + t.areas.reduce((a, ar) => a + ar.notes.length, 0),
            0,
          );
          return (
            <Link
              key={d.slug}
              to={`/${d.slug}`}
              className="group rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${d.color}1a`, color: d.color }}
                >
                  <Icon size={18} />
                </span>
                <span className="font-semibold">{d.label}</span>
                <ChevronRight
                  size={16}
                  className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </div>
              <p className="text-xs text-muted-foreground">{noteCount} 篇笔记</p>
            </Link>
          );
        })}
      </div>

      <h2 className="mb-4 text-lg font-semibold">最新笔记</h2>
      <div className="space-y-2">
        {latestNotes(10).map((n) => (
          <Link
            key={n.path}
            to={n.path}
            className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted"
          >
            <FileText size={16} className="shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{n.meta.title}</div>
              <div className="truncate text-xs text-muted-foreground">{n.meta.description}</div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${difficultyBadgeClass(n.meta.difficulty)}`}
            >
              {n.meta.difficulty}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{n.meta.updated}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
