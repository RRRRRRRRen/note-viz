import { Target } from "lucide-react";
import type { ReactNode } from "react";

/** 大纲标题选择器（DOM 契约的单一来源）：Heading 的 data-toc + 追问链 data-toc-item 内的 sr-only h3。Toc 侧必须引用本常量，禁止手写选择器字符串 */
export const TOC_HEADING_SELECTOR = "h2[data-toc], h3[data-toc], [data-toc-item] > h3";

export function NoteShell({ children }: { children: ReactNode }) {
  // 块流布局器：不做垂直间距，间距完全由各块自身的 my-* 驱动（BLOCK-SYSTEM.md）
  return <div>{children}</div>;
}

/** 标题块：只输出标题自身（TOC 锚点/黄闪落点），内容块与标题是兄弟节点而非子元素 */
export function Heading({ level, title }: { level: 2 | 3; title: string }) {
  if (level === 2) {
    return (
      <h2
        data-toc
        className="mt-10 mb-3 scroll-mt-24 border-l-4 border-accent py-1 pl-3 text-xl font-semibold"
      >
        {title}
      </h2>
    );
  }
  return (
    <h3 data-toc className="mt-5 mb-2 scroll-mt-24 px-2 py-0.5 text-sm font-semibold">
      {title}
    </h3>
  );
}

/** 正文段落块：恰好一段文字；内部行内标记用原生标签 + Kbd/Tag 行级组件 */
export function Paragraph({ children }: { children: ReactNode }) {
  return <p className="my-4 text-sm leading-relaxed">{children}</p>;
}

/** 列表块：有序/无序列表；列表标记用原生语义 */
export function List({ items, ordered = false }: { items: ReactNode[]; ordered?: boolean }) {
  const ListTag = ordered ? "ol" : "ul";
  return (
    <ListTag
      className={`my-4 space-y-1.5 pl-5 text-sm leading-relaxed ${
        ordered ? "list-decimal" : "list-disc"
      }`}
    >
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ListTag>
  );
}

export function Conclusion({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="结论"
      className="relative my-5 overflow-hidden rounded-lg border border-accent/25 bg-accent/5 p-4 pl-5"
    >
      {/* 左缘 6px 实条：与 Callout（4px 细边框卡）拉开轮廓，标志全篇最高价值块 */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-accent" />
      <div className="mb-2 flex items-center gap-2">
        <span className="flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
          <Target size={11} />
          结论
        </span>
        <span className="ml-auto text-[10px] tracking-[0.15em] text-accent/50 uppercase meta-mono">
          conclusion first
        </span>
      </div>
      <div className="text-[15px] font-medium leading-relaxed">{children}</div>
    </section>
  );
}

/** 行内按键胶囊：正文中的按键组合（成表用 ShortcutTable） */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-block rounded border border-border bg-surface px-1.5 py-0 align-middle font-mono text-[11px] leading-4 text-foreground">
      {children}
    </kbd>
  );
}

/** 行内标记胶囊：给段落/机制打的轻量归类标记（一屏 ≤5 个，重要标记用 MemoryCard/Callout） */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-block rounded bg-surface px-1.5 py-0 align-middle font-mono text-[10px] leading-4 text-muted">
      {children}
    </span>
  );
}
