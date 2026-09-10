import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "tsconfig 的一份配置到底谁在读？",
  description:
    "三类读者裁剪阅读：tsc 与 tsserver 全读，esbuild/Oxc/swc/babel 只读少数投影字段，ts-loader 全读（它就是 tsc）。排查配置失效的第一定律：这个字段谁在读。附 baseUrl 退役始末与 verbatimModuleSyntax 的存在理由。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["tsconfig", "verbatimModuleSyntax", "baseUrl", "skipLibCheck"],
  updated: "2026-09-10",
} satisfies NoteMeta;
