import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "团队的提交历史要遵守什么规范？",
  description:
    "多人协作的历史质量不靠自觉，靠两条规范：功能分支工作流让 main 永远可用、改动经 PR 评审后进主干；Conventional Commits 让每个提交自带机器可读的 type 路标。本篇讲清四步循环的机制依据、七个常用 type、以及 squash/rebase 合并方式对历史形状的影响。",
  difficulty: "入门",
  type: "knowledge",
  tags: ["Git", "工作流", "Conventional Commits", "功能分支", "PR", "提交规范"],
  updated: "2026-09-10",
} satisfies NoteMeta;
