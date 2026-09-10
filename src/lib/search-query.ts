import type { SearchEntryLite } from "./types";

export interface Scored {
  entry: SearchEntryLite;
  score: number;
  snippet: string;
}

/** 打分检索：所有 token 需至少命中一个字段，命中权重 标题 > 标签 > 描述 > 正文 */
export function runSearch(entries: SearchEntryLite[], query: string): Scored[] {
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const out: Scored[] = [];
  for (const e of entries) {
    const title = e.title.toLowerCase();
    const tags = e.tags.join(" ").toLowerCase();
    const desc = e.description.toLowerCase();
    const text = e.text.toLowerCase();
    let score = 0;
    let matched = true;
    for (const t of tokens) {
      if (title.includes(t)) score += 10;
      else if (tags.includes(t)) score += 6;
      else if (desc.includes(t)) score += 3;
      else if (text.includes(t)) score += 1;
      else {
        matched = false;
        break;
      }
    }
    if (!matched) continue;
    let snippet = e.description;
    const hit = tokens.find((t) => text.includes(t));
    if (hit) {
      const i = text.indexOf(hit);
      const start = Math.max(0, i - 36);
      snippet = `${start > 0 ? "…" : ""}${e.text.slice(start, i + hit.length + 36)}…`;
    }
    out.push({ entry: e, score, snippet });
  }
  return out.toSorted((a, b) => b.score - a.score).slice(0, 12);
}
