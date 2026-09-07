import { Check, Copy } from "lucide-react";
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
  const [copied, setCopied] = useState(false);

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

  const onCopy = () => {
    navigator.clipboard
      ?.writeText(code.trim())
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => undefined); // 非安全上下文（如 http 内网访问）剪贴板不可用，静默降级
  };

  return (
    <div className="relative my-4 overflow-x-auto rounded-lg text-sm [&_pre]:!bg-[#0d1117] [&_pre]:p-4">
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "已复制" : "复制代码"}
        className="absolute top-2 right-2 z-10 rounded border border-[#303740] bg-[#161b22] p-1.5 text-[#8b949e] transition-colors hover:text-[#e6edf3]"
      >
        {copied ? <Check size={12} className="text-[#3fb950]" /> : <Copy size={12} />}
      </button>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
