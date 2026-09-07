import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "Spring Boot 自动配置原理",
  description:
    "starter 加依赖即生效的完整链路：imports 文件发现、按类型契约装配、before/after 排序与条件装配。",
  difficulty: "进阶",
  tags: ["Spring Boot", "自动配置", "Starter", "IoC"],
  updated: "2026-08-28",
} satisfies NoteMeta;
