import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "为什么各机器装出来的依赖会不一样？",
  description:
    "package.json 只声明区间不锁版本，而「装依赖」= 解析 + 下载 + 物化三步。Node 版本、包管理器、registry 时刻三个自由度任何一个不同，结果就不同——以及逐层钉死的方案体系。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["npm", "pnpm", "环境一致性", "工程化"],
  updated: "2026-09-09",
} satisfies NoteMeta;
