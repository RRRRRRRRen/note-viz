import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "零信任网络到底「零」了什么？",
  description:
    "零信任的架构内核：删掉按网络位置的默认信任、换锚点为身份+设备+上下文并持续验证，连接器只出不进的暗网络结构、设备 posture 采集、CI 的 OIDC 短期凭证与 Tailscale ACL 的源端丢弃语义。",
  difficulty: "高级",
  type: "knowledge",
  tags: ["零信任", "SDP", "持续验证", "OIDC", "设备 posture"],
  updated: "2026-09-10",
} satisfies NoteMeta;
