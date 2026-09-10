import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "构建工具到底解决了什么问题？",
  description:
    "从入口递归解析依赖图 → 逐模块转换 → 组装输出：构建的三件事（模块化、转译、打包优化）与 webpack 五步流水线，附 babel 内部与提速三板斧。",
  difficulty: "入门",
  type: "knowledge",
  tags: ["webpack", "构建", "依赖图", "工程化"],
  updated: "2026-09-08",
} satisfies NoteMeta;
