import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "手写 bind 时，new 为什么能「打败」它？",
  description:
    "call/bind/new/instanceof 四件套的机制深拆：new 优先级高于 bind 的规范依据、this instanceof bound 模拟、prototype 链修复、[[Call]] 与 [[Construct]] 的分野。",
  difficulty: "进阶",
  tags: ["this", "bind", "new", "原型链"],
  updated: "2026-09-10",
} satisfies NoteMeta;
