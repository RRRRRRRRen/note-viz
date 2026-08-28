import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, X } from "lucide-react";
import { domainTrees } from "@/lib/registry";
import { activateTab, closeTab, useTabs } from "@/lib/tabs";
import { useTheme } from "@/lib/theme";
import { useZen } from "@/lib/zen";

function TopBar() {
  const { theme, toggle } = useTheme();
  const { setZen } = useZen();
  const location = useLocation();

  return (
    <header className="fixed inset-x-0 top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-7 px-6">
        <Link to="/" className="min-w-44 text-lg font-bold tracking-tight">
          Note<span className="text-accent">V</span>
          <span className="relative">
            iz
            <span className="absolute right-0 bottom-0 h-0.5 w-full bg-accent" />
          </span>
        </Link>
        <nav className="flex h-14 items-center gap-1">
          <Link
            to="/"
            className={`flex h-full items-center border-0 px-3.5 text-[13px] ${
              location.pathname === "/"
                ? "relative font-semibold text-foreground after:absolute after:inset-x-3.5 after:bottom-0 after:h-0.5 after:bg-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            首页
          </Link>
          {domainTrees.map((d) => {
            const active = location.pathname.startsWith(`/${d.slug}`);
            return (
              <Link
                key={d.slug}
                to={`/${d.slug}`}
                className={`flex h-full items-center border-0 px-3.5 text-[13px] ${
                  active
                    ? "relative font-semibold after:absolute after:inset-x-3.5 after:bottom-0 after:h-0.5"
                    : "text-muted hover:text-foreground"
                }`}
                style={
                  active ? { color: d.color, ["--tw-after-bg" as string]: d.color } : undefined
                }
                {...(active ? { "data-domain-active": "" } : {})}
              >
                {d.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex h-14 items-center gap-3 border-l border-border pl-4">
          <button
            type="button"
            onClick={toggle}
            className="rounded p-2 text-muted hover:bg-surface-2 hover:text-foreground"
            aria-label="切换主题"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setZen(true)}
            className="rounded px-2 py-1.5 text-[13px] text-muted hover:bg-surface-2 hover:text-foreground"
          >
            Zen
          </button>
          <span className="flex items-center gap-2.5 text-[11px] text-muted meta-mono">
            <span className="status-dot" />
            状态已同步
          </span>
        </div>
      </div>
    </header>
  );
}

function TabBar() {
  const { tabs, activeIndex } = useTabs();
  const location = useLocation();
  if (tabs.length === 0) return null;

  return (
    <div className="border-b border-border bg-background">
      <div className="flex items-center gap-1 overflow-x-auto px-4">
        {tabs.map((tab, i) => {
          const active = i === activeIndex && location.pathname === tab.path;
          return (
            <span
              key={tab.path}
              className={`group flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs ${
                active
                  ? "border-accent font-semibold text-foreground"
                  : "border-transparent text-muted hover:bg-surface hover:text-foreground"
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
    </div>
  );
}

export { TopBar, TabBar };
