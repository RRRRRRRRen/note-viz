import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { TopBar, TabBar } from "./components/layout/TopBar";
import Sidebar from "./components/layout/Sidebar";
import { ZenProvider, useZen } from "./lib/zen";

function Chrome() {
  const { zen } = useZen();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isDomain = !isHome && !location.pathname.startsWith("/note/");

  return (
    <div className="min-h-screen pt-14">
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
            <TabBar />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex">
        <AnimatePresence>
          {!zen && isDomain && (
            <motion.div
              key="chrome-side"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Sidebar />
            </motion.div>
          )}
        </AnimatePresence>
        <main className="min-w-0 flex-1">
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
