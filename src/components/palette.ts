/**
 * 全局语义配色单一来源（与 SKILL.md「配色语义」保持同步）。
 * 导出 hex 而非 CSS 变量：组件普遍用 `${color}1a` 拼 10% 透明底色，需要纯 hex。
 * UI 硬编码色（如代码区背景 #0d1117、FlowChart 边线灰）不属于语义色，不在此管理。
 */
export const PALETTE = {
  /** 通用强调（组件默认主色） */
  blue: "#1677ff",
  /** 对比右列 · 宏任务 */
  blueSoft: "#3b82f6",
  /** 对比左列 · 微任务 */
  purple: "#8b5cf6",
  /** 调用栈 · 同步 · 警告 */
  orange: "#f59e0b",
  /** 正确 · 渲染 */
  green: "#3fb950",
  /** 错误 · 危险 */
  red: "#f85149",
  /** 中性 · 热身 · 无语义连线 */
  gray: "#9ca3af",
} as const;
