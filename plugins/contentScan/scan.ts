import fs from "node:fs";
import path from "node:path";

/** 递归找笔记目录：含 index.tsx 的目录（命中后子目录不再下钻） */
export function findNoteDirs(base: string): string[] {
  const entries = fs.readdirSync(base, { withFileTypes: true });
  const hasIndex = entries.some((e) => e.isFile() && e.name === "index.tsx");
  if (hasIndex) return [base];
  const out: string[] = [];
  for (const e of entries) {
    if (e.isDirectory()) out.push(...findNoteDirs(path.join(base, e.name)));
  }
  return out;
}

/** 递归收集目录下全部 ts/tsx 源文件（链接校验、索引提取、语义色扫描共用） */
export function findSourceFiles(base: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(base, { withFileTypes: true })) {
    const p = path.join(base, e.name);
    if (e.isDirectory()) findSourceFiles(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** 笔记目录规范路径：/note/<segs...>（与 registry 生成的 path 同构） */
export function notePathOf(contentDir: string, dir: string): string {
  return `/note/${path.relative(contentDir, dir).split(path.sep).join("/")}`;
}

/** 笔记目录内的正文源文件（index.tsx + 同目录私有组件，不含 meta.ts） */
export function noteSourceFiles(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name) && e.name !== "meta.ts")
    .map((e) => path.join(dir, e.name));
}

/** 笔记目录 → 虚拟模块内的导入路径（/src/content/<rel>） */
export function toImportPath(contentDir: string, noteDir: string): string {
  return "/src/content/" + path.relative(contentDir, noteDir).split(path.sep).join("/");
}
