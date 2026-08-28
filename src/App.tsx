import { useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { TopBar } from "./components/layout/TopBar";
import Sidebar from "./components/layout/Sidebar";
import { ZenProvider, useZen } from "./lib/zen";

function Chrome() {
  const { zen } = useZen();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isNote = location.pathname.startsWith("/note/");
  const domainSlug =
    isHome || isNote
      ? isNote
        ? location.pathname.split("/")[2]
        : undefined
      : location.pathname.split("/")[1];

  // 记住最后一个领域，首页过渡时侧栏内容仍可渲染、宽度平滑收起
  const lastDomain = useRef<string | undefined>(undefined);
  if (domainSlug) lastDomain.current = domainSlug;
  const sidebarDomain = domainSlug ?? lastDomain.current;

  const showSidebar = !zen && !isHome && sidebarDomain !== undefined;

  if (zen) {
    return (
      <div className="h-screen overflow-y-auto">
        <Outlet />
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
        <motion.div
          initial={false}
          animate={{ width: showSidebar ? 288 : 0, opacity: showSidebar ? 1 : 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="min-h-0 shrink-0 overflow-hidden"
        >
          {/* Sidebar 自身 h-full overflow-y-auto：在盒子内滚动，高度不随内容增长 */}
          {sidebarDomain && <Sidebar domainSlug={sidebarDomain} />}
        </motion.div>
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
    </ZenProvider>
  );
}
