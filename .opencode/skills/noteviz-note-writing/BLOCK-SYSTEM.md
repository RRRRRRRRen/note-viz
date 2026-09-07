# NoteViz 块级内容体系（Block System）设计与开发计划

> 状态：**已全量实施**——块流组件上线，全站笔记迁移完毕，Section/Subsection/Prose 已删除。本文档是块体系的最高架构约束，与 SKILL.md / COMPONENTS.md 冲突时以本文档裁决。

## 一、六条原则的架构裁决

| #   | 原则                         | 架构落地                                                                                     |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | 每块内容都是独立的盒子       | 笔记正文是 **平铺块流**：`NoteShell` 内直接堆叠块组件，无中间结构层                          |
| 2   | 禁止结构嵌套，标题与内容平级 | `Section`/`Subsection` 这类"标题容器"废弃；标题自己是块（`Heading`），内容块与标题是兄弟节点 |
| 3   | 能成块的内容全部组件化       | 块类型全覆盖：段落、列表、图片都有对应组件，不允许裸写 HTML 结构块                           |
| 4   | 块内元素可用原生标签         | 段落块内部的 `<strong>` `<em>` `<code>` `<del>` 等行内标记用原生，样式由全局 CSS 统一定型    |
| 5   | 行级组件独立存在             | `Kbd`、`Tag` 为行级组件，与块级组件分属两族                                                  |
| 6   | 块组件允许插槽/children      | 内容承载型块的 children/rows/slots 是标准形态（Paragraph、MemoryCard、CompareTable.rows）    |

**嵌套禁令的精确边界**（避免误伤）：

- **违规**：结构容器把异构内容吞进子级——`<Section>标题+段落+图表</Section>`，内容仅因"属于这一章"而被包裹
- **允许**：块内**数据驱动的同构重复子项**——Timeline 的 step、Quiz 的 option、QAChain 的 QA、Table 的 row，它们是一个块的内部数据展开，等同 `<li>` 之于 `<ul>`
- **允许**：**容器型块**——Collapsible 的展开体、PlayGround 的编辑/控制台、MemoryCard 的正文，内容从属于块自身语义（有 children/slots 即原则 6）
- 判断口诀：**"删掉这个容器，内容是否仍然各自成立？"** 成立 → 容器违规；不成立（Collapsible 没有展开体就不是折叠块）→ 容器合法

## 二、块流模型

```tsx
<NoteShell>                     {/* 唯一容器：块流的垂直布局器 */}
  <Conclusion>…</Conclusion>    {/* 块 */}
  <Heading level={2} title="执行循环" />   {/* 块：只有标题，无 children */}
  <Paragraph>同步代码执行完，<strong>先清空整个微任务队列</strong>……</Paragraph>
  <List items={["…", "…"]} />
  <CompareTable rows={[…]} />   {/* 块 */}
  <Heading level={3} title="微任务队列" />
  <Paragraph>…</Paragraph>
  <OutputTimeline steps={[…]} />
</NoteShell>
```

**间距模型**：`NoteShell` **去掉 space-y**，块流间距完全由各块自身的 `my-*` 驱动（现有块已带 my-4/my-5），Heading 自带 `mt-*`。单一间距来源，避免 space-y 与块自带边距打架。

**大纲（TOC）兼容**：`Heading` 自身输出 `<h2 data-toc>` / `<h3 data-toc>` + `scroll-mt-24`，现有 extractHeadings 选择器 `h2[data-toc], h3[data-toc], [data-toc-item] > h3` 零改动兼容；QA 短标签机制不变。

## 三、现有组件审计（40 个逐一裁决）

| 组件                                                                                | 裁决    | 说明                                                          |
| ----------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------- |
| `NoteShell`                                                                         | ✅ 保留 | 唯一容器；去掉 space-y，职责改为块流布局器                    |
| `Section`                                                                           | ❌ 废弃 | 结构容器违规 → `Heading level={2}`；保留 deprecated 别名过渡  |
| `Subsection`                                                                        | ❌ 废弃 | 同上 → `Heading level={3}`                                    |
| `Prose`                                                                             | ♻️ 重塑 | 多段聚合容器违规 → `Paragraph`（单段块）；deprecated 别名过渡 |
| `Conclusion`                                                                        | ✅      | 独立块，已按方案 A 强化                                       |
| `Kbd` / `Tag`                                                                       | ✅      | 行级组件族                                                    |
| `QAChain`(+QA)                                                                      | ✅      | 链内 QA 是数据驱动重复子项，非结构嵌套                        |
| `VizBlock`                                                                          | ✅      | 基础设施（自定义可视化外壳），不直接面向笔记作者              |
| CompareTable / Timeline / OutputTimeline / MemoryCard / BarChart / DoDont           | ✅      | 已单层化（本轮去盒中盒）                                      |
| StateFlow / LayerStack / MemoryMap / SequenceDiagram                                | ✅      | 纯 SVG 单层（MemoryMap 虚线区域为分组标注，非装饰盒）         |
| FlowChart / StepThrough / PlayGround                                                | ✅      | PlayGround 已拆除内层重复边框                                 |
| CodeBlock / DiffBlock / CodeTabs / CodeAnnotate                                     | ✅      | 代码呈现块                                                    |
| Callout / VersionNote / SpecQuote / Prerequisite / CrossRef / Table / ShortcutTable | ✅      | 语义块                                                        |
| Exercise / Quiz                                                                     | ✅      | 自测块；选项为数据驱动子项                                    |
| `Collapsible`                                                                       | ♻️ 登记 | **容器型块特例**：展开体从属于折叠语义，合法；文档标注        |
| LogPanel / DemoButton / ResetButton                                                 | ✅      | 演示基建，笔记作者不直接组合成"块"                            |

结论：**需废弃 2 个（Section/Subsection）、重塑 1 个（Prose→Paragraph）、其余 37 个全部合规保留**——前几轮"去盒中盒"整改已经把块自身理顺，这次要拆的是最后三个结构容器。

## 四、需要开发的组件

### 阶段一（新结构组件，全部低成本静态块）

#### 1. `Heading` — 标题块（核心）

- **职责**：独立输出标题自身，不带 children；TOC 锚点 + 黄闪目标都落在它身上
- **签名**：`{ level: 2 | 3; title: string }`
- **结构要点**：
  - level 2：`<h2 data-toc class="mt-10 mb-3 border-l-4 border-accent py-1 pl-3 text-xl font-semibold scroll-mt-24">`（延续已定稿样式：accent 竖线、无圆角、竖线在正文列内；mt-10 章节级分隔，与上一块下边距塌缩取最大值）
  - level 3：`<h3 data-toc class="mt-5 mb-2 px-2 py-0.5 text-sm font-semibold scroll-mt-24">`（无竖线）
  - 不带 rounded；`mt-*` 是块流中"章节前更大喘息"的来源

#### 2. `Paragraph` — 正文段落块（核心）

- **职责**：恰好一段文字；内部行级元素用原生标签 + 行级组件
- **签名**：`{ children: ReactNode }`
- **结构要点**：`<p class="my-4 text-sm leading-relaxed">`；`my-4` 必须保留——平铺流中相邻两个段落若无边距会完全粘连，相邻兄弟边距自行塌缩取最大值
- **废弃映射**：`Prose` 的多段聚合 → 多个 `Paragraph` 平铺

#### 3. `List` — 列表块

- **职责**：有序/无序列表成为可管理的块
- **签名**：`{ items: ReactNode[]; ordered?: boolean }`
- **结构要点**：内部渲染原生 `<ol>/<ul>+<li>`（列表标记属原生语义，不自绘）；`pl-5 space-y-1.5 text-sm leading-relaxed`

#### 4. `Figure` — 图片块（按需，首张图片入库时实现）

- **签名**：`{ src, alt, caption?, width?, height? }`
- **结构要点**：`<figure>` + `<img>`（显式宽高防 CLS、`loading="lazy"`）+ `<figcaption>` 居中小字；`rounded-lg border` 单层

#### 5. `Divider` — 分隔块（按需）

- **签名**：无 props；`<hr class="my-6 border-border" />`

### 行级组件（原则 5）

| 组件                              | 状态    | 说明                                                          |
| --------------------------------- | ------- | ------------------------------------------------------------- |
| `Kbd`                             | ✅ 已有 | 按键胶囊                                                      |
| `Tag`                             | ✅ 已有 | 归类标记胶囊                                                  |
| 原生 `<strong>/<em>/<code>/<del>` | ✅      | 块内行内标记用原生，全局 CSS 定型样式（现状已成立，无需开发） |
| `HL` 高亮 / `Ext` 外链图标        | 🤔 候选 | 出现真实需要再登记开发                                        |

### 阶段二（结构改造，随迁移推进）

- `NoteShell` 去掉 space-y-6（一行改动，与迁移同批生效，避免新旧间距叠加）
- `Section`/`Subsection`/`Prose` 加 `@deprecated` JSDoc 注释（IDE 提示写新笔记的 AI 换用新组件），实现原样保留

## 五、迁移与兼容策略

1. **向后兼容优先**：deprecated 别名让 32 篇存量笔记继续正常渲染，新笔记立即用块流
2. **迁移映射**（机械部分可批量，语义部分逐篇）：
   - `<Section title="T">{X}</Section>` → `<Heading level={2} title="T" />` + X 平铺
   - `<Subsection title="T">{X}</Subsection>` → `<Heading level={3} title="T" />` + X 平铺
   - `<Prose>{<p>a</p><p>b</p>}</Prose>` → `<Paragraph>a</Paragraph>` + `<Paragraph>b</Paragraph>`
3. **顺序**：阶段一组件落地 → 挑 1 篇（建议 `event-loop-basics`）示范迁移并验收 → 其余 31 篇分批（每批 build 验证）→ 全量完成后删除 deprecated 别名与旧组件
4. **每批验证**：`pnpm build && pnpm lint` + 浏览器抽查 TOC 锚点跳转与黄闪

## 六、文档回写（实施完成时）

- SKILL.md：「组件 API」与「产出文件模板」改为块流写法；内容硬性要求中涉及 Prose 的表述同步
- COMPONENTS.md：排版原语区重写（Heading/Paragraph/List 入正式区，Section/Subsection/Prose 移入废弃记录）
- 本文档状态改为「已实施」，或并入 COMPONENTS.md 后删除
