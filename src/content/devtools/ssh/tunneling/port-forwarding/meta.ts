import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "SSH 端口转发与跳板机",
  description:
    "借 SSH 的加密通道访问「够不着」的服务：SSH-CONN 层多路复用与 channel 转发原理、本地转发 -L / 远程转发 -R / SOCKS 动态代理 -D 三种姿势的数据流向、路由不通时跳板机的两跳手动与 ProxyJump 端到端隧道的信任模型差异、以及自建简易跳板机的加固清单与单点风险。",
  difficulty: "进阶",
  tags: ["SSH", "端口转发", "隧道", "SOCKS", "跳板机", "ProxyJump"],
  updated: "2026-09-04",
} satisfies NoteMeta;
