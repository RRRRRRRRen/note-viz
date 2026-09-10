import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: ".gz 文件里都装了什么？",
  description:
    "头部十字节（魔数/FLG/MTIME/FNAME）+ DEFLATE 载荷 + CRC32/ISIZE 尾部；多 member 结构让 cat 拼接与日志追加天然合法。",
  type: "question",
  difficulty: "进阶",
  tags: ["gzip", "文件格式", "RFC 1952", "CRC32", "魔数"],
  updated: "2026-09-10",
} satisfies NoteMeta;
