import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "堡垒机为什么看得到加密流量？",
  description:
    "堡垒机的机制内核：会话终结代理（≈TLS 终结网关）与 ProxyJump 透传的分水岭「经过 ≠ 可见」、4A 模型与建连授权/旁路录制的工作方式、WAL 式审计录像的防抵赖设计，以及审计旁路与影子直连的陷阱。",
  difficulty: "进阶",
  tags: ["堡垒机", "会话终结", "审计", "4A", "TLS 终结"],
  updated: "2026-09-10",
} satisfies NoteMeta;
