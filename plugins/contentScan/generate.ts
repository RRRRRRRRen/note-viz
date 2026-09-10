import fs from "node:fs";
import path from "node:path";
import { extractText, scanOutgoingLinks } from "./extract";
import { notePathOf, noteSourceFiles, toImportPath } from "./scan";

/** 生成 virtual:content-registry：slug/path/meta（静态导入）+ load（懒加载） */
export function generateRegistry(contentDir: string, noteDirs: string[]): string {
  const lines: string[] = [`export const notes = [`];
  const imports: string[] = [];
  noteDirs.forEach((dir, i) => {
    const imp = toImportPath(contentDir, dir);
    const slug = path.relative(contentDir, dir).split(path.sep);
    const pathSegs = slug.map(encodeURIComponent).join("/");
    imports.push(`import * as meta${i} from "${imp}/meta.ts";`);
    lines.push(`  {`);
    lines.push(`    slug: ${JSON.stringify(slug)},`);
    lines.push(`    path: "/note/${pathSegs}",`);
    lines.push(`    meta: meta${i}.meta,`);
    lines.push(
      `    load: () => import("/src/content/${path.relative(contentDir, dir).split(path.sep).join("/")}/index.tsx"),`,
    );
    lines.push(`  },`);
  });
  lines.push(`];`);
  return [...imports, ...lines].join("\n");
}

/** 生成 virtual:search-index：每篇 meta + 剥 JSX 的纯文本正文（draft 除外） */
export function generateSearchIndex(contentDir: string, noteDirs: string[]): string {
  const imports: string[] = [];
  const rows: string[] = [];
  let n = 0;
  for (const dir of noteDirs) {
    const metaPath = path.join(dir, "meta.ts");
    if (!fs.existsSync(metaPath)) continue; // 缺失由 buildStart 闸门报错
    const metaSrc = fs.readFileSync(metaPath, "utf-8");
    if (/type:\s*"draft"/.test(metaSrc)) continue; // 草稿不进搜索索引
    imports.push(`import * as meta${n} from "${toImportPath(contentDir, dir)}/meta.ts";`);
    const segs = path.relative(contentDir, dir).split(path.sep);
    const notePath = `/note/${segs.map(encodeURIComponent).join("/")}`;
    rows.push(
      `  { path: ${JSON.stringify(notePath)}, title: meta${n}.meta.title, description: meta${n}.meta.description, tags: meta${n}.meta.tags, updated: meta${n}.meta.updated, text: ${JSON.stringify(extractText(noteSourceFiles(dir)))} },`,
    );
    n += 1;
  }
  return [...imports, `export const searchEntries = [`, ...rows, `];`].join("\n");
}

/** 生成 virtual:backlinks：目标 path → 引用它的笔记 path 列表（反转索引） */
export function generateBacklinks(contentDir: string, noteDirs: string[]): string {
  const validPaths = new Set(noteDirs.map((d) => notePathOf(contentDir, d)));
  const map: Record<string, string[]> = {};
  for (const [source, targets] of scanOutgoingLinks(contentDir, noteDirs)) {
    for (const t of targets) {
      // 坏链接由 buildStart 闸门报错，这里只建有效边；兼容 encode 过的路径段
      const key = validPaths.has(t) ? t : decodeURI(t);
      if (!validPaths.has(key)) continue;
      (map[key] ??= []).push(source);
    }
  }
  for (const k of Object.keys(map)) map[k]?.sort();
  return `export const backlinks = ${JSON.stringify(map)};`;
}
