import type { TaxonomyNode } from "../lib/types";

export const taxonomy: Record<string, TaxonomyNode> = {
  frontend: {
    label: "前端",
    color: "#3b82f6",
    icon: "Globe",
    children: {
      javascript: {
        label: "JavaScript",
        children: {
          "event-loop": {
            label: "事件循环",
          },
          closure: {
            label: "闭包与作用域",
          },
          prototype: {
            label: "原型链",
          },
        },
      },
      react: {
        label: "React",
        children: {
          hooks: {
            label: "Hooks 原理",
          },
          reconcile: {
            label: "协调与 Diff",
          },
        },
      },
      css: {
        label: "CSS",
        children: {
          layout: {
            label: "布局系统",
          },
        },
      },
    },
  },
  backend: {
    label: "后端",
    color: "#10b981",
    icon: "Server",
    children: {
      nodejs: {
        label: "Node.js",
        children: {
          stream: {
            label: "流与缓冲",
          },
        },
      },
    },
  },
  database: {
    label: "数据库",
    color: "#f59e0b",
    icon: "Database",
    children: {
      mysql: {
        label: "MySQL",
        children: {
          index: {
            label: "索引原理",
          },
        },
      },
    },
  },
};
