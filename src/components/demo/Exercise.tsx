import { Eye, PenLine } from "lucide-react";
import { useState, type ReactNode } from "react";

/** 练习题：题干 + 折叠参考答案 + 考点标签（先做再看；与 QAChain 区分：这是练习题，不是面试问答） */
export function Exercise(props: {
  question: ReactNode;
  answer: ReactNode;
  tags?: string[];
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-2 bg-surface px-4 py-2.5">
        <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent-foreground uppercase">
          练习
        </span>
        {props.tags?.map((t) => (
          <span
            key={t}
            className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="flex gap-2 px-4 py-3 text-sm leading-relaxed">
        <PenLine size={14} className="mt-1 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          {props.question}
          {props.hint && !open && (
            <p className="mt-2 text-xs text-muted">
              <span className="font-medium text-accent">提示：</span>
              {props.hint}
            </p>
          )}
        </div>
      </div>
      {open ? (
        <div className="border-t border-border bg-background px-4 py-3">
          <p className="text-[10px] tracking-wide text-muted uppercase meta-mono">参考答案</p>
          <div className="mt-1.5 text-sm leading-relaxed">{props.answer}</div>
          <div className="mt-2 flex justify-end">
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
  );
}
