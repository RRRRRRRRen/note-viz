import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import type { ReactNode } from "react";

/* =====================================================================
 * 视觉规范（三层内容边界）
 * 1. 正文层：直接落在页面上，无背景无边框 —— Prose / Section
 * 2. 可视化层：VizBlock 包壳 —— 有边框 + 标题栏，与正文明确区隔
 * 3. 演示层：交互组件（模拟器/代码执行），带运行控制
 * 统一参数：My-N 弧度用 rounded-lg；间距 my-5；标题栏 11px mono
 * ===================================================================== */

/** 可视化块统一外壳：边框 + 标题栏，建立与正文的视觉边界 */
export function VizBlock(props: { label: string; color?: string; children: ReactNode }) {
  const color = props.color ?? "#1677ff";
  return (
    <div className="my-5 overflow-hidden rounded-lg border border-border bg-card">
      <div
        className="flex items-center gap-2 border-b border-border px-3.5 py-2"
        style={{ backgroundColor: `${color}0d` }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span
          className="text-[11px] font-medium tracking-wide meta-mono uppercase"
          style={{ color }}
        >
          {props.label}
        </span>
      </div>
      <div className="p-4">{props.children}</div>
    </div>
  );
}

/* ---------- 对比表：左右两列对照（如 防抖 vs 节流、var vs let） ---------- */

export function CompareTable(props: {
  label?: string;
  left: { title: string; color?: string; points: string[] };
  right: { title: string; color?: string; points: string[] };
}) {
  const { left, right } = props;
  const lColor = left.color ?? "#8b5cf6";
  const rColor = right.color ?? "#3b82f6";
  return (
    <VizBlock label={props.label ?? "对比 / compare"}>
      <div className="grid grid-cols-2 gap-3">
        {[left, right].map((col, i) => {
          const color = i === 0 ? lColor : rColor;
          return (
            <motion.div
              key={col.title}
              initial={{ opacity: 0, x: i === 0 ? -12 : 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-lg border border-border bg-background p-4"
            >
              <div
                className="mb-3 inline-block rounded-md px-2.5 py-1 text-sm font-semibold"
                style={{ backgroundColor: `${color}1a`, color }}
              >
                {col.title}
              </div>
              <ul className="space-y-2">
                {col.points.map((p) => (
                  <li key={p} className="flex gap-2 text-xs leading-relaxed text-muted">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>
    </VizBlock>
  );
}

/* ---------- 横向时间线：执行顺序/事件流转 ---------- */

export function Timeline(props: {
  label?: string;
  steps: { label: string; sub?: string; color?: string }[];
}) {
  return (
    <VizBlock label={props.label ?? "时间线 / timeline"}>
      <div className="flex items-stretch gap-0 overflow-x-auto pb-1">
        {props.steps.map((s, i) => {
          const color = s.color ?? "#1677ff";
          const last = i === props.steps.length - 1;
          return (
            <div key={s.label} className="flex min-w-28 flex-1 items-center">
              <div className="flex w-full flex-col items-center gap-1.5 text-center">
                <motion.span
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 300 }}
                  className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] font-bold"
                  style={{ backgroundColor: `${color}1a`, color }}
                >
                  {i + 1}
                </motion.span>
                <span className="text-xs font-medium leading-tight">{s.label}</span>
                {s.sub && <span className="text-[10px] leading-tight text-muted">{s.sub}</span>}
              </div>
              {!last && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 + 0.05 }}
                  className="mx-1 h-px w-8 shrink-0 origin-left bg-border"
                />
              )}
            </div>
          );
        })}
      </div>
    </VizBlock>
  );
}

/* ---------- 输出解读时间线：每条输出的顺序 + 为什么 ---------- */

export function OutputTimeline(props: {
  label?: string;
  steps: { output: string; phase: string; why: string; color?: string }[];
}) {
  const phaseColor: Record<string, string> = {
    同步: "#f59e0b",
    微任务: "#8b5cf6",
    宏任务: "#3b82f6",
  };
  return (
    <VizBlock label={props.label ?? "输出解读 / output explained"}>
      <ol className="space-y-0">
        {props.steps.map((s, i) => {
          const color = s.color ?? phaseColor[s.phase] ?? "#1677ff";
          const last = i === props.steps.length - 1;
          return (
            <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
              {/* 左侧：序号 + 连接线 */}
              <div className="flex flex-col items-center">
                <motion.span
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, type: "spring", stiffness: 300 }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold"
                  style={{ backgroundColor: `${color}1a`, color }}
                >
                  {i + 1}
                </motion.span>
                {!last && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              {/* 右侧：输出值 + 阶段徽章 + 解释 */}
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <code
                    className="rounded px-1.5 py-0.5 font-mono text-xs font-bold"
                    style={{ backgroundColor: `${color}1a`, color }}
                  >
                    {s.output}
                  </code>
                  <span
                    className="rounded border px-1.5 py-px text-[10px]"
                    style={{ borderColor: `${color}66`, color }}
                  >
                    {s.phase}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{s.why}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </VizBlock>
  );
}

/* ---------- 记忆卡片：关键结论，一眼记住 ---------- */

export function MemoryCard(props: { keyword: string; children: ReactNode; color?: string }) {
  const color = props.color ?? "#1677ff";
  return (
    <div className="my-4 overflow-hidden rounded-lg border" style={{ borderColor: `${color}55` }}>
      <div
        className="flex items-center gap-2 px-3.5 py-2"
        style={{ backgroundColor: `${color}0d` }}
      >
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: color, color: "#fff" }}
        >
          记住
        </span>
        <span className="text-sm font-semibold" style={{ color }}>
          {props.keyword}
        </span>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="border-t p-4 text-sm leading-relaxed"
        style={{ borderColor: `${color}33` }}
      >
        {props.children}
      </motion.div>
    </div>
  );
}

/* ---------- 图例条：相对数量/开销对比 ---------- */

export function BarChart(props: {
  label?: string;
  items: { label: string; value: number; color?: string; suffix?: string }[];
  title?: string;
}) {
  const max = Math.max(...props.items.map((i) => i.value), 1);
  return (
    <VizBlock label={props.label ?? "量级对比 / scale"}>
      {props.title && (
        <div className="mb-3 text-[10px] tracking-[0.08em] text-muted meta-mono">{props.title}</div>
      )}
      <div className="space-y-2.5">
        {props.items.map((item, i) => {
          const color = item.color ?? "#1677ff";
          return (
            <div key={item.label} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-right text-xs text-muted">
                {item.label}
              </span>
              <div className="h-4 min-w-0 flex-1 overflow-hidden rounded bg-surface-2">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(item.value / max) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: "easeOut" }}
                  className="flex h-full items-center justify-end rounded pr-1.5"
                  style={{ backgroundColor: `${color}cc` }}
                >
                  <span className="font-mono text-[10px] font-bold text-white">
                    {item.value}
                    {item.suffix ?? ""}
                  </span>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </VizBlock>
  );
}

/* ---------- 对错对照：错误写法 vs 正确写法 ---------- */

export function DoDont(props: {
  label?: string;
  dont: { code: string; note: string };
  do: { code: string; note: string };
}) {
  return (
    <VizBlock label={props.label ?? "写法对照 / do & don't"}>
      <div className="grid grid-cols-2 gap-3">
        {(["dont", "do"] as const).map((kind) => {
          const item = props[kind];
          const bad = kind === "dont";
          return (
            <div
              key={kind}
              className={`overflow-hidden rounded-lg border ${
                bad ? "border-danger/40" : "border-success/40"
              }`}
            >
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${
                  bad ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                }`}
              >
                {bad ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                {bad ? "别这样写" : "推荐写法"}
              </div>
              <pre className="overflow-x-auto bg-[#0d1117] p-3 font-mono text-[11px] leading-relaxed text-[#e6edf3]">
                {item.code}
              </pre>
              <div className="border-t border-border px-3 py-2 text-[11px] text-muted">
                {item.note}
              </div>
            </div>
          );
        })}
      </div>
    </VizBlock>
  );
}
