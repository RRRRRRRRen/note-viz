import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "同一文件为什么有时冲突有时不冲突？",
  description:
    "合并不是把两份代码拼起来，而是带参照系的三方对比：先找 merge-base，再逐区域裁决——冲突的粒度是区域而不是文件。本篇解释冲突判定规则、快进与 --no-ff 的两种合并场景（真实仓库重放）、squash 的取舍，以及冲突标记的每一行是什么。",
  difficulty: "入门",
  tags: ["Git", "merge", "冲突", "merge-base", "fast-forward", "squash"],
  updated: "2026-09-10",
} satisfies NoteMeta;
