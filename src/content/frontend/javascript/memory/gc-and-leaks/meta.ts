import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "垃圾回收与内存泄漏排查",
  description: "标记清除与引用计数的差异，四种常见泄漏场景的代码对照，减少 GC 压力的实践。",
  difficulty: "高级",
  tags: ["垃圾回收", "内存泄漏", "标记清除", "GC"],
  updated: "2026-08-28",
} satisfies NoteMeta;
