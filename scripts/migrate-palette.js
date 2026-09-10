// 内容侧 PALETTE 色值字面量 → 常量引用迁移工具
// 用法：node scripts/migrate-palette.js [--reverse]
// --reverse 把 PALETTE.xxx 引用还原为字面量（用于拆分提交边界等场景）
// 注意：import 插入锚点是「文件顶部第一个连续 import 区的结束行」——不能按「最后一个
// import 开头的行」找：多行 import 块会插错位；教学代码示例里有以 import 开头的行也会被骗。
import fs from "node:fs";
import path from "node:path";

const MAP = {
  "1677ff": "PALETTE.blue",
  "3b82f6": "PALETTE.blueSoft",
  "8b5cf6": "PALETTE.purple",
  f59e0b: "PALETTE.orange",
  "3fb950": "PALETTE.green",
  f85149: "PALETTE.red",
  "9ca3af": "PALETTE.gray",
};
const REV = Object.fromEntries(Object.entries(MAP).map(([hex, name]) => [name, hex]));
const REVERSE = process.argv.includes("--reverse");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

function importRegionEnd(lines) {
  let last = -1;
  let inMulti = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (inMulti) {
      if (/^\} from ".*";\s*$/.test(l)) {
        last = i;
        inMulti = false;
      }
      continue;
    }
    if (l.startsWith("import ")) {
      last = i;
      if (l.startsWith("import {") && !/ from ".*";\s*$/.test(l)) inMulti = true;
    } else {
      break; // import 区必然连续置于文件顶部，遇首个非 import 行终止
    }
  }
  return last;
}

let files = 0;
let replaced = 0;
for (const f of walk("src/content")) {
  let s = fs.readFileSync(f, "utf8");
  let n = 0;
  if (REVERSE) {
    s = s.replace(/=\{PALETTE\.(\w+)\}/g, (m, name) => (REV[name] ? (n++, `="#${REV[name]}"`) : m));
    s = s.replace(/(:\s*)PALETTE\.(\w+)/g, (m, p1, name) =>
      REV[name] ? (n++, `${p1}"#${REV[name]}"`) : m,
    );
  } else {
    s = s.replace(/(=|:\s*)"#([0-9a-fA-F]{6})"/g, (m, p1, hex) => {
      const name = MAP[hex.toLowerCase()];
      if (!name) return m;
      n++;
      return p1 === "=" ? `={${name}}` : `${p1}${name}`;
    });
  }
  if (n === 0) continue;
  const lines = s.split("\n");
  const hasImport = lines.some((l) => /from ["']@\/components\/palette["']/.test(l));
  const uses = lines.some((l) => /\bPALETTE\./.test(l) && !l.startsWith("import"));
  if (uses && !hasImport) {
    const end = importRegionEnd(lines);
    if (end === -1) {
      console.warn("跳过（找不到 import 区）:", f);
      continue;
    }
    lines.splice(end + 1, 0, 'import { PALETTE } from "@/components/palette";');
    s = lines.join("\n");
  }
  fs.writeFileSync(f, s);
  files++;
  replaced += n;
}
console.log(`${REVERSE ? "反向" : "正向"}迁移 ${files} 个文件，替换 ${replaced} 处`);
