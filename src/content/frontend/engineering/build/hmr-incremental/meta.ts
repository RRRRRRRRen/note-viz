import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "HMR 是怎么做到只替换一块代码的？",
  description:
    "增量编译生成 manifest 与 update chunk，HMR runtime 经 WebSocket 通知后拉取补丁，沿 accept 边界热替换模块；无边界则冒泡到入口退化为整页刷新。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["webpack", "HMR", "热更新", "dev-server"],
  updated: "2026-09-08",
} satisfies NoteMeta;
