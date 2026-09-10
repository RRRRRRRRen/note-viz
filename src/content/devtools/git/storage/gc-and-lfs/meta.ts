import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "git 的垃圾是怎么被回收的？",
  description:
    "Git 平时把每个对象存成独立小文件（松散对象），GC 时打包成 packfile 并做 delta 压缩——这是唯一真正用 diff 思想的地方，但只是存储层的透明优化。本篇讲清松散对象与 packfile 的分工、checkout 为什么不慢、以及提交什么时候才真的被物理删除。",
  difficulty: "入门",
  type: "knowledge",
  tags: ["Git", "GC", "packfile", "delta 压缩", "松散对象", "可达性"],
  updated: "2026-09-10",
} satisfies NoteMeta;
