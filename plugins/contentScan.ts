import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { taxonomy } from "../src/content/taxonomy.ts";
import type { TaxonomyNode } from "../src/lib/types.ts";

const REQUIRED_KEYS = ["title", "description", "type", "difficulty", "tags", "updated"] as const;

const NOTE_TYPES = ["knowledge", "question", "practice", "draft"] as const;

function findNoteDirs(base: string): string[] {
  const entries = fs.readdirSync(base, { withFileTypes: true });
  const hasIndex = entries.some((e) => e.isFile() && e.name === "index.tsx");
  if (hasIndex) return [base];
  const out: string[] = [];
  for (const e of entries) {
    if (e.isDirectory()) out.push(...findNoteDirs(path.join(base, e.name)));
  }
  return out;
}

function validateMetaFile(filePath: string): string[] {
  const src = fs.readFileSync(filePath, "utf-8");
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

/** 递归收集内容目录下全部 ts/tsx 源文件（含笔记私有组件，链接校验用） */
function findSourceFiles(base: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(base, { withFileTypes: true })) {
    const p = path.join(base, e.name);
    if (e.isDirectory()) findSourceFiles(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const LINK_RE = /["'](\/note\/[^"']+)["']/g;

/** 沿 slug 段下钻 taxonomy；任一段缺失时返回缺失段名 */
function resolveTaxonomyNode(segs: string[]): { node: TaxonomyNode | undefined; missing?: string } {
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

function toImportPath(contentDir: string, noteDir: string): string {
  return "/src/content/" + path.relative(contentDir, noteDir).split(path.sep).join("/");
}

/** 笔记目录规范路径：/note/<segs...>（与 registry 生成的 path 同构） */
function notePathOf(contentDir: string, dir: string): string {
  return `/note/${path.relative(contentDir, dir).split(path.sep).join("/")}`;
}

/** 笔记目录内的正文源文件（index.tsx + 同目录私有组件，不含 meta.ts） */
function noteSourceFiles(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name) && e.name !== "meta.ts")
    .map((e) => path.join(dir, e.name));
}

/**
 * 把笔记源码压成可搜索纯文本：去 import 与注释，JSX 标签替换为其字符串属性值
 * （保留 title="…" 等正文语义属性），标签之间的文本节点自然保留。
 */
function extractText(files: string[]): string {
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
function scanOutgoingLinks(contentDir: string, noteDirs: string[]): Map<string, string[]> {
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

export function contentScan(): Plugin {
  const contentDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/content");
  const virtualModuleId = "virtual:content-registry";
  const resolvedId = "\0" + virtualModuleId;
  const virtualSearchId = "virtual:search-index";
  const resolvedSearchId = "\0" + virtualSearchId;
  const virtualBacklinksId = "virtual:backlinks";
  const resolvedBacklinksId = "\0" + virtualBacklinksId;
  const resolvedExtraIds = [resolvedId, resolvedSearchId, resolvedBacklinksId];

  return {
    name: "note-viz-content-scan",
    enforce: "pre",
    resolveId(id) {
      if (id === virtualModuleId) return resolvedId;
      if (id === virtualSearchId) return resolvedSearchId;
      if (id === virtualBacklinksId) return resolvedBacklinksId;
    },
    // watch 内容目录：新增/删除笔记后 dev 自动重扫（三个虚拟模块一起失效）
    configureServer(server) {
      const rescan = (file: string) => {
        const abs = path.resolve(file);
        if (abs.startsWith(contentDir) && (abs.endsWith("meta.ts") || abs.endsWith("index.tsx"))) {
          for (const rid of resolvedExtraIds) {
            const mod = server.moduleGraph.getModuleById(rid);
            if (mod) server.moduleGraph.invalidateModule(mod);
          }
        }
      };
      server.watcher.on("add", rescan);
      server.watcher.on("unlink", rescan);
    },
    buildStart() {
      if (!fs.existsSync(contentDir)) return;
      const noteDirs = findNoteDirs(contentDir);
      let failed = false;
      for (const dir of noteDirs) {
        const metaPath = path.join(dir, "meta.ts");
        const rel = path.relative(process.cwd(), dir);
        if (!fs.existsSync(metaPath)) {
          this.error(`[note-viz] 笔记缺少 meta.ts: ${rel}`);
          failed = true;
          continue;
        }
        for (const err of validateMetaFile(metaPath)) {
          this.error(`[note-viz] ${rel}/meta.ts ${err}`);
          failed = true;
        }
      }
      // ---- 一致性闸门 1：正文中的内部链接必须指向存在的笔记 ----
      const validPaths = new Set(
        noteDirs.map((d) => `/note/${path.relative(contentDir, d).split(path.sep).join("/")}`),
      );
      for (const file of findSourceFiles(contentDir)) {
        const src = fs.readFileSync(file, "utf-8");
        for (const match of src.matchAll(LINK_RE)) {
          const target = match[1] ?? "";
          if (!validPaths.has(target) && !validPaths.has(decodeURI(target))) {
            this.error(
              `[note-viz] 内部链接目标不存在: ${target}（${path.relative(process.cwd(), file)}）`,
            );
            failed = true;
          }
        }
      }
      // ---- 一致性闸门 2：每篇笔记必须登记进 taxonomy（所属知识面存在且列入 order）----
      for (const dir of noteDirs) {
        const segs = path.relative(contentDir, dir).split(path.sep);
        const rel = path.relative(process.cwd(), dir);
        const area = resolveTaxonomyNode(segs.slice(0, -1));
        if (!area.node) {
          this.error(`[note-viz] 笔记目录未在 taxonomy.ts 登记（缺 "${area.missing}" 段）: ${rel}`);
          failed = true;
          continue;
        }
        const noteSlug = segs[segs.length - 1] ?? "";
        if (!(area.node.order ?? []).includes(noteSlug)) {
          this.error(
            `[note-viz] 笔记未列入所属知识面的 order 声明: ${rel}（在 taxonomy.ts 补 "${noteSlug}"）`,
          );
          failed = true;
        }
      }
      if (failed) process.exitCode = 1;
    },
    load(id) {
      if (id === resolvedSearchId) {
        if (!fs.existsSync(contentDir)) return `export const searchEntries = [];`;
        const noteDirs = findNoteDirs(contentDir).sort();
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
      if (id === resolvedBacklinksId) {
        if (!fs.existsSync(contentDir)) return `export const backlinks = {};`;
        const noteDirs = findNoteDirs(contentDir);
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
      if (id !== resolvedId) return;
      if (!fs.existsSync(contentDir)) return `export const notes = [];`;
      const noteDirs = findNoteDirs(contentDir).sort();
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
    },
  };
}
