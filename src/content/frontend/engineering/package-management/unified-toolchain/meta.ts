import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "几十个项目版本各异，心智怎么统一？",
  description:
    "统一的不该是项目，而是解析机制：全局装一次工具壳（mise），版本由项目目录声明，进入目录自动生效，命令层统一为 mise run dev。声明层是资产，解析层可替换。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["mise", "工程化", "工作流", "开发环境"],
  updated: "2026-09-09",
} satisfies NoteMeta;
