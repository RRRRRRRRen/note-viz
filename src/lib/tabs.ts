import { useSyncExternalStore } from "react";

export interface Tab {
  path: string;
  title: string;
}

interface TabsState {
  tabs: Tab[];
  activeIndex: number;
  /** 最近激活的标签索引栈（尾部最新），用于关闭后回跳 */
  history: number[];
}

const STORAGE_KEY = "noteviz-tabs";
const MAX_HISTORY = 20;

const EMPTY: TabsState = { tabs: [], activeIndex: -1, history: [] };

function load(): TabsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<TabsState>;
    if (!Array.isArray(parsed.tabs) || typeof parsed.activeIndex !== "number") return EMPTY;
    return {
      tabs: parsed.tabs,
      activeIndex: Math.min(Math.max(parsed.activeIndex, 0), Math.max(parsed.tabs.length - 1, 0)),
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return EMPTY;
  }
}

let state: TabsState = EMPTY;
const listeners = new Set<() => void>();

function setState(next: TabsState): void {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): TabsState {
  return state;
}

/** 首帧同步从 localStorage 恢复（仅在模块首次被使用时执行一次） */
let restored = false;
function ensureRestored(): void {
  if (restored) return;
  restored = true;
  state = load();
}

function activate(state: TabsState, index: number): TabsState {
  return {
    ...state,
    activeIndex: index,
    history: [...state.history.filter((i) => i !== index), index].slice(-MAX_HISTORY),
  };
}

export function openTab(path: string, title: string): void {
  ensureRestored();
  const existing = state.tabs.findIndex((t) => t.path === path);
  if (existing >= 0) {
    setState(activate(state, existing));
    return;
  }
  const index = state.tabs.length;
  setState({
    tabs: [...state.tabs, { path, title }],
    activeIndex: index,
    history: [...state.history, index].slice(-MAX_HISTORY),
  });
}

export function closeTab(index: number): void {
  ensureRestored();
  if (index < 0 || index >= state.tabs.length) return;
  const closingWasActive = state.activeIndex === index;

  const tabs = state.tabs.filter((_, i) => i !== index);
  const history = state.history.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i));

  let activeIndex = state.activeIndex;
  if (closingWasActive) {
    // 回到上一个活跃标签；没有记录时取相邻标签
    const prev = [...history].reverse().find((i) => i < tabs.length);
    activeIndex =
      prev !== undefined ? prev : tabs.length > 0 ? Math.min(index, tabs.length - 1) : -1;
  } else if (state.activeIndex > index) {
    activeIndex -= 1;
  }

  setState(activate({ tabs, activeIndex, history }, activeIndex));
}

export function activateTab(index: number): void {
  ensureRestored();
  if (index < 0 || index >= state.tabs.length) return;
  setState(activate(state, index));
}

export function useTabs(): TabsState {
  ensureRestored();
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
