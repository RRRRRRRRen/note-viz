import { useEffect, useRef, useState } from "react";

function GridPanel({ mode, count }: { mode: "auto-fill" | "auto-fit"; count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tracks, setTracks] = useState("…");
  const color = mode === "auto-fill" ? "#1677ff" : "#8b5cf6";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setTracks(getComputedStyle(el).gridTemplateColumns);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [count]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-mono font-semibold" style={{ color }}>
          {mode}
        </span>
        <span className="font-mono text-[10px] text-muted">轨道 {tracks}</span>
      </div>
      <div
        ref={ref}
        className="grid gap-2 rounded-md border border-border p-2"
        style={{ gridTemplateColumns: `repeat(${mode}, minmax(120px, 1fr))` }}
      >
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="flex h-11 items-center justify-center rounded font-mono text-[11px] font-medium text-white"
            style={{ backgroundColor: color }}
          >
            item {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AutoFitDemo() {
  const [count, setCount] = useState(2);

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 py-2">
        <span className="text-xs font-medium text-muted">
          真实网格实测 —— 同一容器、同一份 minmax(120px, 1fr)，切换项目数看空轨道去留
        </span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={`rounded border px-2 py-0.5 font-mono text-[11px] transition-colors ${
                n === count
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <GridPanel mode="auto-fill" count={count} />
        <GridPanel mode="auto-fit" count={count} />
      </div>

      <div className="border-t border-border px-4 py-2 text-[11px] leading-relaxed text-muted">
        「轨道」是 getComputedStyle 读出的真实轨道尺寸：auto-fill 的空轨道保留实际宽度； auto-fit
        的空轨道显示为 0px，且两侧 gap 一并折叠——省下的空间被 1fr 重新均分。
        项目数不少于列数时，两行逐像素相同。
      </div>
    </div>
  );
}
