import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Crosshair, Maximize2, Minus, Plus } from "lucide-react";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

/** 可缩放、可拖拽的画布容器：用于流程图/示意图，防止内容截断 */
export function PanZoomCanvas({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);

  const zoom = (dir: 1 | -1) => {
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + dir * SCALE_STEP)));
  };

  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset({ x: d.baseX + (e.clientX - d.startX), y: d.baseY + (e.clientY - d.startY) });
  };
  const onPointerUp = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1 : -1);
  };

  return (
    <div className="relative my-4 overflow-hidden rounded-lg border border-border bg-card">
      <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-md border border-border bg-background/90 p-1 backdrop-blur">
        <ToolButton label="放大" onClick={() => zoom(1)}>
          <Plus size={13} />
        </ToolButton>
        <ToolButton label="缩小" onClick={() => zoom(-1)}>
          <Minus size={13} />
        </ToolButton>
        <ToolButton label="回到原位" onClick={reset}>
          <Crosshair size={13} />
        </ToolButton>
        <ToolButton
          label="适应宽度"
          onClick={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
        >
          <Maximize2 size={13} />
        </ToolButton>
      </div>
      <div
        className={`flex min-h-48 justify-center overflow-auto p-4 ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center top",
          }}
          className="origin-top"
        >
          {children}
        </div>
      </div>
      <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted meta-mono">
        拖拽移动 · Ctrl/⌘ + 滚轮缩放 · {Math.round(scale * 100)}%
      </div>
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
    >
      {children}
    </button>
  );
}
