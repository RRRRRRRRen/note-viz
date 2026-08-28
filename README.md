# NoteViz

纯前端程序员学习站：问答 / 案例分析 / 面试题详解，用交互与可视化讲透知识点。

## 技术栈

Vite · React 18+ · TypeScript (strict) · Tailwind CSS 4 · framer-motion · shiki · oxlint/oxfmt · pnpm · Node 22

## 开发

```bash
pnpm install
pnpm dev        # 本地开发（自行启动）
pnpm build      # 构建 + 类型检查
pnpm lint       # oxlint
pnpm format     # oxfmt
```

## 写笔记

每篇笔记一个目录：`src/content/<一级领域>/<二级技术>/<三级知识面>/<笔记>/`

```
src/content/frontend/javascript/event-loop/my-note/
├── meta.ts      # 必填：title / description / difficulty / tags / updated
└── index.tsx    # 笔记组件（可放私有子组件）
```

meta 写法：

```ts
import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "笔记标题",
  description: "一句话描述",
  difficulty: "入门", // 入门 | 进阶 | 高级
  tags: ["标签1"],
  updated: "2026-08-28",
} satisfies NoteMeta;
```

构建时自动扫描注册并校验 meta，缺失即报错。新领域/技术/知识面在 `src/content/taxonomy.ts` 登记（label/color/icon）。

## 部署

```bash
docker build -t note-viz .
docker run -p 8080:80 note-viz
```

多阶段构建：node:22 构建 → nginx 托管，SPA 路由回退已配置。
