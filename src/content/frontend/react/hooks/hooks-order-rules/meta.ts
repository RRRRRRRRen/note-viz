import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "Hook 为什么不能写在条件语句里？",
  description:
    "Hook 状态按调用顺序挂在 Fiber 的 memoizedState 链表上，React 靠「第 N 次调用对应第 N 个节点」对号入座；条件或提前 return 让某次渲染少调一个 Hook，整条链错位——轻则状态串台，重则渲染崩塌。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["React", "Hooks", "Fiber", "eslint-plugin-react-hooks"],
  updated: "2026-09-10",
} satisfies NoteMeta;
