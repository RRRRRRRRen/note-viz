import { Link } from "react-router-dom";
import { ChevronRight, FileText } from "lucide-react";
import type { NoteEntry } from "@/lib/types";
import { DifficultyDots, difficultyLevel } from "@/components/difficulty";
import { NoteTypeBadge } from "@/components/notetype";

/** 笔记行卡片：首页最新 / 分类页列表 / 标签聚合页的统一形态（类型徽章 + 难度 + 更新时间） */
export function NoteRow({ note }: { note: NoteEntry }) {
  return (
    <Link
      to={note.path}
      className="grid grid-cols-[minmax(0,1fr)_auto_auto_92px] items-center gap-4 rounded-[10px] border border-border bg-surface px-4 py-3.5 transition-all hover:translate-x-1 hover:border-accent hover:bg-surface-2"
    >
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm leading-snug">
          <FileText size={14} className="shrink-0 text-accent" />
          <span className="truncate">{note.meta.title}</span>
          <NoteTypeBadge type={note.meta.type} />
        </h3>
        <p className="mt-1 truncate text-xs text-muted">{note.meta.description}</p>
      </div>
      <DifficultyDots level={difficultyLevel(note.meta.difficulty)} />
      <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted meta-mono">
        {note.meta.difficulty}
      </span>
      <span className="flex items-center justify-end gap-1 text-[10px] text-muted meta-mono">
        {note.meta.updated}
        <ChevronRight size={12} />
      </span>
    </Link>
  );
}
