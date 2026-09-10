import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "git 为什么不存 diff：内容寻址怎么做的？",
  description:
    "Git 之所以快，是因为它从不比较内容、只做哈希查找。本篇拆解快照模型与增量补丁的本质差异，逐层拆开 blob / tree / commit / tag 四种对象的物理存储，并解释 rename 零成本、空目录不追踪这些经典现象为何是模型的必然推论。",
  difficulty: "入门",
  tags: ["Git", "对象模型", "SHA-1", "快照", "blob", "tree", "tag"],
  updated: "2026-09-10",
} satisfies NoteMeta;
