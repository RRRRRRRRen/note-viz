import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "restore、reset、revert 怎么选？",
  description:
    "撤销不是一条命令而是按改动位置路由：restore 管文件级（工作区与 index 之间），reset 管提交级（回拨分支指针，三档决定连带清理哪两区），revert 管共享历史（追加反向提交）。本篇带真实仓库重放的 reset 三档实验、revert -m 的 parent 选择，以及 stash 的双 parent 提交本质。",
  difficulty: "入门",
  type: "knowledge",
  tags: ["Git", "restore", "reset", "revert", "stash", "撤销"],
  updated: "2026-09-10",
} satisfies NoteMeta;
