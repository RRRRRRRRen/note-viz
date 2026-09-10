import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "为什么有了索引还要回表？",
  description:
    "两棵 B+ 树与扇出直觉、回表的随机 I/O 成本、覆盖索引命中条件（Using index）与 ICP 的边界、联合索引最左前缀与顺序设计。",
  difficulty: "进阶",
  tags: ["索引", "B+树", "MySQL"],
  updated: "2026-09-10",
} satisfies NoteMeta;
