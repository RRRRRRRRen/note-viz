import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "日常操作与撤销",
  description:
    "add/commit/status/diff 的本质是三区之间的搬运与对比，而「改错了怎么办」只需要一张撤销决策树：按改动位置（工作区/index/本地提交/远程）选工具，reset 三档动哪两区、revert 与 reset 的安全边界、stash 的双 parent 本质，一张表查清。",
  difficulty: "入门",
  tags: ["Git", "add", "commit", "diff", "reset", "revert", "stash"],
  updated: "2026-09-03",
} satisfies NoteMeta;
