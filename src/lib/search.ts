import { useSyncExternalStore } from "react";
import { createStore } from "./store";

/** 全局搜索面板开闭状态 */
const store = createStore(false);

export function openSearch() {
  if (!store.get()) store.set(true);
}

export function closeSearch() {
  if (store.get()) store.set(false);
}

export function toggleSearch() {
  store.set(!store.get());
}

export function useSearchOpen(): boolean {
  return useSyncExternalStore(store.subscribe, store.get, () => false);
}
