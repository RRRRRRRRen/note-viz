import { Eye, Target } from "lucide-react";
import { useState, type ReactNode } from "react";
import { PALETTE } from "./palette";

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
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={`my-4 space-y-1.5 pl-5 text-sm leading-relaxed ${
        ordered ? "list-decimal" : "list-disc"
      }`}
    >
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </Tag>
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

/** 大纲点击跳转后，给目标标题加一段渐隐高亮（配合 data-toc 锚点） */
export function flashHeading(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("toc-flash");
  // 强制 reflow 以重启动画
  void el.offsetWidth;
  el.classList.add("toc-flash");
  const timer = setTimeout(() => el.classList.remove("toc-flash"), 1300);
  void timer;
}

export interface QAItem {
  q: string;
  /** 面试官为什么问这个 / 他想听到什么 */
  intent?: string;
  /** 参考回答：先结论，再展开 */
  a: string;
  /** 加分项：答出这些能脱颖而出（只写这里，组件渲染为独立加分框） */
  bonus?: string;
  /** 追问深度 1-5（1 热身，5 硬核），省略则不显示深度徽章 */
  depth?: 1 | 2 | 3 | 4 | 5;
}

const DEPTH_LABEL: Record<number, string> = {
  1: "热身",
  2: "基础",
  3: "标准",
  4: "进阶",
  5: "硬核",
};

/** 五档五色：热身灰 / 基础绿 / 标准蓝 / 进阶橙 / 硬核红 */
const DEPTH_COLOR: Record<number, string> = {
  1: PALETTE.gray,
  2: PALETTE.green,
  3: PALETTE.blue,
  4: PALETTE.orange,
  5: PALETTE.red,
};

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"] as const;

/** 大纲短标签：`① 热身 · 问题摘要`——问题全文不进大纲，避免长链刷屏 */
function shortTocLabel(index: number, q: string, depth?: 1 | 2 | 3 | 4 | 5): string {
  const no = CIRCLED[index] ?? `${index + 1}.`;
  const brief = q.length > 14 ? `${q.slice(0, 14)}…` : q;
  return depth ? `${no} ${DEPTH_LABEL[depth]} · ${brief}` : `${no} ${brief}`;
}

export function QA({
  q,
  a,
  intent,
  bonus,
  depth,
  index,
  reveal = "click",
}: QAItem & { index: number; reveal?: "click" | "always" }) {
  const [open, setOpen] = useState(reveal === "always");
  const color = depth ? DEPTH_COLOR[depth] : PALETTE.gray;
  return (
    // 间距挂在行上（行与行互为兄弟节点，last:pb-0 才能正确只作用于链的最后一条）
    <div className="flex gap-3 pb-4 last:pb-0">
      {/* 链轨：序号圆点 + 递进连接线 */}
      <div className="flex w-7 shrink-0 flex-col items-center">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-bold"
          style={{ backgroundColor: `${color}1a`, borderColor: `${color}66`, color }}
        >
          {index + 1}
        </span>
        <span className="mt-1 w-px flex-1" style={{ backgroundColor: `${color}33` }} />
      </div>
      {/* 挂 h3 语义 + data-toc（须为 h3 直接父级），让大纲（Toc）以短标签收录每条追问 */}
      <div className="min-w-0 flex-1 scroll-mt-24" data-toc-item="">
        <h3 className="sr-only">{shortTocLabel(index, q, depth)}</h3>
        <div className="overflow-hidden rounded-lg border border-border">
          {/* 问题区：深度徽章 + 问题 + 面试官视角（常驻可见） */}
          <div className="bg-surface px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {depth && (
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase"
                  style={{ backgroundColor: `${color}1a`, color }}
                >
                  {DEPTH_LABEL[depth]}
                </span>
              )}
              <span className="font-medium">{q}</span>
            </div>
            {intent && (
              <p className="mt-2 border-l-2 border-accent/50 pl-2.5 text-xs leading-relaxed text-muted">
                <span className="font-medium text-accent">面试官视角</span> · {intent}
              </p>
            )}
          </div>
          {/* 答案区：默认折叠（先想再看），点击显示 */}
          {open ? (
            <div className="space-y-2.5 border-t border-border px-4 py-3 text-sm leading-relaxed">
              <p>
                <strong className="text-accent">答：</strong>
                {a}
              </p>
              {bonus && (
                <p className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs leading-relaxed">
                  <strong className="text-success">加分项：</strong>
                  {bonus}
                </p>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-[11px] text-muted transition-colors hover:text-accent"
                >
                  收起答案
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded="false"
              className="flex w-full items-center gap-1.5 border-t border-border px-4 py-2 text-left text-xs text-muted transition-colors hover:bg-surface hover:text-accent"
            >
              <Eye size={13} />
              显示参考答案
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function QAChain({
  items,
  reveal = "click",
  intro,
}: {
  items: QAItem[];
  /** click = 答案默认折叠先想再看（默认）；always = 直接展开 */
  reveal?: "click" | "always";
  /** 链级说明（如"从热身到硬核，每一问建立在前一答之上"） */
  intro?: string;
}) {
  return (
    <div className="my-5 text-sm leading-relaxed">
      {intro && <p className="mb-3 text-xs leading-relaxed text-muted">{intro}</p>}
      <div>
        {items.map((item, i) => (
          <QA key={`${item.q}-${i}`} {...item} index={i} reveal={reveal} />
        ))}
      </div>
    </div>
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

/** 图片块：显式宽高防 CLS、lazy 加载、居中题注。图片统一放 public/images/<tech>/，src 写 "/images/..." */
export function Figure(props: {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}) {
  return (
    <figure className="my-5">
      <img
        src={props.src}
        alt={props.alt}
        {...(props.width !== undefined ? { width: props.width } : {})}
        {...(props.height !== undefined ? { height: props.height } : {})}
        loading="lazy"
        className="mx-auto rounded-lg border border-border"
      />
      {props.caption && (
        <figcaption className="mt-2 text-center text-xs leading-relaxed text-muted">
          {props.caption}
        </figcaption>
      )}
    </figure>
  );
}
