import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "starter 加个依赖为什么就能生效？",
  description:
    "starter 加依赖即生效的完整链路：imports 文件发现、before/after 排序、条件装配与按类型契约——以及用户 Bean 如何覆盖第三方默认值。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["Spring Boot", "自动配置", "Starter", "IoC"],
  updated: "2026-09-10",
} satisfies NoteMeta;
