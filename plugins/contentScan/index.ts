import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { LINK_RE } from "./extract";
import { generateBacklinks, generateRegistry, generateSearchIndex } from "./generate";
import { findNoteDirs, findSourceFiles, notePathOf, noteSourceFiles } from "./scan";
import { PALETTE_LITERAL_RE, resolveTaxonomyNode, validateMetaFile } from "./validate";

/** 应用源码里语义色闸门的扫描范围（palette.ts 是色板本体，排除） */
const APP_SOURCE_DIRS = ["src/pages", "src/components", "src/lib"];

export function contentScan(): Plugin {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const contentDir = path.join(rootDir, "src/content");
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
      const validPaths = new Set(noteDirs.map((d) => notePathOf(contentDir, d)));
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
      // ---- 一致性闸门 3：语义色必须引用 PALETTE 常量（笔记内容 + 应用源码；taxonomy 领域色是配置除外）----
      for (const dir of noteDirs) {
        for (const file of noteSourceFiles(dir)) {
          if (PALETTE_LITERAL_RE.test(fs.readFileSync(file, "utf-8"))) {
            this.error(
              `[note-viz] 语义色必须引用 PALETTE 常量（import { PALETTE } from "@/components/palette"），禁止字面量拷贝（${path.relative(process.cwd(), file)}）`,
            );
            failed = true;
          }
        }
      }
      for (const rel of APP_SOURCE_DIRS) {
        const dir = path.join(rootDir, rel);
        if (!fs.existsSync(dir)) continue;
        for (const file of findSourceFiles(dir)) {
          if (file.endsWith(`${path.sep}palette.ts`)) continue;
          if (PALETTE_LITERAL_RE.test(fs.readFileSync(file, "utf-8"))) {
            this.error(
              `[note-viz] 语义色必须引用 PALETTE 常量而非字面量（${path.relative(process.cwd(), file)}）`,
            );
            failed = true;
          }
        }
      }
      if (failed) process.exitCode = 1;
    },
    load(id) {
      if (!fs.existsSync(contentDir)) {
        if (id === resolvedSearchId) return `export const searchEntries = [];`;
        if (id === resolvedBacklinksId) return `export const backlinks = {};`;
        if (id === resolvedId) return `export const notes = [];`;
        return;
      }
      if (id === resolvedSearchId) {
        return generateSearchIndex(contentDir, findNoteDirs(contentDir).toSorted());
      }
      if (id === resolvedBacklinksId) {
        return generateBacklinks(contentDir, findNoteDirs(contentDir));
      }
      if (id === resolvedId) {
        return generateRegistry(contentDir, findNoteDirs(contentDir).toSorted());
      }
    },
  };
}
