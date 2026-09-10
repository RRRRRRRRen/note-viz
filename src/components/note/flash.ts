/** 大纲点击跳转后，给目标标题加一段渐隐高亮（配合 data-toc 锚点） */
export function flashHeading(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("toc-flash");
  // 强制 reflow 以重启动画
  void el.offsetWidth;
  el.classList.add("toc-flash");
  setTimeout(() => el.classList.remove("toc-flash"), 1300);
}
