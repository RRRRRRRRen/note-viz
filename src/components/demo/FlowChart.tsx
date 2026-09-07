import { useCallback, useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  Position,
  useReactFlow,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import { VizBlock } from "@/components/viz";

interface FlowData {
  /** dagre 布局方向：TB 自上而下 / LR 左到右 */
  direction?: "TB" | "LR";
  nodes: { id: string; label: string; color: string }[];
  edges: { source: string; target: string; label?: string; dashed?: boolean }[];
}

const NODE_W = 208;
const NODE_H = 48;
const LINE_H = 17; // 12px 字号的行高

/** 按字符宽度估算标签换行后的节点高度（CJK 全角约 12px、半角约 6.5px），供 dagre 间距计算 */
function estimateNodeHeight(label: string): number {
  const textW = [...label].reduce((sum, ch) => sum + (ch.charCodeAt(0) > 0x2e80 ? 12 : 6.5), 0);
  const lines = Math.max(1, Math.ceil(textW / (NODE_W - 20)));
  return Math.max(NODE_H, lines * LINE_H + 16);
}

function layout(data: FlowData): { nodes: Node[]; edges: Edge[]; graphHeight: number } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: data.direction ?? "TB", nodesep: 48, ranksep: 64 });

  for (const n of data.nodes)
    g.setNode(n.id, { width: NODE_W, height: estimateNodeHeight(n.label) });
  for (const e of data.edges) g.setEdge(e.source, e.target);
  dagre.layout(g);

  const nodes: Node[] = data.nodes.map((n) => {
    const pos = g.node(n.id);
    const nodeH = estimateNodeHeight(n.label);
    return {
      id: n.id,
      position: { x: pos.x - NODE_W / 2, y: pos.y - nodeH / 2 },
      data: { label: n.label },
      style: {
        background: `${n.color}1a`,
        border: `1px solid ${n.color}`,
        borderRadius: 8,
        color: n.color,
        fontSize: 12,
        width: NODE_W,
        padding: 8,
      },
      sourcePosition: data.direction === "LR" ? Position.Right : Position.Bottom,
      targetPosition: data.direction === "LR" ? Position.Left : Position.Top,
    };
  });

  const edges: Edge[] = data.edges.map((e, i) => ({
    id: `e${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: !e.dashed,
    style: { stroke: "#8b949e", strokeWidth: 1.2, strokeDasharray: e.dashed ? "4 3" : undefined },
    labelStyle: { fontSize: 10, fill: "#8b949e" },
    labelBgStyle: { fill: "var(--surface)" },
  }));

  return { nodes, edges, graphHeight: Number(g.graph().height ?? 0) };
}

/** fitView 缩放边界：minZoom 调低让大图放得下，maxZoom 封顶防止小图被过度放大 */
const FIT_OPTIONS = { padding: 0.12, minZoom: 0.15, maxZoom: 1 };

function FlowCanvas({ nodes, edges, dataKey }: { nodes: Node[]; edges: Edge[]; dataKey: string }) {
  const { fitView } = useReactFlow();

  const onInit = useCallback((instance: ReactFlowInstance) => {
    instance.fitView(FIT_OPTIONS);
  }, []);

  // StrictMode 双挂载 / 容器首次布局未完成时，内置 fitView 会静默失败导致图形被容器截断，
  // 这里在 80ms / 300ms 各兜底适配一次（后一次也覆盖字体加载后标签换行的回流）。
  // 依赖 dataKey 而非 nodes 引用：数据未变时不重置用户已拖拽/缩放的视口。
  useEffect(() => {
    const rafs: number[] = [];
    const timers = [80, 300].map((delay) =>
      window.setTimeout(() => {
        rafs.push(requestAnimationFrame(() => void fitView(FIT_OPTIONS)));
      }, delay),
    );
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      rafs.forEach((r) => cancelAnimationFrame(r));
    };
  }, [fitView, dataKey]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      fitViewOptions={FIT_OPTIONS}
      onInit={onInit}
      minZoom={0.15}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

/** 基于 React Flow + dagre 自动布局的流程图，支持缩放/拖拽/全屏（Controls） */
export function FlowChart(props: { label?: string; data: FlowData; height?: number }) {
  const { nodes, edges, graphHeight } = useMemo(() => layout(props.data), [props.data]);
  const dataKey = useMemo(() => JSON.stringify(props.data), [props.data]);

  // 自适应高度：按布局自然高度 + 上下留白推导；props.height 只作最小高度保底，封顶 720 防止大图无限撑高
  const height = Math.min(Math.max(graphHeight + 64, props.height ?? 320), 720);

  return (
    <VizBlock label={props.label ?? "流程图 / flow"}>
      <div style={{ height }}>
        <ReactFlowProvider>
          <FlowCanvas nodes={nodes} edges={edges} dataKey={dataKey} />
        </ReactFlowProvider>
      </div>
    </VizBlock>
  );
}
