import { CheckCircle2, XCircle } from "lucide-react";
import { useState, type ReactNode } from "react";

const LABELS = ["A", "B", "C", "D", "E", "F"] as const;

/** 选择自测：ABCD 单选，点选即时判对错并显示解析，可重试 */
export function Quiz(props: {
  question: ReactNode;
  options: ReactNode[];
  /** 正确项下标（0 起始） */
  answer: number;
  explain?: ReactNode;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  // 越界防御：answer 配错时收敛到合法区间，避免「正确答案是 undefined」
  const answer = Math.min(Math.max(props.answer, 0), props.options.length - 1);
  const done = picked !== null;
  const correct = picked === answer;

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-2 bg-surface px-4 py-2.5">
        <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent-foreground uppercase">
          自测
        </span>
        <div className="min-w-0 flex-1 text-sm font-medium">{props.question}</div>
      </div>
      <div className="space-y-2 px-4 py-3">
        {props.options.map((opt, i) => {
          const isAnswer = i === answer;
          const isPicked = i === picked;
          const tone = !done
            ? "border-border hover:border-accent"
            : isAnswer
              ? "border-success/50 bg-success/5"
              : isPicked
                ? "border-danger/50 bg-danger/5"
                : "border-border opacity-60";
          return (
            <button
              key={i}
              type="button"
              disabled={done}
              onClick={() => setPicked(i)}
              className={`flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors ${tone}`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border font-mono text-[10px] font-bold text-muted">
                {LABELS[i]}
              </span>
              <span className="min-w-0 flex-1">{opt}</span>
              {done && isAnswer && <CheckCircle2 size={14} className="shrink-0 text-success" />}
              {done && isPicked && !isAnswer && (
                <XCircle size={14} className="shrink-0 text-danger" />
              )}
            </button>
          );
        })}
        {done && (
          <>
            <div
              className={`rounded-md border px-3 py-2 text-xs leading-relaxed ${
                correct ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
              }`}
            >
              <strong className={correct ? "text-success" : "text-danger"}>
                {correct ? "答对了。" : `正确答案是 ${LABELS[answer]}。`}
              </strong>
              {props.explain}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="text-[11px] text-muted transition-colors hover:text-accent"
              >
                再试一次
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
