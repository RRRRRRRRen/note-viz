# AGENTS.md

NoteViz：纯前端程序员学习站（Vite + React + TS + Tailwind 4）。

## 常用命令

```bash
pnpm dev        # 开发服务器（用户自己启动，AI 禁止启动）
pnpm build      # tsc 类型检查 + vite 构建（meta 校验在构建时强制执行）
pnpm lint       # oxlint
pnpm format     # oxfmt 格式化
pnpm preview    # 预览 dist（AI 禁止启动）
```

## 硬性禁令（最高优先级）

**禁止启动任何长期运行的服务**——包括 `pnpm dev`、`pnpm preview`、`docker run`、任何 `--watch`/`serve` 类命令。开发服务器由用户自己启动和管理。AI 启动后台服务会不经确认地占用端口与机器资源，属于严重违规。

需要验证页面效果时，只允许：`pnpm build && pnpm lint` 静态检查，或与用户沟通后由用户自行在浏览器确认。

## 项目约定

- **Node >= 22**（engines 已声明），包管理用 pnpm
- TypeScript strict 全开（含 `exactOptionalPropertyTypes`、`noUncheckedIndexedAccess`）——可选属性用 `...(x !== undefined ? { x } : {})` 模式
- **优先成熟 npm 包，不重复造轮子**：需要某种能力（流程图、图表、在线执行、动画……）时先调研社区方案（React Flow、Sandpack、recharts 等），确认无合适包再自研；同时不为简单需求引重型依赖
- 提交信息用中文简短描述，格式 `type: 描述`
- 每完成一个阶段或一个功能点即 commit；不主动 commit，等用户确认

## 写笔记（重要）

本仓库同时是用户的学习讨论空间：用户会以本仓库为根目录开启 AI agent 讨论技术知识。**讨论/学习过程中禁止主动创建笔记页面或触发 `noteviz-note-writing` skill**——只有用户明确要求"整理笔记"或"开始写笔记"时，才进入下述写作流程。

创建或修改 `src/content/` 下的笔记时，**必须使用 `noteviz-note-writing` skill**，按其工作流执行。要点：

1. **一篇一问**：笔记按知识点组织而非综合指南——一篇笔记 = 一个知识点 = 一个问句标题；话题知识点多时先出拆分表格再逐篇写
2. **禁止跳过大纲确认直接动笔**——先产出大纲提案（固定表格：标题 / 知识点 / 难度，每行一篇笔记）+ 询问熟悉程度，用户确认后才逐篇写正文
3. 内容规范、组件 API、视觉规范、详略表全部在 skill 文件里（`.opencode/skills/noteviz-note-writing/SKILL.md`）
4. 组件签名以源码为准：`src/components/note.tsx`（排版）、`src/components/viz/`（可视化目录）
5. 构建时自动扫描注册笔记并校验 meta 五字段，缺失直接报错

## 验证

任何代码改动后：`pnpm build && pnpm lint`，格式化用 `pnpm format`（写文件前跑，避免提交格式噪音）。
