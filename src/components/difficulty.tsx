import type { Difficulty } from "@/lib/types";

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
