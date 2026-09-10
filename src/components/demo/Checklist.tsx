import { Check, ListChecks, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { PALETTE } from "../palette";

export interface ChecklistItem {
  /** 清单条目（一句话动作） */
  text: string;
  /** 补充说明（怎么算完成 / 去哪验证） */
  note?: string;
}

function storageKey(pathname: string, title: string | undefined, items: ChecklistItem[]): string {
  // 以标题（无标题则以条目拼接）做清单身份，同篇多个清单互不干扰
  const identity = title ?? items.map((i) => i.text).join("|");
  return `noteviz-checklist:${pathname}:${identity}`;
}

function falseArray(count: number): boolean[] {
  return Array.from({ length: count }, () => false);
}

function loadState(key: string, count: number): boolean[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const saved: unknown = JSON.parse(raw);
      if (Array.isArray(saved)) {
        const out = falseArray(count);
        saved.slice(0, count).forEach((v, i) => {
          out[i] = typeof v === "boolean" ? v : false;
        });
        return out;
      }
    }
  } catch {
    // 隐私模式等 localStorage 不可用时静默降级为会话内状态
  }
  return falseArray(count);
}

/** 自查清单：勾掉 = 我真的验证过了。按笔记 path 持久化到 localStorage，隔天回来状态还在 */
export function Checklist(props: { title?: string; items: ChecklistItem[] }) {
  const { pathname } = useLocation();
  const key = storageKey(pathname, props.title, props.items);
  const [checked, setChecked] = useState<boolean[]>(() => loadState(key, props.items.length));

  useEffect(() => {
    setChecked(loadState(key, props.items.length));
  }, [key, props.items.length]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(checked));
    } catch {
      // 同上：存储不可用时静默
    }
  }, [key, checked]);

  const total = props.items.length;
  const done = checked.filter(Boolean).length;
  const all = total > 0 && done === total;
  const accent = all ? PALETTE.green : PALETTE.blue;

  const toggle = (i: number) => {
    setChecked((prev) => prev.map((v, j) => (j === i ? !v : v)));
  };

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-2 bg-surface px-4 py-2.5">
        <span
          className="flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white uppercase"
          style={{ backgroundColor: accent }}
        >
          <ListChecks size={11} />
          自查清单 · checklist
        </span>
        {props.title && <span className="min-w-0 truncate text-sm font-medium">{props.title}</span>}
        <span
          className="ml-auto shrink-0 font-mono text-[11px] meta-mono"
          style={{ color: all ? PALETTE.green : undefined }}
        >
          {done}/{total}
        </span>
        <button
          type="button"
          onClick={() => setChecked(falseArray(total))}
          aria-label="重置全部勾选"
          className="shrink-0 rounded p-1 text-muted transition-colors hover:text-foreground"
        >
          <RotateCcw size={12} />
        </button>
      </div>
      <ul className="divide-y divide-border">
        {props.items.map((item, i) => {
          const isChecked = checked[i] ?? false;
          return (
            <li key={item.text}>
              <label className="flex cursor-pointer items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-surface">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(i)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    isChecked ? "border-transparent text-white" : "border-border"
                  }`}
                  style={isChecked ? { backgroundColor: PALETTE.green } : undefined}
                >
                  {isChecked && <Check size={11} />}
                </span>
                <span
                  className={`min-w-0 flex-1 text-sm leading-relaxed transition-colors ${
                    isChecked ? "text-muted line-through" : "text-foreground"
                  }`}
                >
                  {item.text}
                  {item.note && (
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                      {item.note}
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
