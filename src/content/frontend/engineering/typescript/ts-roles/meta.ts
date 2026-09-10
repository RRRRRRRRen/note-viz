import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "TypeScript 在工程里到底扮演什么角色？",
  description:
    "TypeScript 在工程里不是一个工具，是三个独立程序：跑批审计的 tsc、常驻内存的语言服务 tsserver、只剥类型不做检查的转译器。运行时没有 TS、产物里也没有 TS——所有工程化问题都是这三个角色的分工问题。",
  difficulty: "进阶",
  tags: ["TypeScript", "tsc", "tsserver", "esbuild", "编译原理"],
  updated: "2026-09-10",
} satisfies NoteMeta;
