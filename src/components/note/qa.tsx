import { Eye } from "lucide-react";
import { useState } from "react";
import { PALETTE } from "../palette";

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
                  aria-expanded="true"
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
