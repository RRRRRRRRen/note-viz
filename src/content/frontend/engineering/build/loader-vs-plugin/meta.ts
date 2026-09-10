import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "Loader 与 Plugin 的分界线在哪里？",
  description:
    "loader 管文件内容转换（纯函数管道），plugin 管构建生命周期介入（Tapable 钩子）。分界线、数据流、无状态纪律与 Tapable 同步异步家族。",
  difficulty: "进阶",
  tags: ["webpack", "loader", "plugin", "Tapable"],
  updated: "2026-09-08",
} satisfies NoteMeta;
