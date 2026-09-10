import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "合成事件到底是什么：一套事件委托机制",
  description:
    "onClick 不会挂在那个 DOM 上：React 把事件委托到 root 容器，原生事件冒泡到顶后沿 Fiber 树模拟传播。换来跨浏览器统一、监听器 O(1) 和事件优先级。",
  difficulty: "进阶",
  tags: ["React", "合成事件", "事件委托"],
  updated: "2026-09-10",
} satisfies NoteMeta;
