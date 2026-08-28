import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  Position,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import { VizBlock } from "@/components/viz";

interface FlowData {
  /** dagre 布局方向：TB 自上而下 / LR 左到右 */
  direction?: "TB" | "LR";
  nodes: { id: string; label: string; color: string }[];
  edges: { source: string; target: string; label?: string; dashed?: boolean }[];
}

const NODE_W = 208;
const NODE_H = 48;

function layout(data: FlowData): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: data.direction ?? "TB", nodesep: 48, ranksep: 64 });

  for (const n of data.nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of data.edges) g.setEdge(e.source, e.target);
  dagre.layout(g);

  const nodes: Node[] = data.nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
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

  return { nodes, edges };
}

/** 基于 React Flow + dagre 自动布局的流程图，支持缩放/拖拽/全屏（Controls） */
export function FlowChart(props: { label?: string; data: FlowData; height?: number }) {
  const { nodes, edges } = useMemo(() => layout(props.data), [props.data]);

  return (
    <VizBlock label={props.label ?? "流程图 / flow"}>
      <div style={{ height: props.height ?? 360 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </VizBlock>
  );
}
