import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "容器跑起来后页面 502，怎么一步步排查？",
  description:
    "容器排障四件套 ps/logs/exec/inspect 与三条典型故障路径：502（nginx 活着身后死了）、容器秒退（logs 找口供）、页面 404 或欢迎页（配置没生效），以及 exec 改配置的假阳性陷阱。",
  difficulty: "入门",
  type: "practice",
  tags: ["docker exec", "docker logs", "502", "排障", "端口映射"],
  updated: "2026-09-08",
} satisfies NoteMeta;
