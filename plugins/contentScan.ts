import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

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
  return errors;
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
      if (failed) process.exitCode = 1;
    },
    load(id) {
      if (id !== resolvedId) return;
      if (!fs.existsSync(contentDir)) return `export const notes = [];`;
      const noteDirs = findNoteDirs(contentDir).sort();
      const lines: string[] = [
        `import type { NoteEntry } from "../lib/types";`,
        ``,
        `export const notes: NoteEntry[] = [`,
      ];
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
        lines.push(`    load: () => import("${imp}/index.tsx"),`);
        lines.push(`  },`);
      });
      lines.push(`];`);
      return [...imports, ...lines].join("\n");
    },
  };
}
