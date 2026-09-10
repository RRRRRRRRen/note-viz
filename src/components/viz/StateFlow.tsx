import { PALETTE } from "../palette";
import { VizBlock } from "./core";

export interface StateNode {
  id: string;
  label: string;
  /** start = 实线加粗浅底；terminal = 胶囊形（终态）；默认 normal */
  kind?: "start" | "normal" | "terminal";
  color?: string;
  /** 节点第二行小字 */
  desc?: string;
}

export interface StateTransition {
  from: string;
  to: string;
  /** 转换条件（标注在连线中点） */
  label?: string;
  color?: string;
  dashed?: boolean;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const TRACK_GAP = 96; // 列间距（LR）/ 行间距（TB）
const CROSS_GAP = 34; // 行间距（LR）/ 列间距（TB）
const PAD = 8;

/** CJK 全角约 13px、半角约 7.5px（12.5px 字号）估算节点宽度 */
function estimateWidth(label: string): number {
  const textW = [...label].reduce((n, ch) => n + (ch.charCodeAt(0) > 0x2e80 ? 13 : 7.5), 0);
  return Math.max(92, Math.ceil(textW) + 30);
}

/** 三次贝塞尔 t=0.5 的点：(P0 + 3·C1 + 3·C2 + P3) / 8 */
function bezierMid(p0: number, c1: number, c2: number, p3: number): number {
  return (p0 + 3 * c1 + 3 * c2 + p3) / 8;
}

/**
 * 状态机图（有限状态迁移）：最长路径自动分层布局，纯 SVG 本地渲染。
 * 支持自环（画在节点上方/右侧）与回迁边（向下/向右绕行，已预留弓形空间）。
 * 适用状态数 ≤8 的小规模状态机；更大规模用 FlowChart（React Flow 自动布局）。
 */
export function StateFlow(props: {
  label?: string;
  direction?: "LR" | "TB";
  states: StateNode[];
  transitions: StateTransition[];
}) {
  const horizontal = (props.direction ?? "LR") === "LR";
  const hasSelfLoop = props.transitions.some((t) => t.from === t.to);

  // 1) 最长路径分层（迭代数受节点数上限约束，兼容回迁边成环）
  const layerOf = new Map<string, number>(props.states.map((s) => [s.id, 0]));
  for (let i = 0; i < props.states.length; i++) {
    let changed = false;
    for (const t of props.transitions) {
      if (t.from === t.to) continue;
      const next = (layerOf.get(t.from) ?? 0) + 1;
      if (next > (layerOf.get(t.to) ?? 0) && next < props.states.length) {
        layerOf.set(t.to, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // 回迁边（目标在更早层）：几何上向下/向右绕弓，需在 cross 轴末端预留空间，否则弧线与标签会被画布裁剪
  const hasBackEdge = props.transitions.some(
    (t) => t.from !== t.to && (layerOf.get(t.to) ?? 0) <= (layerOf.get(t.from) ?? 0),
  );

  // 2) 按层分列
  const columns = new Map<number, string[]>();
  for (const s of props.states) {
    const l = layerOf.get(s.id) ?? 0;
    const arr = columns.get(l) ?? [];
    arr.push(s.id);
    columns.set(l, arr);
  }
  const layerKeys = [...columns.keys()].toSorted((a, b) => a - b);
  const colIds = layerKeys.map((k) => columns.get(k) ?? []);
  const nodeById = new Map(props.states.map((s) => [s.id, s] as const));

  const colSizes = colIds.map((ids) =>
    ids.map((id) => {
      const node = nodeById.get(id);
      return { w: estimateWidth(node?.label ?? ""), h: node?.desc ? 54 : 38 };
    }),
  );
  const trackSizes = colSizes.map((sizes) =>
    Math.max(...sizes.map((s) => (horizontal ? s.w : s.h))),
  );

  // 3) 摆放：track 轴 = 层推进方向，cross 轴 = 层内居中
  const crossMax = Math.max(...colSizes.map((s) => s.length));
  const loopPad = hasSelfLoop ? 46 : 0;
  const backPad = hasBackEdge ? 22 : 0;
  // 自环 LR 画于上方、TB 画于右侧；回迁弓 LR 朝下、TB 朝右 → cross 两侧留白按方向分配
  const crossStartPad = PAD + (horizontal ? loopPad : 0);
  const crossEndPad = PAD + (horizontal ? backPad : loopPad + backPad);
  const width =
    trackSizes.reduce((sum, len) => sum + len, 0) + TRACK_GAP * (trackSizes.length - 1) + PAD * 2;
  const crossLen = crossMax * 56 + (crossMax - 1) * CROSS_GAP + crossStartPad + crossEndPad;

  const boxes = new Map<string, Box>();
  let trackOffset = PAD;
  colSizes.forEach((sizes, ci) => {
    const trackLen = trackSizes[ci] ?? 0;
    const totalCross =
      sizes.reduce((sum, s) => sum + (horizontal ? s.h : s.w), 0) + CROSS_GAP * (sizes.length - 1);
    let crossOffset = crossStartPad + (crossLen - crossStartPad - crossEndPad - totalCross) / 2;
    sizes.forEach((size, ri) => {
      const id = colIds[ci]?.[ri];
      if (id) {
        boxes.set(
          id,
          horizontal
            ? { x: trackOffset, y: crossOffset, w: size.w, h: size.h }
            : { x: crossOffset, y: trackOffset, w: size.w, h: size.h },
        );
      }
      crossOffset += (horizontal ? size.h : size.w) + CROSS_GAP;
    });
    trackOffset += trackLen + TRACK_GAP;
  });

  // 4) 连线几何：先算控制点（供路径与标签中点共用），再拼 path
  const edgeColor = (t: StateTransition) => t.color ?? PALETTE.gray;
  const edges = props.transitions.map((t, i) => {
    const a = boxes.get(t.from);
    const b = boxes.get(t.to);
    if (!a || !b) return null;
    let d: string;
    let mid: { x: number; y: number };

    if (t.from === t.to) {
      // 自环：LR 画在节点上方，TB 画在节点右侧
      if (horizontal) {
        const cx = a.x + a.w / 2;
        const c1y = a.y - 46;
        d = `M ${cx - 18} ${a.y} C ${cx - 34} ${c1y}, ${cx + 34} ${c1y}, ${cx + 18} ${a.y}`;
        mid = { x: cx, y: a.y - 34 };
      } else {
        const cy = a.y + a.h / 2;
        const c1x = a.x + a.w + 46;
        d = `M ${a.x + a.w} ${cy - 18} C ${c1x} ${cy - 34}, ${c1x} ${cy + 34}, ${a.x + a.w} ${cy + 18}`;
        mid = { x: a.x + a.w + 34, y: cy };
      }
    } else if (horizontal) {
      const ax = a.x + a.w;
      const ay = a.y + a.h / 2;
      const bx = b.x;
      const by = b.y + b.h / 2;
      let c1x: number;
      let c1y = ay;
      let c2x: number;
      let c2y = by;
      if (bx >= ax) {
        const dx = Math.max(40, (bx - ax) / 2);
        c1x = ax + dx;
        c2x = bx - dx;
      } else {
        // 回迁边：向下绕行
        const bow = Math.max(ay, by) + 58;
        c1x = ax + 46;
        c2x = bx - 46;
        c1y = bow;
        c2y = bow;
      }
      d = `M ${ax} ${ay} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${bx} ${by}`;
      mid = { x: bezierMid(ax, c1x, c2x, bx), y: bezierMid(ay, c1y, c2y, by) };
    } else {
      const ax = a.x + a.w / 2;
      const ay = a.y + a.h;
      const bx = b.x + b.w / 2;
      const by = b.y;
      let c1y: number;
      let c1x = ax;
      let c2y: number;
      let c2x = bx;
      if (by >= ay) {
        const dy = Math.max(40, (by - ay) / 2);
        c1y = ay + dy;
        c2y = by - dy;
      } else {
        const bow = Math.max(ax, bx) + 58;
        c1y = ay + 46;
        c2y = by - 46;
        c1x = bow;
        c2x = bow;
      }
      d = `M ${ax} ${ay} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${bx} ${by}`;
      mid = { x: bezierMid(ax, c1x, c2x, bx), y: bezierMid(ay, c1y, c2y, by) };
    }
    return { key: `${t.from}-${t.to}-${i}`, t, d, mid };
  });

  const markerColors = [...new Set(props.transitions.map(edgeColor))];

  return (
    <VizBlock label={props.label ?? "状态机 / states"}>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${crossLen}`}
          width="100%"
          style={{ maxWidth: width, minWidth: Math.min(width, 480) }}
          role="img"
        >
          <defs>
            {markerColors.map((c) => (
              <marker
                key={c}
                id={`sf-arrow-${c.slice(1)}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill={c} />
              </marker>
            ))}
          </defs>

          {edges.map((edge) => {
            if (!edge) return null;
            const { t, d, mid } = edge;
            const color = edgeColor(t);
            return (
              <g key={edge.key}>
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  strokeDasharray={t.dashed ? "5 4" : undefined}
                  markerEnd={`url(#sf-arrow-${color.slice(1)})`}
                />
                {t.label && (
                  <text
                    x={mid.x}
                    y={mid.y - 5}
                    textAnchor="middle"
                    fontSize={10.5}
                    fill={color}
                    style={{
                      paintOrder: "stroke",
                      stroke: "var(--background)",
                      strokeWidth: 4,
                      strokeLinejoin: "round",
                    }}
                  >
                    {t.label}
                  </text>
                )}
              </g>
            );
          })}

          {props.states.map((s) => {
            const box = boxes.get(s.id);
            if (!box) return null;
            const color = s.color ?? PALETTE.blue;
            const start = s.kind === "start";
            const terminal = s.kind === "terminal";
            return (
              <g key={s.id}>
                <rect
                  x={box.x}
                  y={box.y}
                  width={box.w}
                  height={box.h}
                  rx={terminal ? box.h / 2 : 9}
                  fill={`${color}${start ? "1f" : "14"}`}
                  stroke={color}
                  strokeWidth={start || terminal ? 2.2 : 1.4}
                />
                <text
                  x={box.x + box.w / 2}
                  y={box.y + box.h / 2 - (s.desc ? 8 : 0)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={12.5}
                  fontWeight={600}
                  fill={color}
                >
                  {s.label}
                </text>
                {s.desc && (
                  <text
                    x={box.x + box.w / 2}
                    y={box.y + box.h / 2 + 13}
                    textAnchor="middle"
                    fontSize={10}
                    fill="currentColor"
                    className="text-muted"
                  >
                    {s.desc}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </VizBlock>
  );
}
