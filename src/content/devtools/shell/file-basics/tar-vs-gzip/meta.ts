import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "为什么有了 gzip 还需要 tar？",
  description:
    "gzip 只认一条字节流，tar 负责把目录树连元数据装订成那条流；.tar.gz 是先装订后压缩的两层套娃，纯 .tar 不压缩反而变大。",
  type: "question",
  difficulty: "入门",
  tags: ["tar", "gzip", "打包", "归档"],
  updated: "2026-09-10",
} satisfies NoteMeta;
