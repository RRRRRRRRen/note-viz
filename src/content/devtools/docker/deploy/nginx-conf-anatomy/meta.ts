import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "nginx.conf 是怎么让页面和接口都通的？",
  description:
    "一份真实前端容器配置逐行拆解：location / 的静态托管与 try_files 历史路由回退、location /admin-api/ 的反向代理与 proxy_pass 斜杠语义、WebSocket 升级头，以及同域部署下 CORS 头为什么是冗余的。",
  difficulty: "进阶",
  tags: ["nginx", "try_files", "反向代理", "CORS", "history 路由"],
  updated: "2026-09-10",
} satisfies NoteMeta;
