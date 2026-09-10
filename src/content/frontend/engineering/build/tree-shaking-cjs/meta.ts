import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "为什么 tree-shaking 摇不动 CJS？",
  description:
    "tree-shaking 依赖 ESM 的静态结构：import/export 是语法声明，CJS 的 require 是运行时调用。三层删除机制（sideEffects / usedExports / PURE）与生产模式的最后一环。",
  difficulty: "进阶",
  tags: ["webpack", "tree-shaking", "ESM", "CommonJS"],
  updated: "2026-09-08",
} satisfies NoteMeta;
