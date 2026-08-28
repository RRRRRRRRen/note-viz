import type { ReactNode } from "react";

export function NoteShell({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

export function Conclusion({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border-l-4 border-accent bg-accent/5 p-4">
      <h2 className="mb-1 font-semibold">结论先行</h2>
      <p className="text-sm leading-relaxed">{children}</p>
    </section>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      {children}
    </section>
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
