import { Link, useLocation } from "react-router-dom";
import { ChevronRight, FileText } from "lucide-react";
import { breadcrumbParts, categoryContext } from "@/lib/registry";
import { taxonomyIcon } from "@/lib/icons";
import { DifficultyDots, difficultyLevel } from "@/components/difficulty";

export default function CategoryPage() {
  const location = useLocation();

  if (location.pathname.startsWith("/note/")) {
    return <div className="p-8 text-muted">笔记不存在</div>;
  }

  const slugParts = location.pathname.split("/").filter(Boolean);
  const ctx = categoryContext(slugParts);

  if (!ctx) {
    return <div className="p-8 text-muted">分类不存在</div>;
  }

  const Icon = taxonomyIcon(ctx.icon);
  const color = ctx.color ?? "#1677ff";
  const crumbs = breadcrumbParts(slugParts);

  return (
    <div className="mx-auto max-w-[1120px] px-8 py-7">
      <nav className="mb-5 flex items-center gap-2 text-[11px] text-muted meta-mono">
        <Link to="/" className="hover:text-foreground">
          NoteViz
        </Link>
        {crumbs.map((c, i) => (
          <span key={c.slug} className="flex items-center gap-2">
            <span className="text-border">/</span>
            <Link
              to={`/${slugParts.slice(0, i + 1).join("/")}`}
              className={i === crumbs.length - 1 ? "text-foreground" : "hover:text-foreground"}
            >
              {c.label}
            </Link>
          </span>
        ))}
      </nav>

      <header className="mb-6 flex items-end justify-between gap-5">
        <div>
          <p className="eyebrow">知识模块</p>
          <h1 className="flex items-center gap-3 text-3xl leading-tight font-semibold">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-md"
              style={{ backgroundColor: `${color}22`, color }}
            >
              <Icon size={18} />
            </span>
            {ctx.label}
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            {ctx.childCategories.length} 个子分类 · {ctx.notes.length} 篇笔记
          </p>
        </div>
      </header>

      {ctx.childCategories.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {ctx.childCategories.map((c) => {
            const ChildIcon = taxonomyIcon(c.icon);
            const childColor = c.color ?? color;
            return (
              <Link
                key={c.slug}
                to={`/${[...ctx.slug, c.slug].join("/")}`}
                className="rounded-[10px] border border-border bg-surface p-4 transition-colors hover:border-accent hover:bg-surface-2"
              >
                <div className="mb-2.5 flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${childColor}22`, color: childColor }}
                  >
                    <ChildIcon size={14} />
                  </span>
                  <span className="text-sm font-semibold">{c.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {ctx.notes.length > 0 && (
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-wide text-muted uppercase meta-mono">
              知识点列表
            </h2>
            <span className="text-[10px] text-muted meta-mono">{ctx.notes.length} 个单元</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {ctx.notes.map((n) => (
              <Link
                key={n.path}
                to={n.path}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto_92px] items-center gap-4 rounded-[10px] border border-border bg-surface px-4 py-3.5 transition-all hover:translate-x-1 hover:border-accent hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-sm leading-snug">
                    <FileText size={14} className="shrink-0 text-accent" />
                    {n.meta.title}
                  </h3>
                  <p className="mt-1 truncate text-xs text-muted">{n.meta.description}</p>
                </div>
                <DifficultyDots level={difficultyLevel(n.meta.difficulty)} />
                <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted meta-mono">
                  {n.meta.difficulty}
                </span>
                <span className="flex items-center justify-end gap-1 text-[10px] text-muted meta-mono">
                  {n.meta.updated}
                  <ChevronRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
