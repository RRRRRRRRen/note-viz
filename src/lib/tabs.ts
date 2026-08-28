import { useSyncExternalStore } from "react";

export interface Tab {
  path: string;
  title: string;
}

interface TabsState {
  tabs: Tab[];
  activeIndex: number;
  history: number[];
}

const STORAGE_KEY = "noteviz-tabs";
const MAX_HISTORY = 20;

function load(): TabsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TabsState;
      if (Array.isArray(parsed.tabs) && typeof parsed.activeIndex === "number") {
        return {
          tabs: parsed.tabs,
          activeIndex: Math.min(
            Math.max(parsed.activeIndex, 0),
            Math.max(parsed.tabs.length - 1, 0),
          ),
          history: Array.isArray(parsed.history) ? parsed.history : [],
        };
      }
    }
  } catch {
    // ignore
  }
  return { tabs: [], activeIndex: -1, history: [] };
}

let state: TabsState = { tabs: [], activeIndex: -1, history: [] };
let initialized = false;

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const listeners = new Set<() => void>();

function emit(): void {
  persist();
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function ensureInit(): void {
  if (!initialized) {
    state = load();
    initialized = true;
  }
}

export function openTab(path: string, title: string): void {
  ensureInit();
  const existing = state.tabs.findIndex((t) => t.path === path);
  if (existing >= 0) {
    state = {
      ...state,
      activeIndex: existing,
      history: [...state.history.filter((i) => i !== existing), existing].slice(-MAX_HISTORY),
    };
    emit();
    return;
  }
  const index = state.tabs.length;
  state = {
    tabs: [...state.tabs, { path, title }],
    activeIndex: index,
    history: [...state.history, index].slice(-MAX_HISTORY),
  };
  emit();
}

export function closeTab(index: number): void {
  ensureInit();
  if (index < 0 || index >= state.tabs.length) return;
  const closingWasActive = state.activeIndex === index;

  const tabs = state.tabs.filter((_, i) => i !== index);
  let history = state.history.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i));

  let activeIndex = state.activeIndex;
  if (closingWasActive) {
    const prev = [...history].reverse().find((i) => i !== undefined && i < tabs.length);
    if (prev !== undefined) {
      activeIndex = prev;
    } else if (tabs.length > 0) {
      activeIndex = Math.min(index, tabs.length - 1);
    } else {
      activeIndex = -1;
    }
    history = history.filter((i) => i !== activeIndex);
    history = [...history, activeIndex].slice(-MAX_HISTORY);
  } else if (state.activeIndex > index) {
    activeIndex = state.activeIndex - 1;
  }

  state = { tabs, activeIndex, history };
  emit();
}

export function activateTab(index: number): void {
  ensureInit();
  if (index < 0 || index >= state.tabs.length) return;
  state = {
    ...state,
    activeIndex: index,
    history: [...state.history.filter((i) => i !== index), index].slice(-MAX_HISTORY),
  };
  emit();
}

export function tabsSnapshot(): TabsState {
  ensureInit();
  return state;
}

export function useTabs(): TabsState {
  return useSyncExternalStore(
    subscribe,
    () => {
      ensureInit();
      return state;
    },
    () => ({ tabs: [], activeIndex: -1, history: [] }),
  );
}
