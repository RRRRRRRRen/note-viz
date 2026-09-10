import { useCallback, useSyncExternalStore } from "react";
import { createStore } from "./store";

type Theme = "light" | "dark";

const KEY = "noteviz-theme";

function current(): Theme {
  const stored = localStorage.getItem(KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(t: Theme): void {
  document.documentElement.classList.toggle("dark", t === "dark");
}

const store = createStore<Theme>(current());

// 无显式偏好时跟随系统主题
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (!localStorage.getItem(KEY)) {
    const t = current();
    store.set(t);
    apply(t);
  }
});

export function setTheme(t: Theme | "system"): void {
  if (t === "system") {
    localStorage.removeItem(KEY);
  } else {
    localStorage.setItem(KEY, t);
  }
  const effective = current();
  store.set(effective);
  apply(effective);
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const theme = useSyncExternalStore(store.subscribe, store.get, () => "light" as const);
  const toggle = useCallback(() => {
    setTheme(store.get() === "dark" ? "light" : "dark");
  }, []);
  return { theme, toggle };
}

apply(store.get());
