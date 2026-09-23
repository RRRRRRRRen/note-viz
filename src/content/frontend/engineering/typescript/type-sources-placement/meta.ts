import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "五类外来类型的落位管理",
  description:
    "按「类型从哪来、由谁维护、写在哪个文件」管理外来类型：构建注入归 vite-env.d.ts + types 白名单（二选一），脚本注入进 src/types/globals.d.ts，无类型包集中到 src/types/modules.d.ts，@types 靠版本联动纪律，API 契约进 shared/api/generated。src/types 只放环境声明，业务类型一律就近。",
  difficulty: "进阶",
  type: "practice",
  tags: ["d.ts", "环境声明", "types 白名单", "declare module", "类型管理"],
  updated: "2026-09-23",
} satisfies NoteMeta;
