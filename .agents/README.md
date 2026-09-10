# .agents/ —— AI 工作区契约

> 本目录是本仓库全部 AI 资产（技能 / 任务 / 计划 / MCP）的 **canonical 源**，工具无关。
> 四层架构：`AGENTS.md`（宪法，每会话必读，保持精简）→ 本文件（契约）→ `.agents/*`（内容）→ 各工具原生路径（桥接层，生成物）。
> 设计原理：AGENTS.md 每个会话都进上下文（贵），只放身份/硬禁令/命令/路由表；重内容放本目录按需读取（便宜）。

## 目录结构

```
.agents/
├── README.md        本契约
├── skills/          能力包：一个目录一个 skill
│   └── <name>/
│       ├── SKILL.md     唯一入口：frontmatter 含 name / description（含触发词）
│       └── *.md         支撑文档；SKILL.md 是目录，不是全书
├── tasks/           任务清单：backlog.md 常备
│   └── archive/        历史区清空后归档
├── plans/           计划：一个 initiative 一个文件 <slug>.md
│   └── archive/        完成的计划移入（决策记录永久保留）
├── mcp/             MCP 声明：servers.json（mcpServers 事实标准格式）
└── local/           机器本地状态（gitignore，永不提交）
```

## 各区规范

### skills/

- frontmatter 必含 `name` 与 `description`（description 写清触发词，供路由与自动发现）
- 修改规范必须同步改 SKILL.md（元约束：文档滞后于实现等于没有规范）
- 新 skill 流程：先在 SKILL.md 候选区登记 → 实现 → 回填示例
- 现有：`noteviz-note-writing`（笔记写作规范）

### tasks/（backlog.md）

- 固定分区：`进行中` / `待办` / `暂缓（带触发条件）` / `拒绝（存档）`
- 固定表头 `| # | 类型 | 任务 | 备注 |`，全局连续编号
- 生命周期：完成即在当次 commit 内移出（不留「已完成区」膨胀）；区清空后整体移入 archive/

### plans/

- 一个 initiative 一文件，命名 `<slug>.md`（如 `2026-09-10-arch-review.md`）
- 固定骨架：**目标 / 批次表 / 决策记录 / 验收状态**——决策记录是最值钱的部分，归档不删
- 全部批次完成 → 移入 archive/

### mcp/

- `servers.json` 为准（格式同 Claude/Cursor/Codex 的 `mcpServers` 事实标准）
- **仓库级只放项目必需的服务器（当前为零）；个人 MCP 留在各自用户级配置**
- 接入新工具时按下方桥接矩阵同步，同步物是生成物

## 桥接矩阵

| 工具        | 入口                                               | skills                                              | mcp                                  |
| ----------- | -------------------------------------------------- | --------------------------------------------------- | ------------------------------------ |
| ZCode       | AGENTS.md 原生                                     | 指令路由（AGENTS.md 路由表）                        | 用户级配置，以 servers.json 为准同步 |
| OpenCode    | AGENTS.md 原生                                     | `.opencode/skills/<name>` → 相对 symlink 指回本目录 | opencode 配置引用 servers.json 内容  |
| Claude Code | AGENTS.md（新版原生；旧版 CLAUDE.md 一行 include） | 指令路由                                            | `.mcp.json` 从 servers.json 同步     |
| Cursor      | AGENTS.md（0.49+ 原生）                            | .cursor/rules 放一行路由指令                        | settings 同步                        |

**铁律**：桥接层永远是生成物——改内容只改 `.agents/`，桥接坏了重建，**绝不反向编辑**。
注意：git symlink 在 Windows 检出会碎（本项目个人 macOS，可接受；Windows 协作时改用指令路由）。

## 生命周期与净化约定

1. 新工作登记 backlog → 进行中 → 完成（当次 commit 内移出）
2. 多批次 initiative 建 plans/<slug>.md，每批更新验收状态，完成归档
3. **docs/ 与仓库根永远不出现 AI 过程文件**——它们只属于 `.agents/`（产品文档区保持纯净）
