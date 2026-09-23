import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "Windows 压的 zip 为什么中文乱码？",
  description:
    "文件名按原始字节存进包里，编码全靠标志位声明：老 Windows 工具写 GBK 字节且不设 UTF-8 标志，macOS 按 UTF-8 解读就成乱码——名字错，内容不坏。",
  type: "question",
  difficulty: "入门",
  tags: ["zip", "编码", "GBK", "UTF-8", "跨平台"],
  updated: "2026-09-11",
} satisfies NoteMeta;
