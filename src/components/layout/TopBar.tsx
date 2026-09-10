import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Moon, Search, Sun, X } from "lucide-react";
import { domainTrees } from "@/lib/registry";
import { openSearch } from "@/lib/search";
import {
  activateTab,
  closeAllTabs,
  closeOtherDomains,
  closeOtherTabs,
  closeTab,
  closeTabsToRight,
  tabsSnapshot,
  useTabs,
} from "@/lib/tabs";
import { useTheme } from "@/lib/theme";
import { useZen } from "@/lib/zen";

function TopBar() {
  const { theme, toggle } = useTheme();
  const { setZen } = useZen();
  const location = useLocation();

  return (
    <div className="relative z-20">
      <header className="border-b border-border bg-background/95 backdrop-blur">
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
                  className={`relative flex h-full items-center border-0 px-3.5 text-[13px] after:absolute after:inset-x-3.5 after:bottom-0 after:h-0.5 after:transition-opacity ${
                    active
                      ? "font-semibold after:opacity-100"
                      : "text-muted after:opacity-0 hover:text-foreground"
                  }`}
                  style={active ? { color: d.color, ["--domain" as string]: d.color } : undefined}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-3.5 bottom-0 h-0.5"
                    style={{
                      background: active ? d.color : "var(--accent)",
                      opacity: active ? 1 : 0,
                    }}
                  />
                  {d.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex h-14 items-center gap-3 border-l border-border pl-4">
            <button
              type="button"
              onClick={openSearch}
              aria-label="搜索笔记（Ctrl/Cmd+K）"
              className="rounded p-2 text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <Search size={16} />
            </button>
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
      <TabBar />
    </div>
  );
}

function TabBar() {
  const { tabs, activeIndex } = useTabs();
  const location = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState<{ index: number; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击菜单外部或 Esc 关闭
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const runAction = (fn: () => void, targetPath?: string) => {
    fn();
    setMenu(null);
    // 若当前路径的标签被关闭，跳到剩余标签或首页
    if (targetPath !== undefined && location.pathname === targetPath) {
      const after = tabsSnapshot();
      if (after.activeIndex >= 0 && after.tabs[after.activeIndex]) {
        navigate(after.tabs[after.activeIndex]!.path);
      } else {
        navigate("/");
      }
    }
  };

  return (
    <div className="flex h-9 items-end border-b border-border bg-background">
      <div className="flex h-full items-stretch gap-1 overflow-x-auto px-4">
        {tabs.map((tab, i) => {
          const active = i === activeIndex && location.pathname === tab.path;
          return (
            <div
              key={tab.path}
              onContextMenu={(e) => {
                e.preventDefault();
                // Menu 键触发时 clientX/Y 为 0，回退到标签自身位置
                const rect = e.currentTarget.getBoundingClientRect();
                setMenu({
                  index: i,
                  x: e.clientX || rect.left,
                  y: e.clientY || rect.bottom,
                });
              }}
              className={`group relative flex shrink-0 items-stretch border-b-2 ${
                active
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  activateTab(i);
                  navigate(tab.path);
                }}
                className={`flex cursor-pointer items-center px-3 text-xs ${
                  active ? "font-semibold" : undefined
                }`}
              >
                {tab.title}
              </button>
              <button
                type="button"
                onClick={() => closeTab(i)}
                className="flex items-center pr-2 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={`关闭 ${tab.title}`}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {menu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-36 rounded-md border border-border bg-background py-1 shadow-lg"
          style={{
            left: Math.min(menu.x, window.innerWidth - 160),
            top: Math.min(menu.y, window.innerHeight - 200),
          }}
        >
          {[
            {
              label: "关闭",
              disabled: false,
              run: () => runAction(() => closeTab(menu.index), tabs[menu.index]?.path),
            },
            {
              label: "关闭其他",
              disabled: tabs.length <= 1,
              run: () => runAction(() => closeOtherTabs(menu.index), location.pathname),
            },
            {
              label: "关闭右侧",
              disabled: menu.index >= tabs.length - 1,
              run: () => runAction(() => closeTabsToRight(menu.index), location.pathname),
            },
            {
              label: "关闭其他领域",
              disabled: tabs.length <= 1,
              run: () => runAction(() => closeOtherDomains(menu.index), location.pathname),
            },
            {
              label: "关闭全部",
              disabled: false,
              run: () => runAction(() => closeAllTabs(), location.pathname),
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={item.run}
              className="block w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-surface-2 disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { TopBar, TabBar };
