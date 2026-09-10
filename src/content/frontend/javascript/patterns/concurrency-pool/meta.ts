import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "怎么把并发请求数限制在 N 以内？",
  description:
    "worker 池动态补位 vs 固定分片、游标的单线程原子性、按原始索引落位保序；延伸 p-limit 信号量与 Promise.retry、AbortController 集成。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["Promise", "并发控制", "异步", "手写题"],
  updated: "2026-09-10",
} satisfies NoteMeta;
