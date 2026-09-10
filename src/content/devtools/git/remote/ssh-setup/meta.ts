import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "ssh 免密推送是怎么配出来的？",
  description:
    "push/pull 背后的传输层：密钥对认证为什么比密码安全、ssh-agent 与 passphrase 缓存、~/.ssh/config 多主机配置（443 绕防火墙）、HTTPS 与 SSH 协议随时互切——配一次管十年，出事时知道从哪排查。",
  difficulty: "入门",
  type: "practice",
  tags: ["Git", "SSH", "密钥", "ssh-agent", "远程仓库"],
  updated: "2026-09-10",
} satisfies NoteMeta;
