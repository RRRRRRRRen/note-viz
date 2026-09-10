// demo 深路径导入 → 桶导入合并工具
// 用法：node scripts/merge-demo-imports.js
// 把 `import X from "@/components/demo/Y"` / `import { A } from "@/components/demo/Y"`
// 合并为单条 `import { ... } from "@/components/demo"`（CodeBlock 默认导出转具名）。
import fs from "node:fs";
import path from "node:path";

const DEMO_RE =
  /^import\s+(?:([A-Za-z_$][\w$]*)\s+,\s*)?(?:\{([^}]*)\}|([A-Za-z_$][\w$]*))\s+from\s+"@\/components\/demo\/(\w+)";\s*$/;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "dist") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

let files = 0;
let imports = 0;
for (const f of walk("src")) {
  if (f.includes(path.join("components", "demo"))) continue; // 桶自身与 demo 内部相对导入不动
  const s = fs.readFileSync(f, "utf8");
  const lines = s.split("\n");
  const names = new Set();
  let firstIdx = -1;
  const kept = lines.filter((line, idx) => {
    const m = line.match(DEMO_RE);
    if (!m) return true;
    if (firstIdx === -1) firstIdx = idx;
    const named = m[2]
      ? m[2]
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      : [];
    if (m[1]) named.push(m[1]);
    if (m[3]) named.push(m[3]);
    named.forEach((n) => names.add(n));
    imports++;
    return false;
  });
  if (names.size === 0) continue;
  const sorted = [...names].toSorted((a, b) => a.localeCompare(b));
  kept.splice(firstIdx, 0, `import { ${sorted.join(", ")} } from "@/components/demo";`);
  fs.writeFileSync(f, kept.join("\n"));
  files++;
}
console.log(`重写 ${files} 个文件，合并 ${imports} 条 demo 深路径导入`);
