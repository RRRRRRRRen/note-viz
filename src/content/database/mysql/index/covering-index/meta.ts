import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "覆盖索引与回表：一次查询到底读了多少数据",
  description: "从 B+ 树结构讲到回表成本，解释覆盖索引为什么快、联合索引顺序怎么定。",
  difficulty: "进阶",
  tags: ["索引", "B+树", "MySQL"],
  updated: "2026-08-22",
} satisfies NoteMeta;
