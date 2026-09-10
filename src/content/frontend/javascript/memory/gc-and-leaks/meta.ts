import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "JS 是怎么释放内存的：GC 与泄漏排查",
  description:
    "标记清除与引用计数的算法对比、四种经典泄漏场景的引用链分析、GC 暂停的量级直觉、DevTools 排查流程与 WeakMap 的正确用法。",
  difficulty: "高级",
  tags: ["垃圾回收", "内存泄漏", "标记清除", "GC"],
  updated: "2026-09-10",
} satisfies NoteMeta;
