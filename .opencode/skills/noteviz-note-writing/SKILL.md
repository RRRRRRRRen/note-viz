---
name: noteviz-note-writing
description: 为 NoteViz 学习站创建或修改笔记时使用。强制执行笔记内容规范（结论先行/类比按需/真实运行输出/可视化密度）与视觉规范（三层内容边界/组件选型/配色语义）。触发词：写笔记、新建笔记、生成笔记、修改笔记、笔记内容、noteviz 笔记。
---

# NoteViz 笔记写作规范

为 NoteViz 撰写笔记的完整约束。目标质量标准：**高级程序员 + 高级讲师**——内容严谨且视觉丰富，枯燥的纯文字长文是失职。
执行流程（大纲确认、验证命令）见仓库根目录 `AGENTS.md`；本文件定义**内容与视觉的精确要求**。

## 文件结构

- 笔记位置：`src/content/<领域>/<技术>/<知识面>/<笔记名>/`，每篇含 `meta.ts` + `index.tsx`
- 领域/技术/知识面需先在 `src/content/taxonomy.ts` 登记
- 组件签名以源码为准：`src/components/note.tsx`（排版原语）、`src/components/viz.tsx`（可视化）
- 新增/修改笔记文件后 dev 自动重扫，无需重启

## 组件 API

```tsx
// 排版原语
import { Conclusion, NoteShell, Prose, QAChain, Section, Subsection } from "@/components/note";

// 代码块  属性: code, lang?: "javascript" | "typescript"
import CodeBlock from "@/components/demo/CodeBlock";

// ★ 在线代码游乐场：可编辑代码 + 真实执行 + 控制台（Sandpack 驱动，需网络）
//   props: code（初始代码）, label?, template? "node"|"vanilla", height?
import { PlayGround } from "@/components/demo/PlayGround";

// 流程图/拓扑图：React Flow + dagre 自动布局，自带缩放/适应/小地图
//   props: data {direction?, nodes[{id,label,color}], edges[{source,target,label?,dashed?}]}, label?, height?
import { FlowChart } from "@/components/demo/FlowChart";

// 演示通用件：日志面板 / 按钮（轻量交互演示用）
import { DemoButton, LogPanel, ResetButton } from "@/components/demo/LogPanel";

// 可缩放拖拽画布：仅用于包住手写 SVG 等无内置缩放的静态内容
import { PanZoomCanvas } from "@/components/demo/PanZoomCanvas";

// ★ 可视化组件（均自带 VizBlock 包壳）
import { VizBlock, CompareTable, Timeline, MemoryCard, BarChart, DoDont } from "@/components/viz";
```

**组件选型优先级**：内容需要某种视觉呈现时，先查有没有成熟 npm 包（流程图 → React Flow/dagre；在线执行 → Sandpack；图表 → 可考虑 recharts 等），确认没有合适的再自研。禁止重复造轮子，也不为简单需求引重型依赖。

可视化组件选型：

| 组件                                          | 用途                                               | 参数                                |
| --------------------------------------------- | -------------------------------------------------- | ----------------------------------- |
| `<CompareTable left={...} right={...} />`     | 两个概念的左右对照（var vs let、微任务 vs 宏任务） | `{title, points[], color?}` × 2     |
| `<Timeline steps={[...]} label? />`           | 执行顺序/输出顺序/流转过程                         | `{label, sub?, color?}[]`           |
| `<MemoryCard keyword="...">内容</MemoryCard>` | 关键结论记忆卡，每篇 ≤3 个                         | keyword + children, color?          |
| `<BarChart items={[...]} label? title? />`    | 相对开销/数量级对比（给直觉，勿当精确值）          | `{label, value, color?, suffix?}[]` |
| `<DoDont dont={...} do={...} label? />`       | 错误写法 vs 推荐写法的并排代码对照                 | `{code, note}` × 2                  |
| `<PanZoomCanvas>`                             | 包住自绘 SVG 流程图，防截断                        | children 为 svg                     |

产出文件模板：`meta.ts` 用 `satisfies NoteMeta`（五字段：title ≤20 字 / description / difficulty 入门·进阶·高级 / tags / updated）；`index.tsx` 默认导出 `function Note()`，根元素 `<NoteShell>`，私有子组件放同文件底部（超 150 行拆到同目录）。

## 大纲确认与详略协商

**禁止跳过大纲确认直接生成正文。** 流程：

1. **大纲提案**：知识面路径与 slug、Section 列表（含 Subsection）及每个部分的一句话说明、拟分布的可视化组件。
2. **询问两个问题**：① 大纲是否需要增删调整？② 对该主题的熟悉程度：`入门` / `用过但不深` / `熟悉` / `深入过源码`。
3. **按熟悉度动态调整详略**：

| 熟悉度     | 类比         | 基础概念段       | 机制深拆              | 边界陷阱     | 追问链       |
| ---------- | ------------ | ---------------- | --------------------- | ------------ | ------------ |
| 入门       | 每个概念都配 | 详细，从零讲起   | 标准深度              | 标准覆盖     | 3-4 条偏基础 |
| 用过但不深 | 核心机制配   | 简短带过（默认） | 标准（默认）          | 详细展开     | 4-5 条       |
| 熟悉       | 仅反直觉处配 | 跳过             | 加深（引擎/规范层面） | 详细展开     | 5-6 条偏刁钻 |
| 深入过源码 | 不需要       | 跳过             | 直入规范条文与实现    | 结合实际案例 | 6 条+ 硬核   |

4. 大纲有修改意见时先改提案再确认；**调整已有笔记**同样走此流程（给出加深/精简/新增的改动计划 → 确认 → 动笔）。

## 内容硬性要求

1. **结论先行**：`<Conclusion>` 3-5 句给出可执行答案，只读这一段能应付 80% 提问。
2. **类比按需**：只给真正抽象、反直觉的机制配生活化类比（按上表决定有无）；简单/具象概念**不要硬凑类比**。有类比时放「一个生活化的类比」Section 并贯穿后文（括号回扣，如「宏任务（=前台的新单子）」）。
3. **篇幅**：正文（不含代码）≥800 字（熟悉度高时侧重深度而非字数），每个保留的核心小节 ≥2 段（先"为什么这样设计"，再"引擎层面怎么做"）。
4. **真实运行（最重要）**：输出题的输出注释必须是真实引擎运行结果，禁止臆测——Node 行为用 `node -e` 验证、浏览器行为注明 Chrome 版本、Node 特有 API 注明版本。代码块后写「运行结果解读」：逐行解释为什么，而不是复述输出。无法实测的场景显式写明不确定性。示例代码必须自包含、可直接复制运行。
5. **可视化密度**：每篇 ≥4 个可视化块；连续两屏纯文字即不合格。
6. **追问链**：`<QAChain>` 数量与难度按详略表，答案给确定结论而非「看情况」。
7. **过渡钩子**：结尾点出与站内相邻主题的关联，为交叉阅读埋线。
8. **边界与陷阱**：≥3 个易踩的坑，用 `<DoDont>` 呈现对照。

## 视觉规范（三层边界）

| 层       | 包装                                            | 组件                                                                           |
| -------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| 正文层   | 无边框无背景，直接落在页面上                    | Prose / Section 标题                                                           |
| 可视化层 | VizBlock 统一包壳：边框 + 彩色标题栏 + 圆点标签 | Timeline / CompareTable / BarChart / DoDont / MemoryCard（**已内置，直接用**） |
| 演示层   | 自带运行控制（播放/单步/重置 + 日志面板）       | 模拟器 / LogPanel / PanZoomCanvas                                              |

- **禁止双重边框**：viz 组件已内置 VizBlock 包壳，不要再套 border div
- 自定义可视化（无现成组件）用 `<VizBlock label="示意 / diagram" color="#8b5cf6">` 包壳；label 规范：中文短标签 + 空格 + 英文斜杠小写
- **重点展示标准**：核心结论 → MemoryCard（≤3 个，多了稀释重点）；流程顺序 → Timeline；概念混淆 → CompareTable；写法对错 → DoDont；量级 → BarChart（注明"仅供直觉"）；一般提示 → 正文 `<strong>`/`<code>` 即可，不升级
- **配色语义**：蓝 `#1677ff` 通用强调 / 紫 `#8b5cf6` 对比左·微任务 / 橙 `#f59e0b` 调用栈·同步·警告 / 绿 `#3fb950` 正确·渲染 / 红 `#f85149` 错误·危险
- **红线**：正文不加 bg 容器；类比不加框（是叙事的一部分）；markdown 语法禁用

## 内容纯净（硬性）

笔记是**面向所有读者的出版物**，不是对话记录。禁止出现：

- 与用户/助手对话过程的痕迹（"你之前说的""按你的要求改""图被截断时"这类修复说明、实现备注）
- 指代本次写作任务的元话语（"本文将演示""下面我们来看"可以，"接下来我要生成"不行）
- 工具操作说明（组件怎么缩放拖拽这类 UI 常识，组件自带提示）
- 未经验证的个人推断冒充事实

自查方法：逐段问"这句是对读者说的，还是对对话方说的？"——对对话方说的，删。

## 质量自查（提交前）

- [ ] meta 五字段齐全，title ≤20 字
- [ ] 大纲层级：Section/Subsection 有层次（不是一马平川的 h2）
- [ ] 可视化块 ≥4 且分布均匀（无连续两屏纯文字）
- [ ] 每个输出题都有「运行结果解读」
- [ ] 内容纯净：无对话痕迹、无任务元话语、无工具操作说明
- [ ] SVG 流程图：所有节点/连线在 viewBox 范围内（不截断），PanZoomCanvas 支持全屏
- [ ] `pnpm build` 通过（meta 校验是构建时强制的）
