// 可视化组件统一出口：import { CompareTable, ... } from "@/components/viz"
// 新增静态可视化组件放本目录并在此 re-export；签名文档见
// .opencode/skills/noteviz-note-writing/COMPONENTS.md
export {
  BarChart,
  CompareTable,
  DoDont,
  MemoryCard,
  OutputTimeline,
  Timeline,
  VizBlock,
} from "./core";
export { Callout, type CalloutKind } from "./Callout";
export { CrossRef } from "./CrossRef";
export { LayerStack } from "./LayerStack";
export { MemoryMap } from "./MemoryMap";
export { Prerequisite } from "./Prerequisite";
export { SequenceDiagram } from "./SequenceDiagram";
export { ShortcutTable } from "./ShortcutTable";
export { SpecQuote } from "./SpecQuote";
export { StateFlow } from "./StateFlow";
export { Table } from "./Table";
export { VersionNote } from "./VersionNote";
