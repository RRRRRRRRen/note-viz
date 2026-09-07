import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "深浅拷贝：值与引用的分界",
  description:
    "赋值/浅拷贝/深拷贝三层语义、JSON 拷贝的缺陷清单、structuredClone 边界、递归 + WeakMap 满分实现。",
  difficulty: "进阶",
  tags: ["深拷贝", "浅拷贝", "WeakMap", "面试"],
  updated: "2026-08-28",
} satisfies NoteMeta;
