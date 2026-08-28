import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface ZenContext {
  zen: boolean;
  setZen: (v: boolean) => void;
}

const Ctx = createContext<ZenContext>({ zen: false, setZen: () => {} });

export function ZenProvider({ children }: { children: ReactNode }) {
  const [zen, setZenState] = useState(false);
  const setZen = useCallback((v: boolean) => setZenState(v), []);

  useEffect(() => {
    if (!zen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZenState(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zen]);

  return <Ctx.Provider value={{ zen, setZen }}>{children}</Ctx.Provider>;
}

export function useZen(): ZenContext {
  return useContext(Ctx);
}
