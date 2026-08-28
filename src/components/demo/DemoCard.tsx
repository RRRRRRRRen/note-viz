import { useState } from "react";
import type { ReactNode } from "react";
import { Play, RotateCcw } from "lucide-react";

interface DemoCardProps {
  title: string;
  children: ReactNode;
}

export function DemoCard({ title, children }: DemoCardProps) {
  const [runId, setRunId] = useState(0);
  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setRunId((n) => n + 1)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent/10 hover:text-accent"
          >
            <Play size={12} /> 运行
          </button>
          <button
            type="button"
            onClick={() => setRunId(0)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RotateCcw size={12} /> 重置
          </button>
        </div>
      </div>
      <div className="p-4">{runId > 0 ? <div key={runId}>{children}</div> : null}</div>
    </div>
  );
}
