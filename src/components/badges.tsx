import type { Difficulty, NoteType } from "@/lib/types";
import { PALETTE } from "./palette";

// ---- 难度徽章体系 ----

export function difficultyLevel(d: Difficulty): number {
  switch (d) {
    case "入门":
      return 2;
    case "进阶":
      return 3;
    case "高级":
      return 4;
  }
}

const LEVEL_COLORS = ["", "var(--muted)", "var(--accent)", "var(--warn)", "var(--success)"];

export function DifficultyDots({ level }: { level: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1" aria-label={`难度 ${level} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="h-[7px] w-[7px] rounded-full border"
          style={{
            background: i <= level ? LEVEL_COLORS[level] : "transparent",
            borderColor: i <= level ? LEVEL_COLORS[level] : "var(--muted)",
          }}
        />
      ))}
    </span>
  );
}

export function difficultyBadgeClass(d: Difficulty): string {
  switch (d) {
    case "入门":
      return "bg-success/10 text-success";
    case "进阶":
      return "bg-warn/10 text-warn";
    case "高级":
      return "bg-danger/10 text-danger";
  }
}

// ---- 笔记类型徽章体系 ----

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
