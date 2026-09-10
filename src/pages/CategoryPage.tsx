import { Link, useLocation } from "react-router-dom";
import { breadcrumbParts, categoryContext } from "@/lib/registry";
import { taxonomyIcon } from "@/lib/icons";
import { NoteRow } from "@/components/NoteRow";

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
              <NoteRow key={n.path} note={n} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
