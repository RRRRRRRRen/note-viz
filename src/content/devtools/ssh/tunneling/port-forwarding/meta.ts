import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "ssh -L 的两个端口号分别是谁的？",
  description:
    "端口转发的本体：SSH 连接层 channel 多路复用、本地转发 -L / 远程转发 -R / SOCKS 动态代理 -D 三种模式的数据流向与视角解析、GatewayPorts 的暴露面控制，以及后台隧道与目标视角的经典陷阱。",
  difficulty: "进阶",
  tags: ["SSH", "端口转发", "隧道", "SOCKS", "GatewayPorts"],
  updated: "2026-09-10",
} satisfies NoteMeta;
