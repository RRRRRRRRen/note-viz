import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "FROM 官方镜像后，默认行为是怎么保留的？",
  description:
    "FROM 继承的不只是文件系统，还有 ENV/EXPOSE/ENTRYPOINT/CMD 全套元数据；覆盖规则是同键覆盖、后写者赢；容器启动 = ENTRYPOINT + CMD 拼接执行——nginx 镜像的启动钩子脚本就是这么工作的。",
  difficulty: "进阶",
  tags: ["FROM", "ENTRYPOINT", "CMD", "启动钩子", "继承"],
  updated: "2026-09-10",
} satisfies NoteMeta;
