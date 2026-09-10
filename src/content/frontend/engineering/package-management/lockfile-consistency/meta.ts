import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "lockfile 是如何保证依赖树一致的？",
  description:
    "解析把区间翻译成精确版本，lockfile 把解析结果连同 integrity 哈希一起固化成文件——之后所有人跳过解析、按坐标落盘、逐包校验，配合 frozen/ci 只读消费，人人同树。",
  difficulty: "进阶",
  tags: ["lockfile", "npm", "pnpm", "依赖解析"],
  updated: "2026-09-09",
} satisfies NoteMeta;
