import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "import 的模块是怎么被解析找到的？",
  description:
    "moduleResolution 决定「导入说明符 → 磁盘文件」的算法，必须对齐真正加载你代码的运行时。bundler 档是官方定义的标准交集：CommonJS 的无扩展名 + ESM 的 import 条件优先。paths 与 vite alias 是必须人肉对齐的双份事实。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["moduleResolution", "模块解析", "paths", "alias", "exports"],
  updated: "2026-09-10",
} satisfies NoteMeta;
