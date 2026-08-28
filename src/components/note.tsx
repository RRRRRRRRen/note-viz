import type { ReactNode } from "react";

export function NoteShell({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

export function Conclusion({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border-l-4 border-accent bg-accent/5 p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
          结论
        </span>
        <span className="text-[11px] tracking-[0.1em] text-accent uppercase meta-mono">
          conclusion first
        </span>
      </div>
      <p className="text-sm leading-relaxed">{children}</p>
    </section>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="scroll-mt-24">
      <h2 data-toc className="mb-3 text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Subsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="scroll-mt-24">
      <h3 data-toc className="mb-2 mt-5 text-sm font-semibold">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="space-y-4 text-sm leading-relaxed">{children}</div>;
}

export interface QAItem {
  q: string;
  /** 面试官为什么问这个 / 他想听到什么 */
  intent?: string;
  /** 参考回答：先结论，再展开 */
  a: string;
  /** 加分项：答出这些能脱颖而出 */
  bonus?: string;
  /** 追问深度 1-5（1 基础，5 硬核），默认 3 */
  depth?: 1 | 2 | 3 | 4 | 5;
}

const DEPTH_LABEL: Record<number, string> = {
  1: "热身",
  2: "基础",
  3: "标准",
  4: "进阶",
  5: "硬核",
};

export function QA({ q, a, intent, bonus, depth = 3 }: QAItem) {
  const dColor =
    depth <= 2 ? "#3fb950" : depth === 3 ? "#1677ff" : depth === 4 ? "#d29922" : "#f85149";
  return (
    // 外层 div 挂 h3 语义 + data-toc，让大纲（Toc）收录每条追问
    <div className="scroll-mt-24" data-toc-item="">
      <h3 className="sr-only">{q}</h3>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="border-b border-border bg-surface px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase"
              style={{ backgroundColor: `${dColor}1a`, color: dColor }}
            >
              追问 · {DEPTH_LABEL[depth]}
            </span>
            <span className="font-medium">{q}</span>
          </div>
          {intent && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
              <span className="font-medium text-accent">面试官视角</span> · {intent}
            </p>
          )}
        </div>
        <div className="space-y-2.5 px-4 py-3 text-sm leading-relaxed">
          <p>
            <strong className="text-accent">答：</strong>
            {a}
            {bonus && (
              <>
                {" "}
                <span className="text-muted">（</span>
                {bonus}
                <span className="text-muted">）</span>
              </>
            )}
          </p>
          {bonus && (
            <p className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs leading-relaxed">
              <strong className="text-success">加分项：</strong>
              {bonus}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function QAChain({ items }: { items: QAItem[] }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {items.map((item) => (
        <QA key={item.q} {...item} />
      ))}
    </div>
  );
}
