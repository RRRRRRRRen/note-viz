import { useEffect, useState } from "react";
import { createHighlighter, type Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: ["github-dark-default"],
    langs: ["javascript", "typescript"],
  });
  return highlighterPromise;
}

interface CodeBlockProps {
  code: string;
  lang?: "javascript" | "typescript";
}

export default function CodeBlock({ code, lang = "javascript" }: CodeBlockProps) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    let alive = true;
    getHighlighter().then((h) => {
      if (!alive) return;
      setHtml(h.codeToHtml(code.trim(), { lang, theme: "github-dark-default" }));
    });
    return () => {
      alive = false;
    };
  }, [code, lang]);

  return (
    <div
      className="my-4 overflow-x-auto rounded-lg text-sm [&_pre]:!bg-[#0d1117] [&_pre]:p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
