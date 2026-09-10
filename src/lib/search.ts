import { useSyncExternalStore } from "react";

/** 全局搜索面板开闭状态（external store，同 theme/tabs 模式） */
let open = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function openSearch() {
  if (!open) {
    open = true;
    emit();
  }
}

export function closeSearch() {
  if (open) {
    open = false;
    emit();
  }
}

export function toggleSearch() {
  open = !open;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSearchOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open);
}
