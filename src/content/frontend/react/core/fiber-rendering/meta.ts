import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "Fiber 为什么能让渲染可中断？",
  description:
    "把组件树从递归调用栈改写成链表工作单元：render 阶段可中断可丢弃，commit 阶段同步一次到位；双缓存保存现场，lane 位图表达优先级。",
  difficulty: "高级",
  tags: ["React", "Fiber", "并发渲染", "调度"],
  updated: "2026-09-10",
} satisfies NoteMeta;
