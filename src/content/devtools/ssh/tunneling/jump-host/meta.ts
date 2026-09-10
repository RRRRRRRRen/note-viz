import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "跳板机是怎么控制访问的？",
  description:
    "跳板机的全部机制：路由不通时的中转拓扑、ssh -J 与 ProxyJump（OpenSSH 7.3+）的 TCP 层端到端穿透、「流量路过 ≠ 流量可见」的信任模型、sshd_config 加固与 PermitOpen 白名单，以及它管不了的审计天花板。",
  difficulty: "进阶",
  type: "knowledge",
  tags: ["跳板机", "ProxyJump", "ssh -J", "访问控制", "sshd 加固"],
  updated: "2026-09-10",
} satisfies NoteMeta;
