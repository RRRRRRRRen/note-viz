import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "SSH 远程登录与安全原理",
  description:
    "从零理解 SSH：ssh 客户端与 sshd 服务端的分工与自启机制、一次连接从 TCP 握手到用户认证的完整七步流程、密钥认证「不传秘密」的签名挑战模型、为什么基于 TCP 也能保持登录状态、以及远程执行命令 / scp / rsync / ~/.ssh/config 四件套的日常用法。",
  difficulty: "入门",
  tags: ["SSH", "sshd", "密钥认证", "scp", "rsync", "ssh config"],
  updated: "2026-09-04",
} satisfies NoteMeta;
