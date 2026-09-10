import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "TS 是怎么找到 npm 包的类型声明的？",
  description:
    "两条独立管道：按导入解析（扩展名尝试 → exports/types 字段 → typesVersions → @types 回退 → noImplicitAny 报错）与全局注入（typeRoots 自动收录、types 白名单）。@types 与主包没有版本自动联动——对齐靠纪律。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["类型查找", "@types", "typeRoots", "typesVersions"],
  updated: "2026-09-10",
} satisfies NoteMeta;
