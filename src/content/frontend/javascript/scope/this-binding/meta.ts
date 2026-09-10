import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "this 到底指向谁？",
  description:
    "this 由调用方式注入：new > 显式 > 隐式 > 默认，箭头函数词法捕获——三大丢失现场与修复姿势。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["this", "箭头函数", "作用域", "面试"],
  updated: "2026-09-10",
} satisfies NoteMeta;
