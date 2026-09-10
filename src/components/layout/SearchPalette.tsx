import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CornerDownLeft, Search } from "lucide-react";
import { closeSearch, toggleSearch, useSearchOpen } from "@/lib/search";
import { runSearch } from "@/lib/search-query";
import { MarkText } from "@/components/mark";
import type { SearchEntryLite } from "@/lib/types";

// 模块级缓存：首次打开才动态拉取索引 chunk（不进首屏）；失败时清空缓存供重试
let entriesPromise: Promise<SearchEntryLite[]> | null = null;

function loadEntries(): Promise<SearchEntryLite[]> {
  entriesPromise ??= import("virtual:search-index").then(
    (m) => m.searchEntries,
    (err: unknown) => {
      entriesPromise = null;
      throw err;
    },
  );
  return entriesPromise;
}

/** 全局搜索面板：Cmd/Ctrl+K 唤起，标题/标签/描述/正文全文检索 */
export function SearchPalette() {
  const open = useSearchOpen();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntryLite[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 全局快捷键：Cmd/Ctrl + K
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        toggleSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 打开时重置状态并按需拉取索引（retryTick 变化触发重试）
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    setLoadFailed(false);
    loadEntries()
      .then((es) => setEntries(es))
      .catch(() => setLoadFailed(true));
    inputRef.current?.focus();
  }, [open, retryTick]);

  const trimmed = query.trim().toLowerCase();
  const results = useMemo(() => (entries ? runSearch(entries, trimmed) : []), [entries, trimmed]);
  const displayTokens = trimmed.split(/\s+/).filter((t) => t.length > 0);

  if (!open) return null;

  const go = (notePath: string) => {
    closeSearch();
    navigate(notePath);
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (results.length > 0 ? Math.min(a + 1, results.length - 1) : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      const r = results[active];
      if (r) go(r.entry.path);
    } else if (e.key === "Escape") {
      closeSearch();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="搜索笔记"
      onClick={closeSearch}
    >
      <div
        className="w-[min(640px,92vw)] overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <Search size={15} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
            aria-label="搜索关键词"
            placeholder="搜索标题 / 标签 / 描述 / 正文…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
          />
          <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted meta-mono">
            ESC
          </span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {loadFailed ? (
            <div className="flex flex-col items-center gap-3 px-3 py-6 text-xs text-muted">
              索引加载失败，可能是版本更新导致缓存失效
              <button
                type="button"
                onClick={() => setRetryTick((t) => t + 1)}
                className="rounded border border-border px-3 py-1.5 text-[11px] transition-colors hover:border-accent hover:text-accent"
              >
                重试
              </button>
            </div>
          ) : entries === null ? (
            <div className="px-3 py-6 text-center text-xs text-muted">索引加载中…</div>
          ) : trimmed === "" ? (
            <div className="px-3 py-6 text-center text-xs text-muted">
              输入关键词检索全部笔记 · 方向键选择 · 回车打开
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted">没有匹配的笔记</div>
          ) : (
            <ul role="listbox" aria-label="搜索结果">
              {results.map((r, i) => (
                <li key={r.entry.path}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onClick={() => go(r.entry.path)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      i === active ? "bg-surface-2" : "hover:bg-surface"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          <MarkText text={r.entry.title} tokens={displayTokens} />
                        </span>
                        <span className="ml-auto shrink-0 text-[10px] text-muted meta-mono">
                          {r.entry.updated}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted meta-mono">
                        {r.entry.path.replace(/^\/note\//, "").replaceAll("/", " / ")}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                        <MarkText text={r.snippet} tokens={displayTokens} />
                      </p>
                    </div>
                    {i === active && (
                      <CornerDownLeft size={13} className="mt-1.5 shrink-0 text-muted" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
