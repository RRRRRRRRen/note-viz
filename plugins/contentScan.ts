import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { taxonomy } from "../src/content/taxonomy.ts";
import type { TaxonomyNode } from "../src/lib/types.ts";

const REQUIRED_KEYS = ["title", "description", "difficulty", "tags", "updated"] as const;

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
  // title 必须是问句（疑问主干，可带冒号副题）且 ≤25 字符
  const titleMatch = src.match(/title:\s*(?:"([^"]+)"|'([^']+)')/);
  const title = titleMatch?.[1] ?? titleMatch?.[2];
  if (title) {
    if ([...title].length > 25) errors.push(`title 超过 25 字符（当前 ${[...title].length}）`);
    const interrogative = /[？？?]|怎么|怎样|如何|为什么|为何|什么|是不是|能否|还是|哪|多少|几|吗/;
    if (!interrogative.test(title)) errors.push(`title 必须是问句（含 ？/怎么/为什么 等疑问主干）`);
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

export function contentScan(): Plugin {
  const contentDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/content");
  const virtualModuleId = "virtual:content-registry";
  const resolvedId = "\0" + virtualModuleId;

  return {
    name: "note-viz-content-scan",
    enforce: "pre",
    resolveId(id) {
      if (id === virtualModuleId) return resolvedId;
    },
    // watch 内容目录：新增/删除笔记目录后 dev 自动重扫
    configureServer(server) {
      const rescan = (file: string) => {
        const abs = path.resolve(file);
        if (abs.startsWith(contentDir) && (abs.endsWith("meta.ts") || abs.endsWith("index.tsx"))) {
          const mod = server.moduleGraph.getModuleById(resolvedId);
          if (mod) server.moduleGraph.invalidateModule(mod);
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
