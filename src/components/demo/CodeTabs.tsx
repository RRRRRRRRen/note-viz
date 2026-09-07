import { useId, useRef, useState } from "react";
import CodeBlock from "./CodeBlock";

export interface CodeTab {
  name: string;
  code: string;
  lang?: "javascript" | "typescript";
}

/** 多实现对比：同一问题的多种解法/语言，标签切换（内部复用 CodeBlock；支持左右方向键切换） */
export function CodeTabs(props: { tabs: CodeTab[] }) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tab = props.tabs[active];
  if (!tab) return null;

  const move = (delta: 1 | -1) => {
    const next = (active + delta + props.tabs.length) % props.tabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="my-4 overflow-hidden rounded-lg">
      <div
        className="flex gap-1 bg-[#161b22] px-2 pt-2"
        role="tablist"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            move(1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            move(-1);
          }
        }}
      >
        {props.tabs.map((t, i) => (
          <button
            key={t.name}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            id={`${baseId}-tab-${i}`}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-controls={`${baseId}-panel`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={`rounded-t-md px-3 py-1.5 font-mono text-[11px] transition-colors ${
              i === active ? "bg-[#0d1117] text-accent" : "text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${active}`}
        /* 压掉 CodeBlock 自带的外边距，让代码区与标签条贴合 */
        className="[&>div]:!my-0 [&>div]:!rounded-t-none"
      >
        <CodeBlock code={tab.code} {...(tab.lang !== undefined ? { lang: tab.lang } : {})} />
      </div>
    </div>
  );
}
