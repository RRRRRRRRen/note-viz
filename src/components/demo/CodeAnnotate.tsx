import { useEffect, useState } from "react";
import { getHighlighter } from "@/lib/highlight";
import { PALETTE } from "../palette";

export interface CodeAnnotation {
  /** 1 起始的代码行号 */
  line: number;
  text: string;
  color?: string;
}

/** 源码讲解：左侧高亮代码，右侧按行号批注（按 line 升序展示） */
export function CodeAnnotate(props: {
  code: string;
  lang?: "javascript" | "typescript";
  annotations: CodeAnnotation[];
}) {
  const lang = props.lang ?? "javascript";
  const [html, setHtml] = useState<string>("");
  const annotations = [...props.annotations].sort((a, b) => a.line - b.line);

  useEffect(() => {
    let alive = true;
    getHighlighter().then((h) => {
      if (!alive) return;
      setHtml(h.codeToHtml(props.code.trim(), { lang, theme: "github-dark-default" }));
    });
    return () => {
      alive = false;
    };
  }, [props.code, lang]);

  return (
    <div className="my-4 grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div
        className="min-w-0 overflow-x-auto rounded-lg text-sm [&_pre]:!bg-[#0d1117] [&_pre]:p-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <ol className="min-w-0 space-y-2">
        {annotations.map((a, i) => {
          const color = a.color ?? PALETTE.blue;
          return (
            <li key={`${a.line}-${i}`} className="rounded-lg border border-border p-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
                  style={{ backgroundColor: `${color}1a`, color }}
                >
                  L{a.line}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{a.text}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
