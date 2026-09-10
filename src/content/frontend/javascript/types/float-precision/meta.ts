import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "0.1 + 0.2 为什么不等于 0.3？",
  description:
    "IEEE 754 双精度的二进制分数表示：为什么 0.1 无法精确存储、0.1 + 0.2 的舍入推演、Number.EPSILON 容差比较、toFixed 陷阱与金额处理方案。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["IEEE 754", "浮点数", "精度", "面试"],
  updated: "2026-09-10",
} satisfies NoteMeta;
