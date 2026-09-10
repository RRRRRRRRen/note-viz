import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "制品仓库怎么选：Nexus 还是专项工具？",
  description:
    "一条决策轴回答选型：先数制品种类（格式广度），再看安全深度要求——单一生态用 Verdaccio / registry:2 / Harbor 专项工具，多技术栈 Nexus 一台全包，K8s 重度补 Harbor 拿扫描签名；五个主流工具的定位边界与三个选型陷阱。",
  difficulty: "入门",
  tags: ["制品仓库", "Nexus", "Harbor", "Verdaccio", "选型"],
  updated: "2026-09-10",
} satisfies NoteMeta;
