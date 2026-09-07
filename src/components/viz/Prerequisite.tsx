import { ArrowRight, BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** 前置知识块：学习本篇前应读的站内笔记（放笔记开头；结尾的延伸用 CrossRef） */
export function Prerequisite(props: {
  notes: { title: string; to: string }[];
  children?: ReactNode;
}) {
  return (
    <aside className="my-4 rounded-lg border border-border bg-surface/60 px-4 py-3">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-accent">
        <BookOpen size={14} />
        前置知识
      </div>
      {props.children && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{props.children}</p>
      )}
      <ul className="mt-2 space-y-1">
        {props.notes.map((n) => (
          <li key={n.to}>
            <Link
              to={n.to}
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <ArrowRight size={12} />
              {n.title}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
