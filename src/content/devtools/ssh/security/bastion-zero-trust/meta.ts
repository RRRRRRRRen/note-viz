import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "堡垒机与零信任",
  description:
    "从个人跳板到企业级访问控制：堡垒机的 4A 模型与「门卫 + 摄像头」工作方式、会话终结代理为什么能看到加密流量、SSH 证书如何用短期凭证消解收钥匙难题、零信任把信任锚点从网络位置换成身份的完整逻辑，以及外网访问内网页面 / 内网连数据库 / CI 部署三个真实场景的端到端流程。",
  difficulty: "进阶",
  tags: ["堡垒机", "零信任", "SSH 证书", "4A", "短期凭证", "SDP"],
  updated: "2026-09-04",
} satisfies NoteMeta;
