import fs from "node:fs";
import { taxonomy } from "../../src/content/taxonomy.ts";
import type { TaxonomyNode } from "../../src/lib/types.ts";

const REQUIRED_KEYS = ["title", "description", "type", "difficulty", "tags", "updated"] as const;

const NOTE_TYPES = ["knowledge", "question", "practice", "draft"] as const;

/** 语义色字面量闸门：这七个值必须引用 PALETTE 常量，禁止拷贝（防色板漂移） */
export const PALETTE_LITERAL_RE = /(=|:\s*)"#(1677ff|3b82f6|8b5cf6|f59e0b|3fb950|f85149|9ca3af)"/i;

/** 校验 meta 源文本（纯函数，单测友好）：六字段存在性 + type 枚举 + 类型化标题规则 */
export function validateMetaSource(src: string): string[] {
  const errors: string[] = [];
  for (const key of REQUIRED_KEYS) {
    const re = new RegExp(`\\b${key}\\s*:`);
    if (!re.test(src)) errors.push(`缺少必填字段 "${key}"`);
  }
  // 笔记类型：合法枚举，决定标题规则
  const typeMatch = src.match(/type:\s*"([a-z]+)"/);
  const noteType = typeMatch?.[1];
  if (noteType !== undefined && !(NOTE_TYPES as readonly string[]).includes(noteType)) {
    errors.push(`type 非法: "${noteType}"（合法值 ${NOTE_TYPES.join(" / ")}）`);
  }
  // 标题：question 必须问句；knowledge/practice 允许陈述式；draft 免检（未完成内容）
  const titleMatch = src.match(/title:\s*(?:"([^"]+)"|'([^']+)')/);
  const title = titleMatch?.[1] ?? titleMatch?.[2];
  if (title && noteType !== "draft") {
    if ([...title].length > 25) errors.push(`title 超过 25 字符（当前 ${[...title].length}）`);
    if (noteType === "question") {
      const interrogative =
        /[？？?]|怎么|怎样|如何|为什么|为何|什么|是不是|能否|还是|哪|多少|几|吗/;
      if (!interrogative.test(title)) {
        errors.push(`question 类型 title 必须是问句（含 ？/怎么/为什么 等疑问主干）`);
      }
    }
  }
  return errors;
}

export function validateMetaFile(filePath: string): string[] {
  return validateMetaSource(fs.readFileSync(filePath, "utf-8"));
}

/** 沿 slug 段下钻 taxonomy；任一段缺失时返回缺失段名 */
export function resolveTaxonomyNode(segs: string[]): {
  node: TaxonomyNode | undefined;
  missing?: string;
} {
  let children = taxonomy;
  let node: TaxonomyNode | undefined;
  for (const seg of segs) {
    const next = children[seg];
    if (!next) return { node: undefined, missing: seg };
    node = next;
    children = node.children ?? {};
  }
  return { node };
}
