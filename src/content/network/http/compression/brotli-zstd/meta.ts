import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "gzip、brotli、zstd 怎么选？",
  description:
    "gzip 是 HTTP 标准保底的「地板」，brotli 是 web 静态文本的「天花板」，zstd 在基础设施开疆；策略是 brotli 主力 + gzip 兜底。",
  type: "question",
  difficulty: "进阶",
  tags: ["gzip", "brotli", "zstd", "算法选型", "HTTP"],
  updated: "2026-09-10",
} satisfies NoteMeta;
