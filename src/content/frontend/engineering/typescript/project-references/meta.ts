import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "references 和 tsc -b 解决什么？",
  description:
    "references 声明项目依赖图，tsc -b 按拓扑序增量构建；契约墙让依赖方只读被依赖方的 .d.ts 而不重查源码。没有 references 时 tsc -b 退化为带增量的 tsc——这也是单仓库日后拆分预留的门。",
  difficulty: "高级",
  tags: ["tsc -b", "project references", "tsbuildinfo", "monorepo"],
  updated: "2026-09-10",
} satisfies NoteMeta;
