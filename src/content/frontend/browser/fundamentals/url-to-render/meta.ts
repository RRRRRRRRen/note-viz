import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "从输入 URL 到页面渲染，中间发生了什么？",
  description:
    "全景流水线：缓存判定时序（SW → 强缓存 → 协商）、DNS、TCP/TLS、HTTP 演进与渲染管线——浏览器高频考点一条线串起。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["浏览器", "网络", "缓存", "渲染", "面试"],
  updated: "2026-09-10",
} satisfies NoteMeta;
