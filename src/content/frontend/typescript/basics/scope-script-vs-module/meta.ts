import type { NoteMeta } from "@/lib/types";

export const meta = {
  title: "没有 import/export 的文件是全局的？",
  description:
    "TS 按顶层有无 import/export 把文件二分为模块和脚本：脚本顶层声明自动注入全局作用域，加载即生效，不需要任何人 import。生效条件是被拉进编译程序（include / 被导入 / 三斜线引用三条路径）；同名 .ts 与 .d.ts 并存时 .d.ts 被视为附属声明而失效。",
  difficulty: "进阶",
  type: "question",
  tags: ["全局作用域", "模块", "脚本", "d.ts", "include"],
  updated: "2026-09-23",
} satisfies NoteMeta;
