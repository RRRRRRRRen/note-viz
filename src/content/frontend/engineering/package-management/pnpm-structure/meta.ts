import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "pnpm 凭什么又快又省还封杀幽灵依赖？",
  description:
    "全局内容寻址 store 存一份文件，项目内用硬链接零拷贝、符号链接组装依赖图，顶层只暴露直接依赖——磁盘省、安装快、幽灵依赖物理上看不见。附实测目录结构与 .modules.yaml 环境指纹。",
  difficulty: "进阶",
  tags: ["pnpm", "node_modules", "符号链接", "幽灵依赖"],
  updated: "2026-09-09",
} satisfies NoteMeta;
