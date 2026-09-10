import { useState } from "react";

interface SimItem {
  label: string;
  basis: number;
  shrink: number;
  color: string;
}

const TOTAL_BASIS = 800;

export default function FlexShrinkSimulator() {
  const [container, setContainer] = useState(600);
  const [shrinkB, setShrinkB] = useState(2);

  const items: SimItem[] = [
    { label: "A", basis: 200, shrink: 1, color: "#1677ff" },
    { label: "B", basis: 300, shrink: shrinkB, color: "#8b5cf6" },
    { label: "C", basis: 300, shrink: 1, color: "#f59e0b" },
  ];

  const overflow = Math.max(0, TOTAL_BASIS - container);
  const surplus = Math.max(0, container - TOTAL_BASIS);
  const weightSum = items.reduce((sum, it) => sum + it.shrink * it.basis, 0);
  const rows = items.map((it) => {
    const weight = it.shrink * it.basis;
    const cut = overflow > 0 && weightSum > 0 ? (overflow * weight) / weightSum : 0;
    return { ...it, weight, cut, final: it.basis - cut };
  });

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted">
        Flex 收缩模拟器 —— 拖动滑块，观察加权收缩（真实 flex 渲染 + 公式数值对照）
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <label className="block text-xs text-muted">
          <span className="mb-1 flex justify-between font-medium">
            <span>容器宽度</span>
            <span className="font-mono">{container}px</span>
          </span>
          <input
            type="range"
            min={320}
            max={900}
            step={10}
            value={container}
            onChange={(e) => setContainer(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: "var(--accent)" }}
          />
        </label>
        <label className="block text-xs text-muted">
          <span className="mb-1 flex justify-between font-medium">
            <span>子项 B 的 flex-shrink</span>
            <span className="font-mono">{shrinkB}</span>
          </span>
          <input
            type="range"
            min={0}
            max={4}
            step={0.5}
            value={shrinkB}
            onChange={(e) => setShrinkB(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: "var(--accent)" }}
          />
        </label>
      </div>

      <div className="px-4 pb-2">
        <div className="mb-1.5 font-mono text-[11px] text-muted">
          总 basis = 800px ·{" "}
          {overflow > 0 ? (
            <span style={{ color: "#f85149" }}>溢出 {overflow}px → 触发加权收缩</span>
          ) : (
            <span style={{ color: "#3fb950" }}>剩余 {surplus}px 空闲（grow=0，不做正分配）</span>
          )}
        </div>
        <div className="overflow-x-auto pb-1">
          <div
            className="mx-auto flex overflow-hidden rounded-md border border-border"
            style={{ width: container, maxWidth: "100%" }}
          >
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex h-16 min-w-0 flex-col items-center justify-center font-mono text-[11px] leading-tight text-white"
                style={{
                  flexGrow: 0,
                  flexShrink: r.shrink,
                  flexBasis: r.basis,
                  backgroundColor: r.color,
                }}
              >
                <span className="font-bold">
                  {r.label} · shrink {r.shrink}
                </span>
                <span>{r.final.toFixed(1)}px</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-border p-4">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg border border-border p-2.5">
            <div className="mb-1.5 text-xs font-semibold" style={{ color: r.color }}>
              子项 {r.label}
            </div>
            <dl className="space-y-0.5 font-mono text-[11px] text-muted">
              <div className="flex justify-between">
                <dt>basis</dt>
                <dd>{r.basis}px</dd>
              </div>
              <div className="flex justify-between">
                <dt>权重 s×b</dt>
                <dd>{r.weight}</dd>
              </div>
              <div className="flex justify-between">
                <dt>收缩量</dt>
                <dd className={r.cut > 0 ? "text-danger" : ""}>−{r.cut.toFixed(1)}px</dd>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <dt>最终宽度</dt>
                <dd>{r.final.toFixed(1)}px</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="border-t border-border px-4 py-2 text-[11px] leading-relaxed text-muted">
        收缩量 = 溢出 × (shrink × basis) ÷ 权重和。上方的渲染条是浏览器真实 flex
        布局，下方数值是加权公式的理论值——子项内容不触发 min-width:auto
        时二者完全一致。真实引擎在收缩触到 min/max 边界时还会冻结该项并二次分配剩余溢出。
      </div>
    </div>
  );
}
