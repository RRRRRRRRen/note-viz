import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "为什么没人动 lockfile，它却自己变了？",
  description:
    "add 更新 lockfile 是记账，裸 install 更新是补账——补账说明 lockfile 与 package.json 脱节了。看懂写入语义与 diff 形状，lockfile 变更就从噪音变成最诚实的传感器。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["lockfile", "pnpm", "npm", "代码审查"],
  updated: "2026-09-09",
} satisfies NoteMeta;
