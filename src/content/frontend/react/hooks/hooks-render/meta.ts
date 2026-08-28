import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "useState 慢吗：重新认识渲染与批处理",
  description: "从 setState 触发到 commit，拆解 React 渲染流水线、自动批处理与闭包陷阱。",
  difficulty: "进阶",
  tags: ["React", "Hooks", "批处理"],
  updated: "2026-08-26",
} satisfies NoteMeta;
