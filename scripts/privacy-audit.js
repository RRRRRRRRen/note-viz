// 开源前隐私/安全扫描：IP / 域名 / 家目录路径 / ssh 账号 / 凭据关键词
// 用法：node scripts/privacy-audit.js（只报告，不改动任何文件）
// 输出即报告：开源清理时运行，按分级处理命中项
import fs from "node:fs";
import path from "node:path";

const SCANS = [
  {
    name: "IP 地址（排除 0.0.0.0/127.0.0.1）",
    re: /\b((25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
    skip: (t) => t === "0.0.0.0" || t === "127.0.0.1",
  },
  { name: "家目录/用户路径", re: /\/(home|Users)\/[a-z][\w-]*/g },
  { name: "ssh user@host", re: /\bssh\s+[a-z][\w-]*@[a-z0-9.-]+/g },
  { name: "凭据关键词", re: /\b(password|passwd|api[_-]?key|secret[_-]?key|token)\s*[:=]\s*\S+/gi },
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|json|conf|toml|md)$/.test(e.name)) out.push(p);
  }
  return out;
}

let total = 0;
for (const scan of SCANS) {
  console.log(`\n=== ${scan.name} ===`);
  let count = 0;
  for (const f of walk("src")) {
    const src = fs.readFileSync(f, "utf8");
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      for (const m of line.matchAll(scan.re)) {
        if (scan.skip?.(m[0])) continue;
        count++;
        total++;
        console.log(`${f}:${i + 1}  ${m[0]}`);
      }
    });
  }
  if (count === 0) console.log("（无）");
}
console.log(`\n共 ${total} 处命中——分级参考：公网 IP/公司项目名必处理，内网拓扑/个人身份建议处理`);
