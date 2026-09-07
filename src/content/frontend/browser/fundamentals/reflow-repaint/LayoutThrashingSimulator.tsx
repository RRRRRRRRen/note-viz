import { useState } from "react";

interface FrameLog {
  frame: number;
  layouts: number;
  cost: number;
  over: boolean;
}

const NODES = 8;
const LAYOUT_COST = 1.2;
const FRAME_BUDGET = 8.33;
const FRAMES = 5;

type Pattern = "interleaved" | "batched";

export default function LayoutThrashingSimulator() {
  const [pattern, setPattern] = useState<Pattern>("interleaved");
  const [logs, setLogs] = useState<FrameLog[]>([]);
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    const out: FrameLog[] = [];
    if (pattern === "interleaved") {
      for (let f = 0; f < FRAMES; f++) {
        out.push({ frame: f + 1, layouts: NODES, cost: NODES * LAYOUT_COST, over: true });
      }
    } else {
      for (let f = 0; f < FRAMES; f++) {
        out.push({ frame: f + 1, layouts: 1, cost: LAYOUT_COST, over: false });
      }
    }
    setLogs(out);
    setRunning(false);
  };

  const totalLayouts = logs.reduce((s, l) => s + l.layouts, 0);
  const totalCost = logs.reduce((s, l) => s + l.cost, 0);
  const dropped = logs.filter((l) => l.over).length;

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 py-2">
        <span className="text-xs font-medium text-muted">
          布局抖动模拟器 —— 8 个节点 × 5 帧，观察强制布局次数
        </span>
        <div className="flex gap-2">
          {(["interleaved", "batched"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPattern(p);
                setLogs([]);
              }}
              className={`rounded px-2.5 py-1 text-xs transition-colors ${
                pattern === p
                  ? "bg-accent text-accent-foreground"
                  : "border border-border text-muted hover:text-foreground"
              }`}
            >
              {p === "interleaved" ? "读写交错" : "读写分离"}
            </button>
          ))}
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="rounded border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground disabled:opacity-40"
          >
            运行 5 帧
          </button>
        </div>
      </div>

      <div className="p-4">
        <div
          className={`mb-3 rounded-md px-3 py-2 text-xs leading-relaxed ${
            pattern === "interleaved" ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
          }`}
        >
          {pattern === "interleaved"
            ? "每帧：写节点 1 → 读节点 1（脏 → 强制布局）→ 写节点 2 → 读节点 2 … 每次读取都撞上 dirty 位，8 次强制布局"
            : "每帧：先读完全部 8 个（首个读取触发 1 次布局，其余读干净树）→ 再批量写 8 个（标记脏，留到下帧处理）"}
        </div>

        <div className="space-y-1.5">
          {logs.map((l) => (
            <div
              key={l.frame}
              className={`flex items-center gap-3 rounded-md px-3 py-1.5 font-mono text-[11px] ${
                l.over ? "bg-danger/10" : "bg-success/10"
              }`}
            >
              <span className="w-14 text-muted">帧 {l.frame}</span>
              <span className={l.over ? "text-danger" : "text-success"}>强制布局 ×{l.layouts}</span>
              <span className="ml-auto text-muted">
                耗时 {l.cost.toFixed(1)}ms / 预算 {FRAME_BUDGET}ms
              </span>
              <span className={`font-bold ${l.over ? "text-danger" : "text-success"}`}>
                {l.over ? "掉帧" : "流畅"}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="rounded-md bg-surface-2 px-3 py-6 text-center text-[11px] text-muted">
              选择模式后点击「运行 5 帧」
            </div>
          )}
        </div>

        {logs.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-border p-2">
              <div className="font-mono text-lg font-bold text-foreground">{totalLayouts}</div>
              <div className="text-[10px] text-muted">强制布局总数</div>
            </div>
            <div className="rounded-md border border-border p-2">
              <div className="font-mono text-lg font-bold text-foreground">
                {totalCost.toFixed(0)}ms
              </div>
              <div className="text-[10px] text-muted">布局总耗时</div>
            </div>
            <div className="rounded-md border border-border p-2">
              <div className="font-mono text-lg font-bold text-foreground">{dropped}</div>
              <div className="text-[10px] text-muted">掉帧数</div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-2 text-[11px] leading-relaxed text-muted">
        帧耗时为教学模拟值（假定单次强制布局 1.2ms）；真实成本取决于树规模与样式复杂度，用 DevTools
        Performance 面板测 purple Layout 事件。
      </div>
    </div>
  );
}
