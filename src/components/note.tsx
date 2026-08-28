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

export function QA({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-1 font-medium">Q：{q}</div>
      <div className="text-muted">A：{a}</div>
    </div>
  );
}

export function QAChain({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {items.map((item) => (
        <QA key={item.q} q={item.q} a={item.a} />
      ))}
    </div>
  );
}
