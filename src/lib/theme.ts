import { useCallback, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const KEY = "noteviz-theme";
const listeners = new Set<() => void>();

function current(): Theme {
  const stored = localStorage.getItem(KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

let snapshot: Theme | null = null;

function getSnapshot(): Theme {
  if (snapshot === null) snapshot = current();
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (!localStorage.getItem(KEY)) {
      snapshot = null;
      apply();
      listener();
    }
  };
  mq.addEventListener("change", onChange);
  return () => {
    listeners.delete(listener);
    mq.removeEventListener("change", onChange);
  };
}

function apply(): void {
  const t = getSnapshot();
  document.documentElement.classList.toggle("dark", t === "dark");
}

export function setTheme(t: Theme | "system"): void {
  if (t === "system") {
    localStorage.removeItem(KEY);
  } else {
    localStorage.setItem(KEY, t);
  }
  snapshot = null;
  apply();
  for (const l of listeners) l();
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light" as const);
  const toggle = useCallback(() => {
    setTheme(getSnapshot() === "dark" ? "light" : "dark");
  }, []);
  return { theme, toggle };
}

apply();
