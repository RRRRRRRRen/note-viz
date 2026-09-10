# NoteViz

个人知识库：问答 / 案例分析 / 面试题详解，用交互与可视化讲透知识点。全文搜索、标签聚合、反向引用、笔记类型系统（知识 / 问题 / 实战 / 草稿）。

## 技术栈

Vite · React 19 · TypeScript (strict) · Tailwind CSS 4 · @xyflow/react · framer-motion · shiki · vitest · oxlint/oxfmt · pnpm · Node 22

## 开发

```bash
pnpm install
pnpm dev        # 本地开发（自行启动）
pnpm build      # 构建 + 类型检查 + 内容闸门校验
pnpm test       # vitest（闸门 / 检索 / 大纲契约）
pnpm lint       # oxlint
pnpm format     # oxfmt
```

## 写笔记

每篇笔记一个目录：`src/content/<领域>/<技术>/<知识面>/<笔记>/`

```
src/content/frontend/javascript/event-loop/my-note/
├── meta.ts      # 必填六字段
└── index.tsx    # 笔记组件（可放私有子组件）
```

meta 写法：

```ts
import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "笔记标题", // 问题型必须是问句，≤25 字
  description: "一句话描述",
  type: "knowledge", // knowledge 知识 | question 问题 | practice 实战 | draft 草稿
  difficulty: "入门", // 入门 | 进阶 | 高级
  tags: ["标签1"],
  updated: "2026-09-10",
} satisfies NoteMeta;
```

构建时自动扫描注册并校验（六字段 / 类型化标题 / 内部链接 / taxonomy 登记 / 语义色），违规直接构建失败。新领域/技术/知识面在 `src/content/taxonomy.ts` 登记（label / color / icon / order）。

完整写作规范见 `.agents/skills/noteviz-note-writing/`（一篇一论与笔记类型 / 组件选型字典 / 块流架构），工程约定见 `docs/engineering.md`，AI 工作区契约见 `.agents/README.md`。

## 部署

```bash
docker build -t note-viz .
docker run -p 8080:80 note-viz
```

多阶段构建：node:22 构建 → nginx 托管，SPA 路由回退与缓存策略已配置。
