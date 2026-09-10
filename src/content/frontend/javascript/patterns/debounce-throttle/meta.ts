import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "防抖和节流到底差在哪？",
  description:
    "输出节奏语义的分野：防抖重置式延迟（等停下）、节流固定窗口（按节奏来）。实现要点（immediate/leading+trailing/cancel）、React 重渲染陷阱与 rAF 变体。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["防抖", "节流", "事件", "定时器"],
  updated: "2026-09-10",
} satisfies NoteMeta;
