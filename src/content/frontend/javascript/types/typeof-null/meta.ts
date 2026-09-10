import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: 'typeof null 为什么是"object"？',
  description:
    "三把尺子的原理与边界：typeof 的类型标签实现、instanceof 的原型链与跨 realm 盲区、Object.prototype.toString.call 读内部标签，以及 Array.isArray 为何防伪造。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["类型系统", "typeof", "instanceof", "面试"],
  updated: "2026-09-10",
} satisfies NoteMeta;
