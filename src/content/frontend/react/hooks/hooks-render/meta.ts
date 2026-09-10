import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "连续 setState 为什么只加一次：批处理",
  description:
    "从使用者视角拆解批处理：三次 setCount(count + 1) 是闭包快照下的三次「替换为 1」，React 18 起自动批处理覆盖所有场景，flushSync 是唯一逃生舱。",
  difficulty: "进阶",
  tags: ["React", "Hooks", "批处理", "useState"],
  updated: "2026-09-10",
} satisfies NoteMeta;
