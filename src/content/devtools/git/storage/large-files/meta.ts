import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "仓库为什么被几张大文件撑爆？",
  description:
    "二进制大文件是内容寻址模型的死角：diff 没意义、delta 压缩对已压缩格式失效、每个版本都是一个完整 blob 进包。本篇讲清大文件的克隆税从哪来，Git LFS 的指针文件机制、DVC 与 partial clone 两条替代路线，以及已经入库的大文件怎么用 filter-repo 清史。",
  difficulty: "进阶",
  tags: ["Git", "Git LFS", "大文件", "二进制", "partial clone", "DVC"],
  updated: "2026-09-10",
} satisfies NoteMeta;
