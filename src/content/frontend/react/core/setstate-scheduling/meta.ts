import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "setState 之后 React 做了什么？",
  description:
    "setState 不改状态只投递：update 入队、组件标记、调度器合并渲染。批处理从 React 17 的事件系统行为升级为 18 的调度器行为，flushSync 是唯一逃生舱。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["React", "setState", "批处理", "调度"],
  updated: "2026-09-10",
} satisfies NoteMeta;
