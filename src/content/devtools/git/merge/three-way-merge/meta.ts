import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "三方合并与冲突",
  description:
    "合并不是把两份代码拼起来，而是带参照系的三方对比：先找 merge-base，再逐区域裁决。本篇解释为什么同一个文件有时冲突有时不冲突、快进合并为什么连提交都不产生、以及冲突标记的每一行是什么。",
  difficulty: "入门",
  tags: ["Git", "merge", "冲突", "merge-base", "fast-forward", "squash"],
  updated: "2026-09-03",
} satisfies NoteMeta;
