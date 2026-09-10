import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "一次前端部署是怎么从 dist 走到线上的？",
  description:
    "构建 dist → docker build 打镜像 → push 私服 → 集群 pull 并更新容器：五步链路与三个角色（构建机/镜像仓库/运行集群）的分工，以及为什么前端部署的全部就是 dist + nginx。",
  difficulty: "入门",
  type: "knowledge",
  tags: ["Docker", "前端部署", "nginx", "CI", "K8s"],
  updated: "2026-09-10",
} satisfies NoteMeta;
