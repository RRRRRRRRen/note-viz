import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "怎么让每次合并都留下 merge 记录？",
  description:
    "想让 git log 里每个 merge commit 都对应一次真实的功能合入：merge.ff false 强制造合并节点，但同一条配置会让日常 pull 积累噪音 merge；pull.rebase merges 让 pull 走保留合并结构的 rebase，两者配套才成立。本篇用三组真实仓库实验验证配置行为，并推导客户端强制的不可能边界——配置不随仓库分发、钩子拦不住快进——最终指向服务端强制点。",
  difficulty: "进阶",
  type: "question",
  tags: ["Git", "merge", "fast-forward", "merge.ff", "pull.rebase", "git config"],
  updated: "2026-09-23",
} satisfies NoteMeta;
