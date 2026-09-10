import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "类型检查、lint、格式化为什么不打架？",
  description:
    "重复是常态，冲突要分型：同内核多形态（防漂移）、多内核抢职责（指定唯一权威）、接缝双事实漂移（收敛单一源）。治理四板斧：投影、委托、契约、版本锚定。原则句：同一职责允许多形态，不允许多内核。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["工具治理", "oxlint", "oxfmt", "职责分离", "CI"],
  updated: "2026-09-10",
} satisfies NoteMeta;
