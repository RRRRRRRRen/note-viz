import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "tar 命令行怎么用？",
  description:
    "动词制三招 c/t/x 配 f/v/z，-f 永远放最后；解包前先 -tvf 安检——解包是覆盖合并不是快照恢复，macOS 记得 COPYFILE_DISABLE=1。",
  type: "practice",
  difficulty: "入门",
  tags: ["tar", "命令行", "打包", "归档"],
  updated: "2026-09-10",
} satisfies NoteMeta;
