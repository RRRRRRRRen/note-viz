import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "5 行的 Dockerfile 是怎么变成镜像的？",
  description:
    "FROM/RUN/WORKDIR/COPY 四指令逐行拆解一份真实的 nginx 前端镜像装配清单：FROM 继承的不只是文件系统、COPY 拷目录拷的是内容、五行里只有三行承重，以及 COPY 目标与 nginx root 的生死暗约定。",
  difficulty: "进阶",
  tags: ["Dockerfile", "docker build", "COPY", "FROM", "nginx"],
  updated: "2026-09-10",
} satisfies NoteMeta;
