import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "git 的三个区是怎么分工的？",
  description:
    "add/commit/status/diff 的本质是三区之间的搬运与对比：工作区、index 暂存区、对象库各管什么，status 的两列状态码和 diff 的三种形态分别在比哪两区——搞懂方向，日常命令从「背口诀」变成「看图说话」。",
  difficulty: "入门",
  tags: ["Git", "add", "commit", "status", "diff", "暂存区"],
  updated: "2026-09-10",
} satisfies NoteMeta;
