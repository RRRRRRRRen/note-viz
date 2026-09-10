import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "gzip 为什么能压小文件？",
  description:
    "DEFLATE 两轮冗余消除：LZ77 把重复序列换成回引，Huffman 按频率重分配码长；级别只调压缩端卖力程度，解压与级别无关。",
  type: "question",
  difficulty: "进阶",
  tags: ["gzip", "DEFLATE", "LZ77", "Huffman", "压缩算法"],
  updated: "2026-09-10",
} satisfies NoteMeta;
