import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "backpressure 背压：流为什么不会撑爆内存",
  description: "从流动模式与暂停模式讲到 pipe 的背压传导，附 highWaterMark 交互演示。",
  difficulty: "高级",
  tags: ["Stream", "背压", "Node.js"],
  updated: "2026-08-23",
} satisfies NoteMeta;
