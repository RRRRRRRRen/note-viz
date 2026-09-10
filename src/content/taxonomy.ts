import type { TaxonomyNode } from "../lib/types.ts";

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
            order: ["event-loop-basics"],
          },
          scope: {
            label: "作用域与上下文",
            order: ["execution-context", "scope-chain", "this-binding"],
          },
          closure: {
            label: "闭包",
            order: ["closure-basics", "closure-patterns"],
          },
          prototype: {
            label: "原型链",
            order: ["prototype-chain", "inheritance"],
          },
          memory: {
            label: "内存管理",
            order: ["gc-and-leaks"],
          },
          types: {
            label: "类型系统",
            order: ["typeof-null", "type-coercion", "float-precision", "deep-clone"],
            children: {
              "typeof-null": {
                label: "类型判断三把尺子",
              },
              "type-coercion": {
                label: "类型与隐式转换",
              },
              "float-precision": {
                label: "浮点精度",
              },
              "deep-clone": {
                label: "深浅拷贝",
              },
            },
          },
          patterns: {
            label: "常用模式",
            order: ["debounce-throttle", "event-emitter", "bind-new-priority", "concurrency-pool"],
          },
        },
      },
      typescript: {
        label: "TypeScript",
        children: {
          basics: {
            label: "语言基础",
            order: ["ts-feature-surface", "ts-version-history", "declaration-files"],
          },
        },
      },
      react: {
        label: "React",
        children: {
          hooks: {
            label: "Hooks 原理",
            order: ["hooks-render", "effect-vs-layout-effect", "hooks-order-rules"],
          },
          reconcile: {
            label: "协调与 Diff",
            order: ["key-index-mismatch"],
          },
          core: {
            label: "核心机制",
            order: ["setstate-scheduling", "fiber-rendering", "synthetic-events"],
          },
        },
      },
      browser: {
        label: "浏览器",
        children: {
          fundamentals: {
            label: "工作原理",
            order: ["url-to-render", "reflow-repaint"],
          },
        },
      },
      engineering: {
        label: "工程化",
        children: {
          build: {
            label: "构建",
            order: ["build-problem", "loader-vs-plugin", "hmr-incremental", "tree-shaking-cjs"],
          },
          "package-management": {
            label: "包管理与依赖",
            order: [
              "different-deps",
              "lockfile-consistency",
              "lockfile-changes",
              "cache-desync",
              "pnpm-structure",
              "version-managers",
              "unified-toolchain",
            ],
          },
          typescript: {
            label: "TypeScript 工程化",
            order: [
              "ts-roles",
              "ts-native-compiler",
              "ts-version-drift",
              "tsserver-internals",
              "vite-transpile-ts",
              "tsconfig-readers",
              "module-resolution",
              "project-references",
              "type-lookup",
              "tool-conflicts",
            ],
          },
        },
      },
      css: {
        label: "CSS",
        children: {
          layout: {
            label: "布局系统",
            order: ["flex-vs-grid", "flex-shrink-min-width", "auto-fill-auto-fit"],
          },
        },
      },
    },
  },
  network: {
    label: "网络",
    color: "#0ea5e9",
    icon: "Network",
    children: {
      http: {
        label: "HTTP",
        children: {
          compression: {
            label: "内容压缩",
            order: ["gzip-deflate", "gz-file-format", "content-negotiation", "brotli-zstd"],
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
            order: ["backpressure"],
          },
        },
      },
      spring: {
        label: "Spring",
        children: {
          autoconfigure: {
            label: "自动配置",
            order: ["auto-configuration"],
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
            order: ["covering-index"],
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
            order: ["daily-commands", "undo-commands", "collab-workflow"],
            children: {
              "daily-commands": {
                label: "三个区怎么分工",
              },
              "undo-commands": {
                label: "撤销三件套",
              },
              "collab-workflow": {
                label: "提交历史规范",
              },
            },
          },
          "object-model": {
            label: "对象模型",
            order: ["content-addressing"],
            children: {
              "content-addressing": {
                label: "内容寻址与四大对象",
              },
            },
          },
          refs: {
            label: "引用系统",
            order: ["branch-head"],
            children: {
              "branch-head": {
                label: "分支、HEAD 与 reflog",
              },
            },
          },
          merge: {
            label: "合并",
            order: ["three-way-merge"],
            children: {
              "three-way-merge": {
                label: "三方合并与冲突",
              },
            },
          },
          remote: {
            label: "远程协作",
            order: ["fetch-pull", "ssh-setup"],
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
            order: ["gc-and-lfs", "large-files"],
            children: {
              "gc-and-lfs": {
                label: "存储与 GC",
              },
              "large-files": {
                label: "大文件与 LFS",
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
            order: ["brew-essentials", "mirror-proxy"],
          },
        },
      },
      docker: {
        label: "Docker",
        children: {
          registry: {
            label: "镜像与制品仓库",
            order: [
              "image-container-registry",
              "image-transport",
              "nexus",
              "registry-selection",
              "offline-transfer",
            ],
            children: {
              "image-container-registry": {
                label: "镜像、容器与仓库",
              },
              "offline-transfer": {
                label: "离线搬运镜像",
              },
            },
          },
          basics: {
            label: "基础概念",
            order: ["deploy-pipeline"],
            children: {
              "deploy-pipeline": {
                label: "从 dist 到线上",
              },
            },
          },
          dockerfile: {
            label: "Dockerfile 与构建",
            order: ["build-anatomy", "build-context-cache", "inheritance-entrypoint"],
            children: {
              "build-anatomy": {
                label: "Dockerfile 装配",
              },
              "build-context-cache": {
                label: "构建上下文与缓存",
              },
              "inheritance-entrypoint": {
                label: "继承与启动钩子",
              },
            },
          },
          deploy: {
            label: "部署实战",
            order: ["nginx-conf-anatomy", "deploy-script-anatomy", "container-debug-502"],
            children: {
              "nginx-conf-anatomy": {
                label: "nginx.conf 解读",
              },
              "deploy-script-anatomy": {
                label: "deploy.sh 解读",
              },
              "container-debug-502": {
                label: "容器与 502 排查",
              },
            },
          },
        },
      },
      ssh: {
        label: "SSH",
        children: {
          fundamentals: {
            label: "基础原理",
            order: ["remote-access", "file-transfer"],
            children: {
              "remote-access": {
                label: "远程登录与安全原理",
              },
              "file-transfer": {
                label: "scp 与 rsync",
              },
            },
          },
          tunneling: {
            label: "隧道与转发",
            order: ["port-forwarding", "jump-host"],
            children: {
              "port-forwarding": {
                label: "端口转发",
              },
              "jump-host": {
                label: "跳板机",
              },
            },
          },
          security: {
            label: "访问安全体系",
            order: ["bastion-audit", "ssh-certificates", "zero-trust"],
            children: {
              "bastion-audit": {
                label: "堡垒机与会话审计",
              },
              "ssh-certificates": {
                label: "SSH 证书",
              },
              "zero-trust": {
                label: "零信任",
              },
            },
          },
        },
      },
      shell: {
        label: "Shell / 命令行",
        children: {
          "text-pipeline": {
            label: "文本搜索与管道",
            order: ["grep-pipe-basics"],
          },
          "file-basics": {
            label: "文件与压缩",
            order: ["file-type-magic", "gzip-cli"],
          },
        },
      },
    },
  },
};
