import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/** 延伸阅读卡：结尾过渡钩子的卡片化，链到相邻主题笔记 */
export function CrossRef(props: {
  title?: string;
  notes: { title: string; to: string; description?: string }[];
}) {
  return (
    <div className="my-4">
      <div className="mb-2 text-xs font-semibold text-muted">{props.title ?? "延伸阅读"}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {props.notes.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="group rounded-lg border border-border bg-background p-3 transition-colors hover:border-accent"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-accent">{n.title}</span>
              <ArrowRight
                size={14}
                className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
              />
            </div>
            {n.description && (
              <p className="mt-1 text-xs leading-relaxed text-muted">{n.description}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
