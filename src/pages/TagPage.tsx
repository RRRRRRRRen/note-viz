import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Tag } from "lucide-react";
import { notesByTag } from "@/lib/registry";
import { NoteRow } from "@/components/NoteRow";

/** 标签聚合页：跨领域列出携带同一标签的全部笔记（按更新时间倒序） */
export default function TagPage() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const label = tag === undefined ? "" : decodeURIComponent(tag);
  const notes = notesByTag(label);

  return (
    <div className="mx-auto max-w-[1120px] px-8 py-7">
      <nav className="mb-5 flex items-center gap-2 text-[11px] text-muted meta-mono">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="返回上一页"
          className="flex items-center gap-1 transition-colors hover:text-foreground"
        >
          <ArrowLeft size={12} />
          返回
        </button>
        <span className="text-border">/</span>
        <Link to="/" className="hover:text-foreground">
          NoteViz
        </Link>
        <span className="text-border">/</span>
        <span>标签</span>
        <span className="text-border">/</span>
        <span className="text-foreground">{label}</span>
      </nav>

      <header className="mb-6">
        <p className="eyebrow">标签聚合</p>
        <h1 className="flex items-center gap-3 text-3xl leading-tight font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 text-accent">
            <Tag size={18} />
          </span>
          {label}
        </h1>
        <p className="mt-2 text-[13px] text-muted">{notes.length} 篇笔记 · 按更新时间排序</p>
      </header>

      {notes.length === 0 ? (
        <div className="p-8 text-muted">没有携带该标签的笔记</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {notes.map((n) => (
            <NoteRow key={n.path} note={n} />
          ))}
        </div>
      )}
    </div>
  );
}
