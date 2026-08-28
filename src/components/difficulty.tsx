import type { Difficulty } from "@/lib/types";

export function difficultyBadgeClass(d: Difficulty): string {
  switch (d) {
    case "入门":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "进阶":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "高级":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
  }
}
