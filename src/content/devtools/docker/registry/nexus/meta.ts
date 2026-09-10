import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "Nexus 是什么：为什么公司都要自建制品仓库？",
  description:
    "Nexus 是一台自建的多格式私有制品仓库服务器：公共源在规模化后的四大痛点、proxy / hosted / group 三种仓库角色的分工协作与协作拓扑、Docker 仓库为什么必须独占端口连接器，以及收口、磁盘治理三个常见运维陷阱。",
  difficulty: "入门",
  type: "knowledge",
  tags: ["Nexus", "制品仓库", "Docker Registry", "npm 私服", "供应链安全"],
  updated: "2026-09-10",
} satisfies NoteMeta;
