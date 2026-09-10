# NoteViz 工程规范

> 面向在本仓库写代码的人和 AI agent。笔记**写作**规范在 `.agents/skills/noteviz-note-writing/`（SKILL / COMPONENTS / PAINPOINTS），本文管**代码侧**的全部约定。

## 目录结构（职责单一）

```
src/lib/                 纯逻辑与数据，不渲染 UI
  registry.ts            taxonomy 目录树构建（消费 virtual:content-registry）
  types.ts               全站类型单一来源（NoteMeta/NoteEntry/SearchEntryLite…）
  store.ts               createStore 极简 external store 工厂
  theme/tabs/search.ts   三个全局 store（主题/多标签页/搜索面板开闭）
  search-query.ts        检索打分纯函数
  layout.ts              布局常量（SIDEBAR_W）
  zen.tsx                唯一 Context（禅模式）
  highlight.ts           shiki 单例（core 入口 + 显式 js/ts 两语言）
src/components/          UI 组件（文件名全小写 kebab-case）
  note/                  块流结构组件（blocks/qa/figure/flash + index.ts 桶）
  viz/                   静态可视化（自带 VizBlock 包壳；桶 index.ts）
  demo/                  交互演示（桶 index.ts；CodeBlock 默认导出已转具名）
  layout/                应用外壳：TopBar / Sidebar / Toc / SearchPalette
  根目录                 跨层小件：palette / badges / mark / note-row / page-header
src/pages/               路由页面（全部 route.lazy 懒加载）
src/content/             笔记内容：每目录一篇（meta.ts + index.tsx，可带私有组件）
plugins/contentScan/     构建插件五模块（见下）
scripts/                 维护工具（node scripts/xxx.js 直接跑）
docs/                    工程规范（本文件）
```

`plugins/contentScan/` 内部分工：`scan.ts`（磁盘扫描）→ `extract.ts`（纯文本/链接提取）→ `validate.ts`（闸门校验，**纯函数、有单测**）→ `generate.ts`（三个虚拟模块代码生成）→ `index.ts`（插件入口）。改闸门规则 = 改 validate.ts + 同步 validate.test.ts。

`scripts/` 三个工具：`migrate-palette.js`（语义色字面量↔常量迁移，支持 `--reverse`）、`merge-demo-imports.js`（demo 深路径导入合并）、`privacy-audit.js`（开源前隐私扫描，运行即出报告）。

## 命名与导出

- 组件文件**小写 kebab-case**（`note-row.tsx`）；强相关小件可合并（`badges.tsx` = 难度 + 类型徽章）
- 桶文件统一 `index.ts`；导出一律**具名导出**（默认导出仅限笔记的 `index.tsx` 与 `Sidebar`）
- 类型集中在 `lib/types.ts`；虚拟模块的元素类型也在那里（`vite-env.d.ts` 只留模块声明）

## 状态管理选型

| 场景           | 方案                            | 例                      |
| -------------- | ------------------------------- | ----------------------- |
| 跨组件全局状态 | `lib/store.ts` 的 `createStore` | theme / tabs / search   |
| 树形供给       | Context（仅一处）               | zen                     |
| 局部交互       | `useState`                      | QA 展开、Checklist 勾选 |

不引状态库。localStorage 键统一 `noteviz-` 前缀，读写都要 try/catch（隐私模式静默降级）。

## 构建闸门（contentScan，违规 = 构建失败）

1. **meta 六字段**：title / description / **type** / difficulty / tags / updated；type 枚举 knowledge·question·practice·draft
2. **类型化标题与 draft 行为**：标题规则源在 validate.ts（有单测）；draft 不进任何聚合（导航/首页/分类/标签/搜索），仅 URL 直达
3. **内部链接**：正文中的 `/note/…` 链接必须指向存在的笔记
4. **taxonomy 登记**：每篇必须列入所属知识面节点的 `order` 数组
5. **语义色**：笔记内容与应用源码（`src/pages|components|lib`）禁止 PALETTE 七值字面量（`="#1677ff"` / `: "#1677ff"` 模式）。豁免：`palette.ts` 本体、`taxonomy.ts` 领域色（配置数据）、Tailwind className 任意值（`text-[#3fb950]` 这类无法引用 JS 常量，属结构性限制）

## 虚拟模块契约

| 模块                       | 内容                                                      | 消费方式                                       |
| -------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| `virtual:content-registry` | `notes[]`：slug/path/meta 静态导入 + load 懒加载          | `lib/registry.ts`                              |
| `virtual:search-index`     | `searchEntries[]`：剥 JSX 纯文本索引（draft 排除），MB 级 | **仅 SearchPalette 动态 import**，禁止静态引入 |
| `virtual:backlinks`        | path → 引用方笔记列表（小）                               | NotePage 静态引入                              |

生成逻辑在 `plugins/contentScan/generate.ts`；新增虚拟模块要走同一套 resolveId/load/configureServer 失效。

## 视觉与布局常量

- 语义色单一来源 `src/components/palette.ts`（7 值）；UI 主题色走 `index.css` CSS 变量（明暗双套）
- 布局常量两处单一来源：`SIDEBAR_W`（`lib/layout.ts`，App 动画容器与 Sidebar 共用）、`--chrome-h`（`index.css`，顶栏 56 + 标签栏 36）。**改布局先改这两处，不要在别处写死数字**
- framer-motion 不进首屏：`MotionConfig reducedMotion="user"` 挂在 NotePage 笔记层，App 外壳动画用 CSS transition
- 大纲 DOM 契约的单一来源：`TOC_HEADING_SELECTOR`（`components/note/blocks.tsx` 导出），Toc 侧引用常量，禁止手写选择器字符串

## 测试

- vitest（`pnpm test`）；当前覆盖三类：构建闸门纯函数（validate）、检索打分（search-query）、大纲 DOM 契约（Toc，jsdom）
- **改闸门 / 检索 / 大纲链路必须跑测试**；给纯函数留可测出口（validate 就是纯函数化的样板）

## 批量改动流程（历史教训，务必遵守）

1. 批量脚本改完内容：**按命令退出码**跑 `pnpm build` 验证——不要用 `build | grep error` 管道（grep 匹配到错误行反而 exit 0，会吞掉构建失败）
2. 冒烟测试临时改文件后：用脚本精确恢复，**不要 `git checkout`**（会把文件打回未迁移的 HEAD 版本引发连锁）
3. 脚本插入 import 的锚点：**文件顶部第一个连续 import 区的结束行**（带多行 import 深度跟踪）——不能按「最后一个 import 开头的行」找（多行 import 块会插错位），也不能全文件扫（教学代码示例里有以 `import` 开头的行）
