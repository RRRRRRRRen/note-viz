import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "scp 和 rsync 怎么选？",
  description:
    "scp 与 rsync 共用 ssh 底座：scp 的一次性全量拷贝与 OpenSSH 9.0 起的 SFTP 底层、rsync 的 delta 增量算法与断点续传/排除规则/镜像语义，附尾斜杠语义与 --delete 风险的真实实验。",
  difficulty: "入门",
  tags: ["scp", "rsync", "sftp", "文件传输", "增量同步"],
  updated: "2026-09-10",
} satisfies NoteMeta;
