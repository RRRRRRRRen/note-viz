import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "TypeScript 的声明合并是怎么工作的？",
  description:
    "同名 interface 与 namespace 是加法合并（成员不能同名冲突），type 别名与值同名直接报错；declare module 在脚本文件里是整体覆盖、在模块文件里是补丁增强——同一语法两种语义。扩展内置类型（Window/ImportMetaEnv）全靠 interface 合并，这是它必须是 interface 而非 type 的原因。",
  difficulty: "进阶",
  type: "question",
  tags: ["声明合并", "interface", "declare module", "declare global"],
  updated: "2026-09-23",
} satisfies NoteMeta;
