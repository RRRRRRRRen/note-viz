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
          scope: {
            label: "作用域与上下文",
          },
          closure: {
            label: "闭包",
          },
          prototype: {
            label: "原型链",
          },
          memory: {
            label: "内存管理",
          },
          types: {
            label: "类型系统",
            children: {
              "type-coercion": {
                label: "类型与隐式转换",
              },
              "deep-clone": {
                label: "深浅拷贝",
              },
            },
          },
          patterns: {
            label: "常用模式",
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
          core: {
            label: "核心机制",
          },
        },
      },
      browser: {
        label: "浏览器",
        children: {
          fundamentals: {
            label: "工作原理",
          },
        },
      },
      engineering: {
        label: "工程化",
        children: {
          build: {
            label: "构建",
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
      spring: {
        label: "Spring",
        children: {
          autoconfigure: {
            label: "自动配置",
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
  devtools: {
    label: "开发工具",
    color: "#8b5cf6",
    icon: "Package",
    children: {
      git: {
        label: "Git",
        children: {
          basics: {
            label: "基础操作",
            children: {
              "daily-commands": {
                label: "日常操作与撤销",
              },
            },
          },
          "object-model": {
            label: "对象模型",
            children: {
              "content-addressing": {
                label: "内容寻址与四大对象",
              },
            },
          },
          refs: {
            label: "引用系统",
            children: {
              "branch-head": {
                label: "分支、HEAD 与 reflog",
              },
            },
          },
          merge: {
            label: "合并",
            children: {
              "three-way-merge": {
                label: "三方合并与冲突",
              },
            },
          },
          remote: {
            label: "远程协作",
            children: {
              "fetch-pull": {
                label: "fetch 与远程同步",
              },
              "ssh-setup": {
                label: "SSH 配置与多远程",
              },
            },
          },
          storage: {
            label: "存储与回收",
            children: {
              "gc-and-lfs": {
                label: "存储、GC 与大文件",
              },
            },
          },
        },
      },
      homebrew: {
        label: "Homebrew",
        children: {
          basics: {
            label: "基础",
          },
        },
      },
      ssh: {
        label: "SSH",
        children: {
          fundamentals: {
            label: "基础原理",
            children: {
              "remote-access": {
                label: "远程登录与安全原理",
              },
            },
          },
          tunneling: {
            label: "隧道与转发",
            children: {
              "port-forwarding": {
                label: "端口转发与跳板机",
              },
            },
          },
          security: {
            label: "访问安全体系",
            children: {
              "bastion-zero-trust": {
                label: "堡垒机与零信任",
              },
            },
          },
        },
      },
    },
  },
};
