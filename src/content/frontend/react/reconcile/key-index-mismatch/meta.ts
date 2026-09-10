import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "用 index 做 key 为什么会状态错位？",
  description:
    "diff 靠三假设把 O(n³) 降到 O(n)，key 表达身份而非位置；index 做 key 在增删排序时让 React 复用错节点——输入残留、动画串位、选中漂移的根源。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["React", "diff", "key", "协调"],
  updated: "2026-09-10",
} satisfies NoteMeta;
