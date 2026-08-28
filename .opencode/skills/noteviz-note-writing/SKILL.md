---
name: noteviz-note-writing
description: 为 NoteViz 学习站创建或修改笔记时使用。强制执行笔记内容规范（结论先行/生活化类比/真实运行输出/可视化密度）与视觉规范（三层内容边界/组件选型/配色语义）。触发词：写笔记、新建笔记、生成笔记、修改笔记、笔记内容、noteviz 笔记。
---

# NoteViz 笔记写作规范

为 NoteViz（本仓库）撰写笔记时的完整约束。目标质量标准：**高级程序员 + 高级讲师**——内容严谨且视觉丰富，枯燥的纯文字长文是失职。

## 项目结构速览

- 笔记位置：`src/content/<领域>/<技术>/<知识面>/<笔记名>/`，每篇含 `meta.ts` + `index.tsx`
- 领域/技术/知识面需先在 `src/content/taxonomy.ts` 登记
- 写作提示词全文：**`NOTE_PROMPT.md`（仓库根目录）——动笔前必读**
- 新增/修改笔记文件后 dev 自动重扫，无需重启

## 标准工作流

1. 读 `NOTE_PROMPT.md` 获取完整规范（组件 API、可视化密度、视觉红线）
2. 读 `src/components/note.tsx` 与 `src/components/viz.tsx` 确认组件签名（以代码为准，不凭记忆）
3. 确定/新建知识面路径，写 `meta.ts`（五字段：title/description/difficulty/tags/updated，用 `satisfies NoteMeta`）
4. 写 `index.tsx`（默认导出 Note 函数；私有子组件放同文件底部，超 150 行拆到同目录单独文件）
5. 运行 `pnpm build && pnpm lint` 验证

## 内容硬性要求

1. **结论先行**：`<Conclusion>` 3-5 句给出可执行答案
2. **类比必须**：抽象概念配生活化类比，放「一个生活化的类比」Section，类比贯穿全文
3. **篇幅**：正文（不含代码）≥800 字，每个核心小节 ≥2 段（先"为什么这样设计"，再"引擎层面怎么做"）
4. **真实运行**：输出题的输出注释必须是真实引擎运行结果，禁止臆测；代码块后写「运行结果解读」
5. **可视化密度**：每篇 ≥4 个可视化块；连续两屏纯文字即不合格
6. **追问链**：`<QAChain>` 4-6 条，答案给确定结论
7. **过渡钩子**：结尾点出与站内相邻主题的关联

## 视觉规范（三层边界）

| 层 | 包装 | 组件 |
|---|---|---|
| 正文层 | 无边框无背景 | Prose / Section 标题 |
| 可视化层 | VizBlock 统一包壳（已内置） | Timeline / CompareTable / BarChart / DoDont / MemoryCard |
| 演示层 | 自带运行控制 | 模拟器 / LogPanel / PanZoomCanvas |

- **禁止双重边框**：viz 组件已内置包壳，不要再套 border div
- **重点展示标准**：核心结论 → MemoryCard（≤3 个）；流程顺序 → Timeline；概念混淆 → CompareTable；写法对错 → DoDont；量级 → BarChart（注明"仅供直觉"）
- **配色语义**：蓝 `#1677ff` 通用 / 紫 `#8b5cf6` 对比左·微任务 / 橙 `#f59e0b` 同步·警告 / 绿 `#3fb950` 正确 / 红 `#f85149` 错误
- **红线**：正文不加 bg 容器；markdown 语法禁用；类比不加框

## 质量自查（提交前）

- [ ] meta 五字段齐全，title ≤20 字
- [ ] 大纲效果：Section/Subsection 结构有层级（不是一马平川的 h2）
- [ ] 可视化块 ≥4 且分布均匀（无连续两屏纯文字）
- [ ] 每个输出题都有「运行结果解读」
- [ ] `pnpm build` 通过（meta 校验是构建时强制的）
