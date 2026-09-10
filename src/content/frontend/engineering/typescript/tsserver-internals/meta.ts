import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "编辑器的 TS 智能是怎么来的？",
  description:
    "VSCode 官方 Wiki 定义：tsserver 是封装编译器与语言服务、通过 JSON 协议暴露它们的 node 可执行文件。编辑器推送文件生命周期，tsserver 内存里常驻一次增量编译，红线、补全、跳转全部来自这次 program。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["tsserver", "语言服务", "VSCode", "LSP", "IDEA"],
  updated: "2026-09-10",
} satisfies NoteMeta;
