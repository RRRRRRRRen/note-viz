import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "zip 为什么能只看清单不解压？",
  description:
    "账本记在包尾：中央目录登记每个文件的位置，unzip -l、单抽、增量更新都只查目录不动数据；代价是 zip 走不了流式管道。",
  type: "question",
  difficulty: "入门",
  tags: ["zip", "文件格式", "中央目录", "压缩"],
  updated: "2026-09-11",
} satisfies NoteMeta;
