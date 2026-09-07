import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "SSH 配置与多远程",
  description:
    "push/pull 背后的传输层：密钥对认证为什么比密码安全、ssh-agent 与 passphrase 缓存、~/.ssh/config 多主机配置（443 绕防火墙）、HTTPS 与 SSH 协议随时互切，以及 fork 协作的 origin/upstream 双远程模型——配一次管十年，出事时知道从哪排查。",
  difficulty: "入门",
  tags: ["Git", "SSH", "密钥", "ssh-agent", "远程仓库", "fork"],
  updated: "2026-09-03",
} satisfies NoteMeta;
