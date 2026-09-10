import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "useLayoutEffect 到底差在哪一帧？",
  description:
    "两者都在 commit 更新 DOM 之后执行，分界线是浏览器绘制：useLayoutEffect 在 paint 前同步执行（会阻塞绘制），useEffect 排在 paint 之后异步执行。测量 DOM 防闪烁是前者的正当场景，其余九成场景用后者。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["React", "Hooks", "useEffect", "渲染"],
  updated: "2026-09-10",
} satisfies NoteMeta;
