import { PALETTE } from "../palette";
import { VizBlock } from "./core";

export interface SeqMessage {
  /** 发起方：角色序号或名称 */
  from: number | string;
  /** 接收方：角色序号或名称 */
  to: number | string;
  label: string;
  /** 返回/异步消息（虚线） */
  dashed?: boolean;
  color?: string;
  /** 消息下方的补充小字 */
  note?: string;
}

/** 泳道时序图：多角色之间的消息往返顺序，纯 SVG 本地渲染 */
export function SequenceDiagram(props: {
  label?: string;
  actors: string[];
  messages: SeqMessage[];
}) {
  const COL_W = 148;
  const ROW_H = 54;
  const HEAD_H = 46;
  const PAD_X = 16;

  const width = Math.max(props.actors.length * COL_W + PAD_X * 2, 320);
  const height = HEAD_H + props.messages.length * ROW_H + 14;
  const actorX = (i: number) => PAD_X + COL_W / 2 + i * COL_W;
  const resolve = (ref: number | string): number =>
    typeof ref === "number" ? ref : props.actors.indexOf(ref);

  const arrowColor = (m: SeqMessage) => m.color ?? PALETTE.blue;
  const markerColors = [...new Set(props.messages.map(arrowColor))];

  return (
    <VizBlock label={props.label ?? "时序图 / sequence"}>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ maxWidth: width, minWidth: Math.min(width, 480) }}
          role="img"
        >
          <defs>
            {markerColors.map((c) => (
              <marker
                key={c}
                id={`sd-arrow-${c.slice(1)}`}
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

          {/* 生命线 */}
          {props.actors.map((_, i) => (
            <line
              key={i}
              x1={actorX(i)}
              y1={HEAD_H - 8}
              x2={actorX(i)}
              y2={height - 10}
              stroke="var(--border)"
              strokeDasharray="3 4"
            />
          ))}

          {/* 角色头 */}
          {props.actors.map((name, i) => {
            const w = COL_W - 30;
            return (
              <g key={name}>
                <rect
                  x={actorX(i) - w / 2}
                  y={8}
                  width={w}
                  height={30}
                  rx={8}
                  style={{ fill: "var(--surface)", stroke: "var(--border)" }}
                />
                <text
                  x={actorX(i)}
                  y={23}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={12}
                  fontWeight={600}
                  style={{ fill: "var(--foreground)" }}
                >
                  {name}
                </text>
              </g>
            );
          })}

          {/* 消息 */}
          {props.messages.map((m, i) => {
            const fi = resolve(m.from);
            const ti = resolve(m.to);
            if (fi < 0 || ti < 0) return null;
            const color = arrowColor(m);
            const y = HEAD_H + i * ROW_H + 30;
            const x1 = actorX(fi);
            const x2 = actorX(ti);

            if (fi === ti) {
              // 自消息：生命线右侧小环；标签贴近右缘时翻到环左侧，避免超出画布被裁剪
              const lx = x1 + 8;
              const d = `M ${lx} ${y - 9} C ${lx + 44} ${y - 26}, ${lx + 44} ${y + 12}, ${lx} ${y + 5}`;
              const estW = [...m.label].reduce(
                (n, ch) => n + (ch.charCodeAt(0) > 0x2e80 ? 11 : 6),
                0,
              );
              const flip = lx + 52 + estW > width - 4;
              return (
                <g key={i}>
                  <path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    strokeDasharray={m.dashed ? "5 4" : undefined}
                    markerEnd={`url(#sd-arrow-${color.slice(1)})`}
                  />
                  <text
                    x={flip ? lx - 8 : lx + 52}
                    y={y - 2}
                    textAnchor={flip ? "end" : "start"}
                    fontSize={11}
                    fill={color}
                    style={{
                      paintOrder: "stroke",
                      stroke: "var(--background)",
                      strokeWidth: 4,
                      strokeLinejoin: "round",
                    }}
                  >
                    {m.label}
                  </text>
                </g>
              );
            }

            const dir = Math.sign(x2 - x1);
            const start = x1 + dir * 12;
            const end = x2 - dir * 12;
            const midX = (start + end) / 2;
            return (
              <g key={i}>
                <line
                  x1={start}
                  y1={y}
                  x2={end}
                  y2={y}
                  stroke={color}
                  strokeWidth={1.6}
                  strokeDasharray={m.dashed ? "5 4" : undefined}
                  markerEnd={`url(#sd-arrow-${color.slice(1)})`}
                />
                <text
                  x={midX}
                  y={y - 7}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={500}
                  fill={color}
                  style={{
                    paintOrder: "stroke",
                    stroke: "var(--background)",
                    strokeWidth: 4,
                    strokeLinejoin: "round",
                  }}
                >
                  {m.label}
                </text>
                {m.note && (
                  <text
                    x={midX}
                    y={y + 13}
                    textAnchor="middle"
                    fontSize={10}
                    fill="currentColor"
                    className="text-muted"
                    style={{
                      paintOrder: "stroke",
                      stroke: "var(--background)",
                      strokeWidth: 3.5,
                      strokeLinejoin: "round",
                    }}
                  >
                    {m.note}
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
