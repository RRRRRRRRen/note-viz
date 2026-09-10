import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "前端实际用得到多少 TS 功能？",
  description:
    "九成日常书写只用到一小撮功能：类型标注、联合、泛型的使用、收窄与几个工具类型。类型系统的复杂度服务两类消费者——给 JS 动态模式找静态建模、让库作者写精确契约。应用前端是类型的消费者不是生产者。",
  difficulty: "入门",
  tags: ["TypeScript", "工具类型", "const enum", "namespace", "学习路径"],
  updated: "2026-09-10",
} satisfies NoteMeta;
