/** 关键词高亮文本：命中段用主题色 mark 样式（搜索面板 / 侧栏过滤共用） */
export function MarkText({ text, tokens }: { text: string; tokens: string[] }) {
  const valid = tokens.map((t) => t.trim()).filter((t) => t.length > 0);
  if (valid.length === 0) return <>{text}</>;
  const pattern = valid.map(escapeRegExp).join("|");
  const parts = text.split(new RegExp(`(${pattern})`, "gi"));
  const lowered = valid.map((t) => t.toLowerCase());
  return (
    <>
      {parts.map((part, i) =>
        lowered.includes(part.toLowerCase()) ? (
          <mark key={i} className="rounded-[3px] bg-accent/20 px-0.5 text-accent">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
