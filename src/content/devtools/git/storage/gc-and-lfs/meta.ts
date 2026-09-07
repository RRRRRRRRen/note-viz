import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "存储、GC 与大文件",
  description:
    "Git 平时把每个对象存成独立小文件（松散对象），GC 时打包成 packfile 并做 delta 压缩——这是唯一真正用 diff 思想的地方，但只是存储层的透明优化。本篇讲清松散对象与 packfile 的分工、checkout 为什么不慢、二进制文件的出路，以及提交什么时候才真的被删除。",
  difficulty: "入门",
  tags: ["Git", "GC", "packfile", "delta 压缩", "Git LFS", "sparse-checkout"],
  updated: "2026-09-03",
} satisfies NoteMeta;
