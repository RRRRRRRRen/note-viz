import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "浏览器和服务器怎么协商压缩？",
  description:
    "Accept-Encoding 声明能力，Content-Encoding 宣布结果，Vary 让缓存层区分版本；工程落地是文本清单 + 排除项 + 静态预压缩三件套。",
  type: "question",
  difficulty: "进阶",
  tags: ["HTTP", "Content-Encoding", "Accept-Encoding", "Vary", "nginx"],
  updated: "2026-09-10",
} satisfies NoteMeta;
