import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "部署脚本 deploy.sh 每一步在做什么？",
  description:
    "一个真实生产部署脚本的逐段精读：set -e 快速失败与它的三个豁免场景、getopts 参数解析拆解、材料目录的暗约定、docker build/push 与凭证前提，以及脚本通道与 CI 通道的并存关系。",
  difficulty: "入门",
  type: "practice",
  tags: ["shell", "deploy.sh", "set -e", "getopts", "docker push"],
  updated: "2026-09-10",
} satisfies NoteMeta;
