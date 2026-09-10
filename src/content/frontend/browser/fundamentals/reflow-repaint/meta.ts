import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "为什么改一个样式会引发重排：回流与重绘",
  description:
    "一帧的生命周期、脏位与失效传播、强制同步布局与布局抖动、合成层与显存代价——引擎级机制与度量手段。",
  difficulty: "高级",
  type: "knowledge",
  tags: ["回流", "重绘", "合成层", "性能优化", "面试"],
  updated: "2026-09-10",
} satisfies NoteMeta;
