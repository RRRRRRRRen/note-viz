import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "没有外网的服务器怎么拿到 Docker 镜像？",
  description:
    "镜像仓库不可达时的标准分发手段：docker save/load 全流程、tag 保持细节、压缩与 ssh 管道直传，以及 save/load vs export/import 的经典考点——搬镜像永远用前者。",
  difficulty: "入门",
  type: "knowledge",
  tags: ["docker save", "docker load", "离线部署", "镜像搬运"],
  updated: "2026-09-10",
} satisfies NoteMeta;
