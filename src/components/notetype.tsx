import type { NoteType } from "@/lib/types";
import { PALETTE } from "./palette";

export const NOTE_TYPE_LABEL: Record<NoteType, string> = {
  knowledge: "知识",
  question: "问题",
  practice: "实战",
  draft: "草稿",
};

const NOTE_TYPE_COLOR: Record<NoteType, string> = {
  knowledge: PALETTE.blue,
  question: PALETTE.purple,
  practice: PALETTE.green,
  draft: PALETTE.gray,
};

/** 笔记类型徽章：知识蓝 / 问题紫 / 实战绿 / 草稿灰虚线 */
export function NoteTypeBadge({ type }: { type: NoteType }) {
  const color = NOTE_TYPE_COLOR[type];
  return (
    <span
      className={`rounded px-2 py-0.5 font-sans text-[11px] font-medium ${
        type === "draft" ? "border border-dashed" : "border"
      }`}
      style={{ color, borderColor: `${color}66`, backgroundColor: `${color}14` }}
    >
      {NOTE_TYPE_LABEL[type]}
    </span>
  );
}
