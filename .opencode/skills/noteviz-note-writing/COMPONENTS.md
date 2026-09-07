# NoteViz 组件目录（选型字典）

写笔记选组件时的唯一依据。使用方式：走完 `SKILL.md`「可视化决策流程」第 1、2 步（复杂度门槛 + 认知类型）后，到此目录按认知类型匹配组件，**逐条核对适用/不适用条件**。

成本分级：**静态**（无交互）· **轻交互**（点击展开/切换）· **重交互**（拖拽/输入/真实执行）

组件签名以 `src/components/` 源码为准；本文件与源码不一致时，改完组件必须同步改本文件（SKILL.md 元约束）。

## 速查总表

### 可视化与代码呈现

| 认知类型     | 组件              | 成本   | 一句话用途                                    |
| ------------ | ----------------- | ------ | --------------------------------------------- |
| 线性顺序     | `Timeline`        | 静态   | 横向步骤时间线                                |
| 拓扑流程     | `FlowChart`       | 轻交互 | 节点+连线的数据流/流程拓扑                    |
| 状态迁移     | `StateFlow`       | 静态   | 有限状态机图（起止节点+转换标签）             |
| 层级包含     | `LayerStack`      | 静态   | 自上而下堆叠层（栈/管线/协议层）              |
| 内存布局     | `MemoryMap`       | 静态   | 栈/堆区域 + 对象框 + 引用指向                 |
| 多角色时序   | `SequenceDiagram` | 静态   | 泳道式消息往返时序图                          |
| 二元对比     | `CompareTable`    | 静态   | 左右两列逐点对照                              |
| 量级直觉     | `BarChart`        | 静态   | 横向条形图比数量级/开销                       |
| 对错对照     | `DoDont`          | 静态   | 错误写法 vs 推荐写法并排代码                  |
| 输出解读     | `OutputTimeline`  | 静态   | 输出题逐条解读（顺序+为什么）                 |
| 记忆锚点     | `MemoryCard`      | 静态   | 「记住」关键词结论卡                          |
| 步进推演     | `StepThrough`     | 轻交互 | 动态过程逐步推进+每步解说                     |
| 参数模拟     | 笔记私有模拟器    | 重交互 | 滑杆调参+实时渲染（FlexShrinkSimulator 模式） |
| 在线执行     | `PlayGround`      | 重交互 | 可编辑代码+真实执行+控制台                    |
| 自测考核     | `QAChain`         | 轻交互 | 追问链：先想再看答案的模拟面试                |
| 代码增删对照 | `DiffBlock`       | 静态   | +增/−删行高亮的改动对照                       |
| 多实现对比   | `CodeTabs`        | 轻交互 | 多语言/多种实现方式的代码标签切换             |
| 源码讲解     | `CodeAnnotate`    | 静态   | 代码 + 按行号批注                             |

### 内容语义块

| 语义         | 组件            | 成本   | 一句话用途                         |
| ------------ | --------------- | ------ | ---------------------------------- |
| 提示/警告    | `Callout`       | 静态   | info/tip/warning/danger 四态提示框 |
| 结构化明细   | `Table`         | 静态   | 数据驱动的统一样式表格             |
| 快捷键速查   | `ShortcutTable` | 静态   | 按键组合 + 说明的速查表            |
| 版本差异     | `VersionNote`   | 静态   | 「Node 18 前…20 后…」版本行为差异  |
| 规范引用     | `SpecQuote`     | 静态   | 带出处的规范/文档原文引用          |
| 前置知识     | `Prerequisite`  | 静态   | 学习本篇前应读的站内笔记           |
| 延伸阅读     | `CrossRef`      | 静态   | 相邻主题笔记卡片（过渡钩子卡片化） |
| 次要细节收纳 | `Collapsible`   | 轻交互 | 默认收起的可展开区块               |
| 练习自测     | `Exercise`      | 轻交互 | 练习题 + 折叠参考答案 + 考点标签   |
| 选择自测     | `Quiz`          | 轻交互 | ABCD 单选 + 即时判对错 + 解析      |
| 行内按键标注 | `Kbd`           | 静态   | `<Kbd>Ctrl</Kbd>` 按键胶囊         |
| 行内标记     | `Tag`           | 静态   | 行内小标签胶囊                     |

---

## 一、可视化层 `src/components/viz/`

均自带 VizBlock 包壳（边框 + 彩色标题栏），**不要再套边框容器**（Callout/SpecQuote/Prerequisite 等语义块除外，它们自带轻量样式）。

### `<Timeline>` —— 线性顺序

- **签名**：`{ label?, steps: { label, sub?, color? }[] }`
- **适用**：3-8 步的单线流程，各步之间是固定先后关系（请求生命周期、git 操作顺序、渲染五步）
- **不适用**：有分支/汇合的流程（→ `FlowChart`）；输出题的顺序展示（→ `OutputTimeline`）；步骤需要看状态细节的推演（→ `StepThrough`）
- **示例**：`url-to-render` 渲染流程

### `<FlowChart>` —— 拓扑流程

- **签名**：`{ label?, data: { direction?: "TB"|"LR", nodes: { id, label, color }[], edges: { source, target, label?, dashed? }[] }, height? }`（React Flow + dagre 自动布局，自带缩放；高度自适应图的自然尺寸，`height` 仅作最小高度保底，封顶 720）
- **适用**：节点间有分支、汇合、循环引用的关系图（模块依赖、事件传播、对象关系）；节点 >8 个的复杂拓扑
- **不适用**：纯线性步骤（→ `Timeline`，更轻）；小规模状态机（→ `StateFlow`，有起止语义和转换标签）；两三节点的简单关系用正文描述即可
- **示例**：`url-to-render` 请求流水线（含缓存分支）、`prototype-chain` 原型链

### `<StateFlow>` —— 状态迁移

- **签名**：`{ label?, direction?: "LR"|"TB", states: { id, label, kind?: "start"|"normal"|"terminal", color?, desc? }[], transitions: { from, to, label?, color?, dashed? }[] }`
- **适用**：有限状态机——对象在少数状态间按条件迁移，且**状态数 ≤8**（Promise 三态、XMLHttpRequest readyState、git 引用状态、WebSocket 连接状态、文件读取状态）
- **不适用**：状态只是流程中的一站、不会驻留/回迁（那是流程 → `Timeline`/`FlowChart`）；节点 >10 个（→ `FlowChart` 自动布局更稳）；需要在线交互改变状态的（→ `PlayGround`/演示层）
- **示例**：（新建后由首篇使用的笔记回填）

### `<LayerStack>` —— 层级包含

- **签名**：`{ label?, title?, layers: { name, desc?, color?, emphasis? }[], direction?: "top-down"|"bottom-up" }`
- **适用**：自上而下的分层结构，强调「谁在上面/谁包含谁/顺序执行」——调用栈帧、浏览器渲染管线分层、网络协议栈、缓存查找层级、事件冒泡层级、优先级排序
- **不适用**：无序并列的对比（→ `CompareTable`）；各层之间有消息往返（→ `SequenceDiagram`）；层级只是背景知识而非本篇重点时不配组件
- **示例**：（新建后回填）

### `<MemoryMap>` —— 内存布局

- **签名**：`{ label?, regions: { id, title, desc?, layout?: "column"|"wrap", color? }[], objects: { id, label, region, fields?: { name, value?, refTo?, color? }[], color?, unreachable? }[], note? }`
- **适用**：讲**引用关系**必须画图的场景——闭包捕获了什么、深/浅拷贝复制了哪层、原型 `__proto__` 指向谁、GC 从根可达哪些对象（`unreachable: true` 标灰虚线）、`this` 指向
- **不适用**：抽象逻辑流程（→ `FlowChart`）；只是列数据结构字段（正文列表即可）。引用以彩色 `refTo` chip 表示指向（与目标对象同色），不画跨区箭头——保证响应式下不脆断
- **示例**：（新建后回填）

### `<SequenceDiagram>` —— 多角色时序

- **签名**：`{ label?, actors: string[], messages: { from: number|string, to: number|string, label, dashed?, color?, note? }[] }`（`from`/`to` 用角色序号或名称；`dashed` 表示返回/异步）
- **适用**：≥2 个角色之间的消息往返，顺序重要——事件循环各角色协作、HTTP 请求/响应握手、发布订阅、SSH 隧道转发链路、React 调度与渲染角色
- **不适用**：单对象内部步骤（→ `Timeline`/`StepThrough`）；只讲结构不讲消息顺序（→ `FlowChart`）；角色 >5 个或消息 >12 条时改用 `FlowChart` + 文字
- **示例**：（新建后回填）

### `<CompareTable>` —— 二元对比

- **签名**：`{ label?, left/right: { title, color?, points? }, rows?: { aspect, left, right }[] }`
- **两种模式**：
  - **rows 维度对照（首选）**：`rows: { aspect: "作用域", left: "函数级", right: "块级" }[]`——同一维度上左右值逐行严格对齐，桌面三列表（维度轴 + 左右值），整行 hover 联动；移动端按维度分卡、值带概念名前缀
  - **points 要点并列**：两侧各自 `points: string[]`，独立清单卡（兼容存量数据的回退形态，无法逐行对齐）
- **适用**：两概念在同一组维度上的差异（var vs let：作用域/提升/重复声明…）优先用 rows；两侧各有独立的要点清单时用 points。每侧 3-6 条为宜
- **不适用**：≥3 个对象的多方对比（→ `Table`）；对错写法对照（→ `DoDont`）
- **示例**：`type-coercion`、`flex-vs-grid` 等 20+ 篇（存量均为 points 模式，改写为 rows 时按维度重组内容）

### `<BarChart>` —— 量级直觉

- **签名**：`{ label?, title?, items: { label, value, color?, suffix? }[] }`
- **适用**：数量级/相对开销对比，目的是建立直觉而非精确读数（操作耗时、实例数量、性能差异），必须注明"仅供直觉"
- **不适用**：精确数据报表（需要时考虑 recharts 封装并登记候选区）；两三项的简单对比用文字即可
- **示例**：`gc-and-leaks`（GC 耗时量级）

### `<DoDont>` —— 对错对照

- **签名**：`{ label?, dont: { code, note }, do: { code, note } }`
- **适用**：错误写法 vs 推荐写法的代码对照——边界陷阱、最佳实践（本站最高频组件，边界陷阱章节标配）
- **不适用**：非代码类对错（用 `CompareTable`）；单一写法讲解（→ `CodeBlock`）；版本间行为差异（→ `VersionNote`）
- **示例**：21 篇笔记使用

### `<OutputTimeline>` —— 输出解读

- **签名**：`{ label?, steps: { output, phase, why, color? }[] }`（phase 通常为 同步/微任务/宏任务，自动配色）
- **适用**：**输出题专用**——每条输出的逐条解读（值 + 阶段 + 为什么是它）。凡「这段代码输出什么」的代码块后面必须跟这个
- **不适用**：非输出题的流程（→ `Timeline`）
- **示例**：`event-loop-basics`

### `<MemoryCard>` —— 记忆锚点

- **签名**：`{ keyword, children, color? }`
- **适用**：一篇笔记里最值得背下来的 1-3 个结论。**每篇 ≤3 个**，多了稀释重点
- **不适用**：次要结论、一般提示（正文 `<strong>` 或 `Callout` 即可）
- **示例**：22 篇笔记使用

### `<Callout>` —— 提示/警告

- **签名**：`{ kind?: "info"|"tip"|"warning"|"danger", title?, children }`（默认 info；各态默认标题：提示/技巧/注意/危险，可自定义 title）
- **适用**：正文中需要跳出视觉层次的注意、坑、技巧、危险操作提醒（info 蓝 / tip 绿 / warning 橙 / danger 红，对齐全局配色语义）。轻语义块，**不计入可视化密度**，按语义自然使用，同屏 ≤3 个防噪音
- **不适用**：核心结论（→ `MemoryCard`，有记忆价值才升级）；成段的错误代码对照（→ `DoDont`）；大段展开的机制解释（正文小节）
- **示例**：（新建后回填）

### `<Table>` —— 结构化明细

- **签名**：`{ label?, head: string[], rows: ReactNode[][] }`
- **适用**：≥3 行的二维明细数据：API 参考（方法/参数/返回）、配置项表、多对象属性对照（≥3 列时替代 CompareTable）
- **不适用**：两列概念对照（→ `CompareTable`，有更强的视觉对照）；一两行数据用正文列出即可；快捷键（→ `ShortcutTable`，按键有专门渲染）
- **示例**：（新建后回填）

### `<ShortcutTable>` —— 快捷键速查

- **签名**：`{ label?, rows: { keys: string[], desc: string }[] }`（keys 内部用 `Kbd` 渲染，`+` 自动连接）
- **适用**：工具类笔记的快捷键/命令组合速查（git、ssh、编辑器）
- **不适用**：非按键类对照数据（→ `Table`）
- **示例**：（新建后回填）

### `<VersionNote>` —— 版本差异

- **签名**：`{ label?, note?, versions: { range, text, color? }[] }`（range 如 "Node < 20"，默认蓝，废弃/移除用红色 `#f85149`）
- **适用**：同一行为在不同版本/环境下表现不同——Node/浏览器版本、ES 规范阶段、框架大版本迁移
- **不适用**：普遍对错（→ `DoDont`）；仅一句话提到的差异（正文 `<strong>` 即可）
- **示例**：（新建后回填）

### `<SpecQuote>` —— 规范引用

- **签名**：`{ source, children }`（source 如 "ECMA-262 §8.4"）
- **适用**：引用规范/官方文档原文并**必须注明出处**的场合（SKILL.md 联网调研要求的规范级引用载体）
- **不适用**：非规范级的观点引用（正文引述即可）；转述（转述不加分隔，直接写进正文并括注出处）
- **示例**：（新建后回填）

### `<Prerequisite>` —— 前置知识

- **签名**：`{ notes: { title, to }[], children? }`（to 为站内笔记路径）
- **适用**：笔记开头声明学习本篇前应掌握/应读的站内笔记，建立知识图谱入口
- **不适用**：结尾的延伸阅读（→ `CrossRef`）；一两处行内提及（正文链接即可）
- **示例**：（新建后回填）

### `<CrossRef>` —— 延伸阅读

- **签名**：`{ title?, notes: { title, to, description? }[] }`（默认标题「延伸阅读」，description 一句话说明关联）
- **适用**：结尾过渡钩子的卡片化——点出相邻主题并给出可点击入口
- **不适用**：开头的必备前置（→ `Prerequisite`）
- **示例**：（新建后回填）

### `<VizBlock>` —— 自定义可视化外壳

- **签名**：`{ label, color?, children }`
- **适用**：现场手写的自定义可视化（无现成组件时）必须用它包壳，保持与组件库一致的视觉边界；label 规范：中文短标签 + 空格 + 英文斜杠小写
- **不适用**：内置组件已自带包壳/自带样式的，禁止二次包壳（双重边框红线）

---

## 二、演示层 `src/components/demo/`

### `<StepThrough>` —— 步进推演

- **签名**：`{ label?, steps: { title, desc?, render?, color? }[], autoMs?, height? }`（控制条：上一步/下一步/重置 + 步骤圆点可跳转；传 `autoMs` 出现自动播放）
- **适用**：**动态过程逐步推演**——每一步状态会变化、需要跟着走才能懂：事件循环单轮（同步→清微任务→取宏任务→渲染）、递归调用展开、Promise 链执行、react setState 到重渲染、git rebase 逐步搬提交。`render` 可放该步的状态快照（自定义 JSX/小图）
- **不适用**：步骤固定、状态不变的顺序说明（→ `Timeline`，静态更轻）；调参数看结果的（→ 私有模拟器）；能直接跑的代码（→ `PlayGround`）
- **示例**：（新建后回填）

### `<PlayGround>` —— 在线执行

- **签名**：`{ label?, code, height? }`（本地 iframe 沙箱，劫持 console 回显，离线可用）
- **适用**：读者改两行代码就能「哦原来如此」的行为验证——类型转换、this 绑定、事件循环顺序。代码必须自包含可直接运行
- **不适用**：输出题的逐条解读（配 `OutputTimeline`）；非浏览器端 JS（Node API 沙箱跑不了，用 `CodeBlock` + `node -e` 实测输出）；复杂多文件演示；含死循环的演示代码（iframe 沙箱挡不住 JS 死循环，会冻结整个页面 tab）
- **示例**：`type-coercion`、`this-binding`

### `CodeBlock`（默认导出）

- **签名**：`{ code, lang?: "javascript"|"typescript" }`（shiki 高亮，右上角复制按钮）
- **适用**：一切代码展示基座；输出题代码块的输出注释必须真实引擎运行结果
- **不适用**：需要读者执行的（→ `PlayGround`）；对错对照（→ `DoDont`）；增删行对照（→ `DiffBlock`）

### `<DiffBlock>` —— 代码增删对照

- **签名**：`{ label?, caption?, lines: { type: "add"|"del"|"keep", code }[] }`（GitHub diff 风格行底色 + +/− 前缀）
- **适用**：展示一次改动/修复/重构的前后差异（git 系列笔记刚需、"改成这样"场景）
- **不适用**：两个独立写法的对错（→ `DoDont`，是并列不是 diff）；完整代码展示（→ `CodeBlock`）
- **示例**：（新建后回填）

### `<CodeTabs>` —— 多实现对比

- **签名**：`{ tabs: { name, code, lang? }[] }`（标签切换，内部复用 CodeBlock）
- **适用**：同一问题的多种解法/多种语言（手写防抖 vs 节流各自实现、ES5 vs ES6 写法、Node vs 浏览器 API）
- **不适用**：两段代码是对错关系（→ `DoDont`）；需要并排对照而非切换的（→ `DoDont`/`DiffBlock`）
- **示例**：（新建后回填）

### `<CodeAnnotate>` —— 源码讲解

- **签名**：`{ code, lang?, annotations: { line, text, color? }[] }`（左侧高亮代码，右侧按行号批注；line 为 1 起始行号）
- **适用**：讲源码片段/规范算法实现——几个关键行各配一句"为什么"
- **不适用**：批注多于代码（那是正文小节的事）；整文件源码（截取关键片段）
- **示例**：（新建后回填）

### `<Collapsible>` —— 次要细节收纳

- **签名**：`{ title, children, defaultOpen? }`
- **适用**：完整推导过程、次要变体、延伸细节——感兴趣再展开，不打断主线阅读
- **不适用**：核心机制正文（主线内容不许折叠）； QAChain/Exercise 已覆盖的问答场景
- **示例**：（新建后回填）

### `<Exercise>` —— 练习自测

- **签名**：`{ question, answer, tags?, hint? }`（question/answer 可为字符串或 JSX；答案默认折叠，先做再看；tags 为考点标签）
- **适用**：动手题、改错题、实现题——读者应该真的写/改代码再看答案（与 QAChain 区分：QAChain 是面试问答模拟，Exercise 是练习题）
- **不适用**：面试追问答问练习（→ `QAChain`）；纯选择题（→ `Quiz`）
- **示例**：（新建后回填）

### `<Quiz>` —— 选择自测

- **签名**：`{ question, options: ReactNode[], answer: number, explain? }`（answer 为正确项下标；点选即时判对错并显示解析，可重试）
- **适用**：概念辨析的快速自测（输出顺序、概念归属、true/false 判断）
- **不适用**：需要动手的题（→ `Exercise`）；追问链（→ `QAChain`）
- **示例**：（新建后回填）

### `LogPanel` / `DemoButton` / `ResetButton`

- **签名**：`LogPanel { logs, placeholder?, className?, children? }`、`DemoButton { onClick, children, variant?, disabled? }`、`ResetButton { onClick }`
- **适用**：笔记私有交互演示的日志输出与控制按钮，三件套成组用（见 `reflow-repaint` 等演示型笔记）
- **不适用**：能被 `StepThrough`/`PlayGround` 覆盖的场景就不要自组演示

---

## 三、块流结构组件 `src/components/note.tsx`

架构见 BLOCK-SYSTEM.md：`NoteShell` 是唯一容器，内部平铺块流；**标题与内容平级**，禁止 Section/Prose 类结构容器。

### `<Heading>` —— 标题块

- **签名**：`{ level: 2 | 3, title }`（无 children——内容块是它的兄弟节点）
- **要点**：level 2 带 accent 竖线（无圆角）；自带 `data-toc` 锚点与 `scroll-mt-24`，目录跳转/黄闪落点在标题自身
- **废弃映射**：`Section` → `level={2}`；`Subsection` → `level={3}`

### `<Paragraph>` —— 正文段落块

- **签名**：`{ children }`（恰好一段；多段=多个 Paragraph 平铺）
- **要点**：children 内行内标记用原生 `<strong>/<em>/<code>/<del>` + 行级组件 `Kbd`/`Tag`
- **废弃映射**：`Prose`（多段聚合容器）→ 多个 Paragraph

### `<List>` —— 列表块

- **签名**：`{ items: ReactNode[], ordered? }`
- **要点**：内部渲染原生 `<ol>/<ul>`；列表标记不自绘

### `<NoteShell>` —— 唯一容器

- **签名**：`{ children }`；块流垂直布局器，自身不产生间距（间距由各块 `my-*` 驱动）

### `<Conclusion>` —— 结论块

每篇首个块；样式与签名见上（accent 边框 + 左缘 6px 实条 + 图标徽章 + 15px 中字重正文）。

### ❌ 已删除（块流体系迁移完成）

`Section` / `Subsection` / `Prose` 已删除，由 `Heading` / `Paragraph` 取代；全站笔记已迁移完毕。

其余：

### `<QAChain>` —— 追问链（面试自测）

- **签名**：`{ items: { q, intent?, a, bonus?, depth?: 1|2|3|4|5 }[], reveal?: "click"|"always", intro? }`
- **认知类型**：自测考核。答案默认折叠，点击「显示参考答案」展开（先想再看）；`reveal="always"` 直接展开
- **适用**：每篇笔记收尾的「经典追问链」；items 按深度递进排列（depth 1-2 热身 → 4-5 硬核）
- **不适用**：普通 FAQ 罗列（没有递进关系的零散问答不值得成链）；正文小节里的小检查点（用一段文字 + `DoDont` 即可）
- **字段规则**：`a` 主回答先结论后展开；`bonus` 只写 bonus 字段（独立加分框），不与 `a` 重复；轻量问答可省略 `intent`/`depth`（省略 depth 不显示徽章）

### `<Kbd>` —— 行内按键

- **签名**：`{ children }`，如 `<Kbd>Ctrl</Kbd> + <Kbd>C</Kbd>`
- **适用**：正文中的按键组合、快捷键引用（行内用法；成表 → `ShortcutTable`）
- **不适用**：非按键的行内代码（用 `<code>`）

### `<Tag>` —— 行内标记

- **签名**：`{ children }`，如 `<Tag>ES2020</Tag>`
- **适用**：给段落/机制打的轻量归类标记（规范阶段、环境限定、难度维度），一眼扫出关键属性
- **不适用**：重要程度高于正文强调的标记（→ `MemoryCard`/`Callout`）；一屏超过 5 个（过载）

---

## 四、按需登记候选区（未实现，触发即开发）

只登记认知类型与触发条件；**出现真实笔记需求时**，按下方开发流程实现后移入上文正式区。

| 候选组件                 | 认知类型    | 触发条件（出现这种内容才开发）                                                                     | 备注                                |
| ------------------------ | ----------- | -------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `TreeView`               | 树/链结构   | 需要交互式展开/折叠的多层树（DOM 树、组件树、目录树）；静态链式引用 `MemoryMap`/`FlowChart` 已覆盖 | React Flow 可封装                   |
| `Quadrant`               | 象限定位    | 四象限选型决策（框架选型、方案权衡）                                                               | 纯 SVG 自研成本低                   |
| `FormulaWalk`            | 公式推导    | 多步公式推导且每步需要高亮变动项                                                                   | 可先用 `StepThrough` 的 render 代替 |
| `PieChart` / `LineChart` | 占比 / 趋势 | 占比构成、指标随规模变化的曲线（性能对比）                                                         | recharts 封装                       |
| `MultiCompare`           | 多方对照    | ≥3 个概念的多维逐点对比且 `Table` 表现力不够                                                       | CompareTable 扩展                   |
| `Term`                   | 术语悬浮    | 站内术语 hover 显示定义并链接笔记，形成知识图谱黏合                                                | 需术语索引数据                      |
| `GlossaryCard`           | 术语卡      | 入门篇的一句话定义 + 类比卡片                                                                      |                                     |
| `Objectives`             | 学习目标    | 笔记开头的「学完你会…」清单                                                                        |                                     |
| `Checklist`              | 实践清单    | 带勾选框的最佳实践清单                                                                             |                                     |
| `Footnote`               | 脚注        | 出处过多需要脚注区                                                                                 |                                     |
| `H4`                     | 四级标题    | 小节内还需要一级细分标题                                                                           | 带大纲锚点                          |
| `Breadcrumb`             | 路径导航    | 页面级 taxonomy 路径组件化                                                                         |                                     |

## 五、新组件开发流程

1. 确认第 3 步查表确实无匹配组件、npm 生态无成熟轻量包（禁外部 CDN）
2. 先在本文件候选区登记 → 实现放 `src/components/viz/`（静态）或 `src/components/demo/`（交互），遵守三层边界、VizBlock 包壳、配色语义（蓝 #1677ff 通用 / 紫 #8b5cf6 对比左 / 橙 #f59e0b 同步警告 / 绿 #3fb950 正确 / 红 #f85149 错误）
3. 在 `src/components/viz/index.tsx` 补 re-export，本文件正式区补条目（签名 + 适用/不适用 + 示例）
4. `pnpm build && pnpm lint` 通过
