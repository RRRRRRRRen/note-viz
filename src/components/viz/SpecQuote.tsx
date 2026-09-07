import { Quote } from "lucide-react";
import type { ReactNode } from "react";

/** 规范/官方文档原文引用，强制注明出处（source 如 "ECMA-262 §8.4"） */
export function SpecQuote(props: { source: string; children: ReactNode }) {
  return (
    <blockquote className="my-4 rounded-r-lg border-l-4 border-accent/60 bg-surface/50 py-3 pr-4 pl-4">
      <div className="flex gap-2">
        <Quote size={14} className="mt-1 shrink-0 text-accent" />
        <div className="text-sm leading-relaxed">{props.children}</div>
      </div>
      <footer className="mt-2 pl-6 font-mono text-[10px] tracking-wide text-muted uppercase meta-mono">
        — {props.source}
      </footer>
    </blockquote>
  );
}
