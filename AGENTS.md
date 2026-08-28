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

创建或修改 `src/content/` 下的笔记时，**必须使用 `noteviz-note-writing` skill**，按其工作流执行。要点：

1. **禁止跳过大纲确认直接动笔**——先产出大纲提案 + 询问熟悉程度，用户确认后才写正文
2. 内容规范、组件 API、视觉规范、详略表全部在 skill 文件里（`.opencode/skills/noteviz-note-writing/SKILL.md`）
3. 组件签名以源码为准：`src/components/note.tsx`（排版）、`src/components/viz.tsx`（可视化）
4. 构建时自动扫描注册笔记并校验 meta 五字段，缺失直接报错

## 验证

任何代码改动后：`pnpm build && pnpm lint`，格式化用 `pnpm format`（写文件前跑，避免提交格式噪音）。
