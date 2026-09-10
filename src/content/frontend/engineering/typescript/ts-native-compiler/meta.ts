import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "TypeScript 7 原生化改变了什么？",
  description:
    "编译器用 Go 重写并按平台分发二进制（8-12 倍提速），语言服务换 LSP，strict 默认开启。npm 包只是分发容器——实测启动链里 node 只是几十毫秒的打火机。三角色分工一格没变，真正的破坏面是 JS API 断供。",
  difficulty: "高级",
  tags: ["TypeScript 7", "Go", "tsgo", "原生编译器", "LSP"],
  updated: "2026-09-10",
} satisfies NoteMeta;
