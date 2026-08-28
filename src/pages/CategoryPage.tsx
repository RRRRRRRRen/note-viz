import { Link, useLocation } from "react-router-dom";
import { ChevronRight, FileText } from "lucide-react";
import { breadcrumbParts, categoryContext } from "@/lib/registry";
import { taxonomyIcon } from "@/lib/icons";
import { difficultyBadgeClass } from "@/components/difficulty";

export default function CategoryPage() {
  const location = useLocation();

  // /note/* 的笔记由 NotePage 处理，这里只处理分类路径
  if (location.pathname.startsWith("/note/")) {
    return <div className="p-8 text-muted-foreground">笔记不存在</div>;
  }

  const slugParts = location.pathname.split("/").filter(Boolean);
  const ctx = categoryContext(slugParts);

  if (!ctx) {
    return <div className="p-8 text-muted-foreground">分类不存在</div>;
  }

  const Icon = taxonomyIcon(ctx.icon);
  const color = ctx.color ?? "#3b82f6";
  const crumbs = breadcrumbParts(slugParts);

  return (
    <div className="mx-auto max-w-[900px] px-8 py-10">
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          首页
        </Link>
        {crumbs.map((c, i) => (
          <span key={c.slug} className="flex items-center gap-1">
            <ChevronRight size={12} />
            <Link
              to={`/${slugParts.slice(0, i + 1).join("/")}`}
              className={i === crumbs.length - 1 ? "text-foreground" : "hover:text-foreground"}
            >
              {c.label}
            </Link>
          </span>
        ))}
      </nav>

      <header className="mb-8 flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <Icon size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold">{ctx.label}</h1>
          <p className="text-sm text-muted-foreground">
            {ctx.childCategories.length} 个子分类 · {ctx.notes.length} 篇笔记
          </p>
        </div>
      </header>

      {ctx.childCategories.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">子分类</h2>
          <div className="grid grid-cols-2 gap-3">
            {ctx.childCategories.map((c) => {
              const ChildIcon = taxonomyIcon(c.icon);
              const childColor = c.color ?? color;
              return (
                <Link
                  key={c.slug}
                  to={`/${[...ctx.slug, c.slug].join("/")}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-shadow hover:shadow-md"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${childColor}1a`, color: childColor }}
                  >
                    <ChildIcon size={16} />
                  </span>
                  <span className="text-sm font-medium">{c.label}</span>
                  <ChevronRight size={14} className="ml-auto text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {ctx.notes.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">笔记</h2>
          <div className="space-y-2">
            {ctx.notes.map((n) => (
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
        </section>
      )}
    </div>
  );
}
