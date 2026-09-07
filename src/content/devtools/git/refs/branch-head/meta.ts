import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "分支、HEAD 与 reflog",
  description:
    "分支是 41 字节的指针文件，HEAD 决定 commit 挂在哪，reflog 记录指针的每一步移动——三层引用系统叠起来，解释了为什么 Git 开分支近乎免费、detached HEAD 为什么会「丢代码」、以及被 reset 掉的提交去哪了。",
  difficulty: "入门",
  tags: ["Git", "分支", "HEAD", "reflog", "指针", "detached HEAD"],
  updated: "2026-09-03",
} satisfies NoteMeta;
