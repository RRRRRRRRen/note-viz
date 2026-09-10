import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "write() 返回 false 之后会怎样？",
  description:
    "write() 返回 false 与 drain 的精确时机、highWaterMark 的水位线语义（64KiB 与 objectMode）、pipe/pipeline 的背压传导与错误清理、stream/promises 用法。",
  difficulty: "高级",
  tags: ["Stream", "背压", "Node.js"],
  updated: "2026-09-10",
} satisfies NoteMeta;
