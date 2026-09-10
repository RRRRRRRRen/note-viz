import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "reset --hard 丢弃的提交去哪了？",
  description:
    "分支是 41 字节的指针文件，HEAD 决定 commit 挂在哪，reflog 记录指针的每一步移动——三层引用系统叠起来，解释了为什么 Git 开分支近乎免费、detached HEAD 为什么会「丢代码」、以及被 reset 掉的提交为什么还在（reflog 可达期 90/30 天内都能救回）。",
  difficulty: "入门",
  tags: ["Git", "分支", "HEAD", "reflog", "指针", "detached HEAD"],
  updated: "2026-09-10",
} satisfies NoteMeta;
