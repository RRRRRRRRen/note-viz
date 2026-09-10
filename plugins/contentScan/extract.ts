import fs from "node:fs";
import { notePathOf, noteSourceFiles } from "./scan";

export const LINK_RE = /["'](\/note\/[^"']+)["']/g;

/**
 * 把笔记源码压成可搜索纯文本：去 import 与注释，JSX 标签替换为其字符串属性值
 * （保留 title="…" 等正文语义属性），标签之间的文本节点自然保留。
 */
export function extractText(files: string[]): string {
  const raw = files
    .map((f) =>
      fs
        .readFileSync(f, "utf-8")
        .replace(/^import\s+[^\n]*$/gm, " ")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/^\s*\/\/[^\n]*$/gm, " ")
        .replace(/<[^>]*>/g, (tag) => (tag.match(/"[^"]*"/g) ?? []).join(" ")),
    )
    .join(" ");
  return raw
    .replace(/[{}()[\];:=`'"|\\<>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 每篇笔记的外链清单：notePath → 指向的 /note/ 路径（backlinks 数据源） */
export function scanOutgoingLinks(contentDir: string, noteDirs: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const dir of noteDirs) {
    const links: string[] = [];
    for (const file of noteSourceFiles(dir)) {
      const src = fs.readFileSync(file, "utf-8");
      for (const m of src.matchAll(LINK_RE)) {
        const t = m[1] ?? "";
        if (t && !links.includes(t)) links.push(t);
      }
    }
    if (links.length > 0) out.set(notePathOf(contentDir, dir), links);
  }
  return out;
}
