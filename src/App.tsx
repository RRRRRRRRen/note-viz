import { useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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

  return (
    <div className="min-h-screen pt-[92px]">
      <AnimatePresence>
        {!zen && (
          <motion.div
            key="chrome-top"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <TopBar />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex h-[calc(100vh-92px)]">
        <motion.div
          initial={false}
          animate={{ width: showSidebar ? 288 : 0, opacity: showSidebar ? 1 : 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="shrink-0 overflow-hidden"
        >
          {sidebarDomain && <Sidebar domainSlug={sidebarDomain} />}
        </motion.div>
        <main className="min-w-0 flex-1 overflow-y-auto">
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
