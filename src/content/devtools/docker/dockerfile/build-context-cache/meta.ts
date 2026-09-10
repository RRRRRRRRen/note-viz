import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "为什么构建上下文越大 build 越慢？",
  description:
    "docker build 的第一步是把整个上下文目录打包上传，之后才轮到 Dockerfile：COPY 挑文件发生在上传之后。.dockerignore 黑名单与小目录白名单的取舍、层缓存与指令顺序的失效规则。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["docker build", "构建上下文", "dockerignore", "层缓存"],
  updated: "2026-09-10",
} satisfies NoteMeta;
