import { useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { TopBar } from "./components/layout/TopBar";
import Sidebar from "./components/layout/Sidebar";
import { SearchPalette } from "./components/layout/SearchPalette";
import { SIDEBAR_W } from "./lib/layout";
import { ZenProvider, useZen } from "./lib/zen";

function Chrome() {
  const { zen, setZen } = useZen();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isNote = location.pathname.startsWith("/note/");
  const isTag = location.pathname.startsWith("/tag/");
  const domainSlug = isTag
    ? undefined
    : isHome || isNote
      ? isNote
        ? location.pathname.split("/")[2]
        : undefined
      : location.pathname.split("/")[1];

  // 记住最后一个领域，首页过渡时侧栏内容仍可渲染、宽度平滑收起
  const lastDomain = useRef<string | undefined>(undefined);
  if (domainSlug) lastDomain.current = domainSlug;
  const sidebarDomain = domainSlug ?? lastDomain.current;

  const showSidebar = !zen && !isHome && !isTag && sidebarDomain !== undefined;

  if (zen) {
    return (
      <div className="h-screen overflow-y-auto">
        <Outlet />
        {/* Esc 之外的显式退出入口：右上角浮动按钮 */}
        <button
          type="button"
          onClick={() => setZen(false)}
          aria-label="退出 Zen 模式"
          className="fixed top-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs text-muted shadow-sm backdrop-blur transition-colors hover:text-foreground"
        >
          <X size={13} />
          退出 Zen
        </button>
      </div>
    );
  }

  return (
    /* 整页锁定视口高度：topbar(56) + tabbar(36) 固定，剩余高度全部给 flex 行 */
    <div className="flex h-screen flex-col overflow-hidden">
      {/* 层 1+2：顶栏（领域菜单 + 标签栏）固定高度，不参与滚动 */}
      <div className="shrink-0">
        <TopBar />
      </div>
      {/* 层 3+4：剩余高度，各自内部滚动 */}
      <div className="flex min-h-0 flex-1">
        {/* CSS transition 驱动收展（framer-motion 已移出入口 chunk，动画能力留给笔记层） */}
        <div
          className="min-h-0 shrink-0 overflow-hidden transition-[width,opacity] duration-200 ease-out"
          style={{ width: showSidebar ? SIDEBAR_W : 0, opacity: showSidebar ? 1 : 0 }}
        >
          {/* Sidebar 自身 h-full overflow-y-auto：在盒子内滚动，高度不随内容增长 */}
          {sidebarDomain && <Sidebar domainSlug={sidebarDomain} />}
        </div>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ZenProvider>
      <Chrome />
      <SearchPalette />
    </ZenProvider>
  );
}
