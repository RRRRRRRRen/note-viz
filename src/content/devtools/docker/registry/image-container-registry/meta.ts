import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "Docker 的镜像、容器、仓库是什么关系？",
  description:
    "镜像＝只读的标准化软件包，容器＝这个包跑起来的隔离进程，仓库＝集中存取与分发镜像的服务。镜像名三段式与各段默认值、最小命令集 pull/push/images/rmi/login 一次讲清。",
  difficulty: "入门",
  tags: ["Docker", "镜像", "容器", "镜像仓库", "tag"],
  updated: "2026-09-10",
} satisfies NoteMeta;
