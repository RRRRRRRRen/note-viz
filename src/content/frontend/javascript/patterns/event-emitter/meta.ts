import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "发布订阅是怎么实现的：手写事件总线",
  description:
    "on/emit/off/once 的最小实现与机制细节：Map+Set 的选型理由、once 的重入防护与原引用保留、emit 同步执行与抛错断链、订阅泄漏。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["发布订阅", "EventEmitter", "设计模式", "手写题"],
  updated: "2026-09-10",
} satisfies NoteMeta;
