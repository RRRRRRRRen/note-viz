import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "为什么 Vite 转译 TS 却不做类型检查？",
  description:
    "三个理由：dev 契约是毫秒级、转译不需要懂类型、tsc 是批处理 CLI 不是转换服务。Vite 官方口径只转译不检查，检查外包给 tsc：先审计后打包。Webpack 生态用 fork-ts-checker 收敛到同一终态。",
  difficulty: "进阶",
  tags: ["Vite", "esbuild", "Oxc", "类型检查", "Webpack"],
  updated: "2026-09-10",
} satisfies NoteMeta;
