import { Link, useLocation } from "react-router-dom";
import { GitBranch, Moon, Sun, X } from "lucide-react";
import { domainTrees, noteByPath } from "@/lib/registry";
import { activateTab, closeTab, useTabs } from "@/lib/tabs";
import { useTheme } from "@/lib/theme";
import { useZen } from "@/lib/zen";

function TopBar() {
  const { theme, toggle } = useTheme();
  const { setZen } = useZen();
  const location = useLocation();
  const domainSlug = location.pathname.split("/")[1];

  return (
    <header className="flex h-12 shrink-0 items-center gap-6 border-b border-border px-4">
      <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-accent text-accent-foreground">
          N
        </span>
        NoteViz
      </Link>
      <nav className="flex items-center gap-1">
        {domainTrees.map((d) => {
          const active = location.pathname.startsWith(`/${d.slug}`);
          return (
            <Link
              key={d.slug}
              to={`/${d.slug}`}
              className="rounded px-3 py-1.5 text-sm transition-colors"
              style={{
                color: active ? d.color : undefined,
                backgroundColor: active ? `${d.color}14` : undefined,
              }}
            >
              {d.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={toggle}
          className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="切换主题"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          type="button"
          onClick={() => setZen(true)}
          className="rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Zen
        </button>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="GitHub"
        >
          <GitBranch size={16} />
        </a>
      </div>
      <span className="hidden">{domainSlug}</span>
    </header>
  );
}

function TabBar() {
  const { tabs, activeIndex } = useTabs();
  const location = useLocation();

  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {tabs.map((tab, i) => {
          const active = i === activeIndex && location.pathname === tab.path;
          return (
            <span
              key={tab.path}
              className={`group flex shrink-0 items-center gap-1.5 rounded-t border-x border-t px-3 py-1.5 text-xs ${
                active
                  ? "border-border bg-card text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted"
              }`}
            >
              <button type="button" onClick={() => activateTab(i)}>
                {tab.title}
              </button>
              <button
                type="button"
                onClick={() => closeTab(i)}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={`关闭 ${tab.title}`}
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
      </div>
      <nav className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground lg:flex">
        <Breadcrumb />
      </nav>
    </div>
  );
}

function Breadcrumb() {
  const location = useLocation();
  const note = noteByPath(location.pathname);
  if (!note) return null;
  const labels = ["首页"];
  const parts = note.slug;
  void parts;
  return (
    <span className="flex items-center gap-1">
      <Link to="/" className="hover:text-foreground">
        首页
      </Link>
      {note.slug.map((seg, i) => (
        <span key={i} className="flex items-center gap-1">
          <span>/</span>
          <span className={i === note.slug.length - 1 ? "text-foreground" : undefined}>
            {i === note.slug.length - 1 ? note.meta.title : seg}
          </span>
        </span>
      ))}
      {labels.length === 0 ? null : null}
    </span>
  );
}

export { TopBar, TabBar, Breadcrumb };
