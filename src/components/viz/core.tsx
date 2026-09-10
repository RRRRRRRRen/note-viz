import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { PALETTE } from "../palette";

/* =====================================================================
 * 视觉规范（三层内容边界）
 * 1. 正文层：直接落在页面上，无背景无边框 —— Prose / Section
 * 2. 可视化层：VizBlock 包壳 —— 有边框 + 标题栏，与正文明确区隔
 * 3. 演示层：交互组件（模拟器/代码执行），带运行控制
 * 统一参数：My-N 弧度用 rounded-lg；间距 my-5；标题栏 11px mono
 * ===================================================================== */

/** 可视化块统一外壳：边框 + 标题栏，建立与正文的视觉边界 */
export function VizBlock(props: { label: string; color?: string; children: ReactNode }) {
  const color = props.color ?? PALETTE.blue;
  return (
    <div className="my-5 overflow-hidden rounded-lg border border-border bg-background">
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

/* ---------- 对比表：两概念对照（rows 维度逐行对齐为首选；points 要点并列兼容旧数据） ---------- */

interface CompareSide {
  title: string;
  color?: string;
  points?: string[];
}

function ComparePill(props: { title: string; color: string }) {
  return (
    <span
      className="inline-block max-w-full truncate rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: `${props.color}1a`, color: props.color }}
    >
      {props.title}
    </span>
  );
}

export function CompareTable(props: {
  label?: string;
  left: CompareSide;
  right: CompareSide;
  /**
   * 维度对照模式（首选）：同一维度上左右值逐行严格对齐。
   * 传入 rows 时渲染三列对齐表；不传时回退为 points 要点并列模式。
   */
  rows?: { aspect: string; left: ReactNode; right: ReactNode }[];
}) {
  const { left, right } = props;
  const lColor = left.color ?? PALETTE.purple;
  const rColor = right.color ?? PALETTE.blueSoft;

  return (
    <VizBlock label={props.label ?? "对比 / compare"}>
      {/* 维度对照模式 */}
      {props.rows ? (
        <>
          {/* 桌面：维度轴 + 左右值三列严格对齐，整行 hover 联动 */}
          <table className="hidden w-full table-fixed border-collapse text-xs sm:table">
            <colgroup>
              <col className="w-24" />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th className="pb-2" />
                <th className="pb-2 pr-3 text-left">
                  <ComparePill title={left.title} color={lColor} />
                </th>
                <th className="pb-2 text-left">
                  <ComparePill title={right.title} color={rColor} />
                </th>
              </tr>
            </thead>
            <tbody>
              {props.rows.map((r) => (
                <tr
                  key={r.aspect}
                  className="border-t border-border transition-colors hover:bg-surface/60"
                >
                  <td className="py-2.5 pr-2 align-top font-medium text-muted">{r.aspect}</td>
                  <td className="py-2.5 pr-3 align-top leading-relaxed text-foreground">
                    {r.left}
                  </td>
                  <td className="py-2.5 align-top leading-relaxed text-foreground">{r.right}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* 移动端：按维度分组，仅用分隔线，不套盒子 */}
          <div className="divide-y divide-border sm:hidden">
            {props.rows.map((r) => (
              <div key={r.aspect} className="py-3 first:pt-0 last:pb-0">
                <div className="text-[11px] font-semibold tracking-wide text-muted">{r.aspect}</div>
                <dl className="mt-1.5 space-y-1 text-xs leading-relaxed">
                  <div className="flex gap-1.5">
                    <dt className="shrink-0 font-semibold" style={{ color: lColor }}>
                      {left.title}
                    </dt>
                    <dd className="min-w-0 text-muted">{r.left}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="shrink-0 font-semibold" style={{ color: rColor }}>
                      {right.title}
                    </dt>
                    <dd className="min-w-0 text-muted">{r.right}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* 要点并列模式（兼容旧数据）：单层结构——概念徽章 + 中缝竖线分列，盒子只有 VizBlock 一层 */
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ComparePill title={left.title} color={lColor} />
            <span className="shrink-0 font-mono text-[10px] font-bold text-muted uppercase">
              vs
            </span>
            <ComparePill title={right.title} color={rColor} />
          </div>
          <div className="grid sm:grid-cols-2">
            <ul className="space-y-2.5 sm:pr-4">
              {(left.points ?? []).map((p, i) => (
                <li key={i} className="text-xs leading-relaxed text-muted">
                  {p}
                </li>
              ))}
            </ul>
            <ul className="space-y-2.5 border-t border-border pt-3 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              {(right.points ?? []).map((p, i) => (
                <li key={i} className="text-xs leading-relaxed text-muted">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
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
          const color = s.color ?? PALETTE.blue;
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
  /** 阶段→颜色映射；默认为 JS 运行时语义（同步/微任务/宏任务），讲其他运行时时可覆盖 */
  phaseColors?: Record<string, string>;
}) {
  const phaseColor: Record<string, string> = props.phaseColors ?? {
    同步: PALETTE.orange,
    微任务: PALETTE.purple,
    宏任务: PALETTE.blueSoft,
  };
  return (
    <VizBlock label={props.label ?? "输出解读 / output explained"}>
      <ol className="space-y-0">
        {props.steps.map((s, i) => {
          const color = s.color ?? phaseColor[s.phase] ?? PALETTE.blue;
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
  const color = props.color ?? PALETTE.blue;
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
          const color = item.color ?? PALETTE.blue;
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
      {/* 单层结构：彩色标题直接绑定代码区，说明跟排在下，无嵌套边框 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(["dont", "do"] as const).map((kind) => {
          const item = props[kind];
          const bad = kind === "dont";
          const color = bad ? PALETTE.red : PALETTE.green;
          return (
            <div key={kind} className="min-w-0">
              <div
                className="mb-2 flex items-center gap-1.5 text-xs font-semibold"
                style={{ color }}
              >
                {bad ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                {bad ? "别这样写" : "推荐写法"}
              </div>
              <pre className="overflow-x-auto rounded-md bg-[#0d1117] p-3 font-mono text-[11px] leading-relaxed text-[#e6edf3]">
                {item.code}
              </pre>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">{item.note}</p>
            </div>
          );
        })}
      </div>
    </VizBlock>
  );
}
