import { useSyncExternalStore } from "react";
import { createStore } from "./store";

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

const store = createStore<TabsState>(load());

function setState(next: TabsState): void {
  store.set(next);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 隐私模式等存储不可用时静默降级为会话内状态
  }
}

function activate(state: TabsState, index: number): TabsState {
  return {
    ...state,
    activeIndex: index,
    history: [...state.history.filter((i) => i !== index), index].slice(-MAX_HISTORY),
  };
}

export function openTab(path: string, title: string): void {
  const state = store.get();
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
  const state = store.get();
  if (index < 0 || index >= state.tabs.length) return;
  const closingWasActive = state.activeIndex === index;

  const tabs = state.tabs.filter((_, i) => i !== index);
  const history = state.history.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i));

  let activeIndex = state.activeIndex;
  if (closingWasActive) {
    // 回到上一个活跃标签；没有记录时取相邻标签
    const prev = history.toReversed().find((i) => i < tabs.length);
    activeIndex =
      prev !== undefined ? prev : tabs.length > 0 ? Math.min(index, tabs.length - 1) : -1;
  } else if (state.activeIndex > index) {
    activeIndex -= 1;
  }

  setState(activate({ tabs, activeIndex, history }, activeIndex));
}

export function activateTab(index: number): void {
  const state = store.get();
  if (index < 0 || index >= state.tabs.length) return;
  setState(activate(state, index));
}

/** 批量关闭后重新计算 activeIndex：优先回到历史栈中仍存活的最近标签 */
function normalizeAfterClose(tabs: Tab[], history: number[]): TabsState {
  let activeIndex = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    const idx = history[i]!;
    if (idx < tabs.length) {
      activeIndex = idx;
      break;
    }
  }
  if (activeIndex === -1 && tabs.length > 0) activeIndex = 0;
  const cleanedHistory =
    activeIndex === -1
      ? []
      : [...history.filter((i) => i < tabs.length), activeIndex].slice(-MAX_HISTORY);
  return { tabs, activeIndex, history: cleanedHistory };
}

/** 关闭全部标签 */
export function closeAllTabs(): void {
  if (store.get().tabs.length === 0) return;
  setState({ tabs: [], activeIndex: -1, history: [] });
}

/** 关闭其他标签（保留指定索引） */
export function closeOtherTabs(index: number): void {
  const state = store.get();
  if (index < 0 || index >= state.tabs.length) return;
  const tabs = [state.tabs[index]!];
  setState(normalizeAfterClose(tabs, [0]));
}

/** 关闭右侧所有标签 */
export function closeTabsToRight(index: number): void {
  const state = store.get();
  if (index < 0 || index >= state.tabs.length - 1) return;
  const tabs = state.tabs.slice(0, index + 1);
  setState(
    normalizeAfterClose(
      tabs,
      state.history.filter((i) => i <= index),
    ),
  );
}

/** 关闭与指定标签不同领域的标签（笔记按 /note/<domain>/ 分组，分类页按一级路径） */
export function closeOtherDomains(index: number): void {
  const state = store.get();
  if (index < 0 || index >= state.tabs.length) return;
  // /note/frontend/... 取 [2]，/frontend 取 [1]；首页 "/" 无领域
  const domainOf = (p: string) => {
    const segs = p.split("/").filter(Boolean);
    return segs[0] === "note" ? (segs[1] ?? "") : (segs[0] ?? "");
  };
  const target = domainOf(state.tabs[index]!.path);

  // 记录被保留标签在新数组中的下标映射，供 history 重映射
  const kept: number[] = [];
  const tabs = state.tabs.filter((t, i) => {
    const keep = domainOf(t.path) === target;
    if (keep) kept.push(i);
    return keep;
  });
  const keptSet = new Set(kept);
  const newIndex = new Map(kept.map((old, neu) => [old, neu]));
  const history = state.history
    .filter((i) => keptSet.has(i))
    .map((i) => newIndex.get(i)!)
    .filter((i) => i !== undefined);
  setState(normalizeAfterClose(tabs, history));
}

export function tabsSnapshot(): TabsState {
  return store.get();
}

export function useTabs(): TabsState {
  return useSyncExternalStore(store.subscribe, store.get, () => EMPTY);
}
