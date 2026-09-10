import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: ".d.ts 声明文件到底解决什么问题？",
  description:
    ".d.ts 是只描述「有什么」不含「怎么做」的合同文件：给存量 JS 补类型、TS 库的发布形态、描述宿主环境、声明无类型模块。文件级靠名字相邻匹配（Button.js ↔ Button.d.ts），内容级只有信任没有验证——声明面即类型面。",
  difficulty: "进阶",
  tags: ["declaration", ".d.ts", "declare", "类型声明"],
  updated: "2026-09-10",
} satisfies NoteMeta;
