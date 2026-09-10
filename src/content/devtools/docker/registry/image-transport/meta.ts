import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "镜像怎么从构建机到部署机？",
  description:
    "两条通道的机制与取舍：docker save/load 人工搬运零依赖但丢制品语义，registry push/pull 把版本与分发做成一等公民；save 与 export 的本质分界、按 ID 导出丢 tag 的原因，以及 registry 中转站在多机部署里为什么省不掉。",
  difficulty: "入门",
  type: "knowledge",
  tags: ["Docker", "镜像搬运", "docker save", "Registry", "CI/CD"],
  updated: "2026-09-10",
} satisfies NoteMeta;
