import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "为什么改了副本，原对象也跟着变：深浅拷贝",
  description:
    "赋值/浅拷贝/深拷贝三层语义、JSON 拷贝的缺陷清单、structuredClone 边界、递归 + WeakMap 满分实现。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["深拷贝", "浅拷贝", "WeakMap", "面试"],
  updated: "2026-09-10",
} satisfies NoteMeta;
