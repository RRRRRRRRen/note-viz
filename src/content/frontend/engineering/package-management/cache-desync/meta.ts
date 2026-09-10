import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "为什么删了 node_modules 重装就好了？",
  description:
    "删除有效不是因为缓存烂了，而是缓存与数据源脱节——删除等于手动失效。项目里有四层缓存，删哪层有效本身就是诊断信号；删除之后该追问的是：哪一层的 key 漏看了哪个输入。",
  difficulty: "进阶",
  tags: ["缓存", "node_modules", "调试", "工程化"],
  updated: "2026-09-09",
} satisfies NoteMeta;
