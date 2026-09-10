import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "origin/main 是远程上的分支吗？",
  description:
    "origin/main 不是远程服务器上的分支，而是它在你本地的缓存书签——fetch 的全部工作只是更新对象库和这几个书签文件。本篇拆解 fetch 四步协议、pull 与冲突的真实分工、push 被拒时的指针视角解释，以及 fork 协作的 origin/upstream 双远程模型。",
  difficulty: "入门",
  tags: ["Git", "fetch", "pull", "push", "远程分支", "origin", "fork"],
  updated: "2026-09-10",
} satisfies NoteMeta;
