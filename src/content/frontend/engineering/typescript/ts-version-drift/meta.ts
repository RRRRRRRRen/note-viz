import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "编辑器和构建的类型检查为什么会不一致？",
  description:
    "同一个类型内核的两种运行形态会漂移，来源只有两个：版本不一致与推断项目。治理手法是声明式统一：lockfile 锁死唯一事实源，VSCode 用 tsdk 指路（首次需一次性授权），IDEA 默认自动探测项目的 node_modules/typescript。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["TypeScript", "版本漂移", "tsserver", "tsdk", "lockfile"],
  updated: "2026-09-10",
} satisfies NoteMeta;
