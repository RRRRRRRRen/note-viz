import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "SSH 是怎么保证远程登录安全的？",
  description:
    "从零理解 SSH：ssh 客户端与 sshd 服务端（≈curl 与 nginx）的分工、一次连接从 TCP 握手到用户认证的七步流程、为什么「抓包拿不到密码」但密钥认证仍然更强、登录状态为什么就是那条活的 TCP 连接，以及远程执行命令的脚本化用法。",
  difficulty: "入门",
  type: "knowledge",
  tags: ["SSH", "sshd", "密钥认证", "远程执行"],
  updated: "2026-09-10",
} satisfies NoteMeta;
