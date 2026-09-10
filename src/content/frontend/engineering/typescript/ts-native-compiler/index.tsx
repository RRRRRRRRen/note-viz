import { FlowChart } from "@/components/demo";
import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import { Callout, CrossRef, DoDont, MemoryCard, Prerequisite, VersionNote } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        TS 7 不是普通的版本号跳动：编译器用 Go
        整体重写、按平台分发原生二进制（官方口径大型代码库提速 8-12 倍）、语言服务换 LSP 协议、
        <code>strict</code> 默认开启。但「三个角色」的分工一格没变——tsc
        还是审计、语言服务还是投影、剥类型转译器还是外人。真正的破坏面只有一处：
        <strong>语言兼容 ≠ API 兼容</strong>，把 typescript 包当库嵌入的工具断供，而零 API
        依赖的技术栈无感。npm 包的心智也要换：它只是
        <strong>分发容器</strong>，执行的是原生进程。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "TypeScript 的各个版本都迭代了什么？",
            to: "/note/frontend/typescript/basics/ts-version-history",
          },
        ]}
      >
        需要先知道 6.0 是「最后一个 JS 版编译器」的过渡版——7.0 的硬移除都在 6.0 预告过。
      </Prerequisite>

      <Heading level={2} title="为什么是原生，为什么是现在" />
      <Paragraph>
        JS 工具用 JS 写是 2012 年代的引导期选择——「跑在 node
        上、零编译门槛」当时是正确决策。现在原生二进制加按平台分发的基建成熟了，热路径不值得再付 JS
        的运行时代价，于是浪潮席卷整个工具链：esbuild（Go）、swc、Rspack、Rolldown、oxc/oxlint/oxfmt、Biome、Lightning
        CSS、Tailwind v4 的 Oxide 引擎全是 Rust 系，tsgo 是 Go 系，连 Python
        生态都在复制这个剧本（ruff、uv）。TS 团队选 Go 的理由很务实：GC
        语义与编译器天然合拍，且官方宣称大型代码库构建提速 8-12 倍——靠的是跨核并行解析、检查与产出。
      </Paragraph>
      <Paragraph>
        分发方式随执行形态一起换：npm 包里那 20 行 <code>@typescript/typescript-darwin-arm64</code>
        、<code>typescript-linux-x64</code> 平台包（optionalDependencies 装对应平台的二进制），和
        esbuild、oxlint 的套路一模一样。<strong>npm 包从「运行时容器」变成了「分发容器」</strong>
        ——它负责下载、解压、链接，执行的根本不是 node。
      </Paragraph>

      <Heading level={2} title="实测：一条启动链的完整解剖" />
      <Paragraph>
        「node 能调度 Go 吗」这个问题本身就有个隐藏误解——不需要调度，node
        只是个几十毫秒的打火机。以下是在本仓库逐层实测的真实启动链：
      </Paragraph>
      <FlowChart
        label="tsc 启动链 / startup chain"
        data={{
          direction: "LR",
          nodes: [
            { id: "bin", label: "node_modules/.bin/tsc（shell 脚本）", color: PALETTE.gray },
            {
              id: "launcher",
              label: "typescript/bin/tsc（一行 node 启动器）",
              color: PALETTE.blue,
            },
            { id: "exe", label: "lib/tsc.js（getExePath + execve）", color: PALETTE.orange },
            { id: "native", label: "平台二进制 Mach-O 原生进程", color: PALETTE.green },
          ],
          edges: [
            { source: "bin", target: "launcher", label: "exec node" },
            { source: "launcher", target: "exe", label: "import" },
            { source: "exe", target: "native", label: "execve 进程替换" },
          ],
        }}
      />
      <Paragraph>
        关键在最后一跳：<code>lib/tsc.js</code> 里用的是 <code>process.execve</code>——它用原生二进制
        <strong>替换掉当前进程</strong>，连 node
        都不留；失败才降级为子进程方式。所有编译工作都发生在 Go
        进程里。附带一个细节：平台二进制包里连 <code>lib.dom.d.ts</code>{" "}
        这类标准库声明都随身携带——类型内核的行李跟着二进制走。
      </Paragraph>

      <Heading level={2} title="默认值变了什么，迁移怎么走" />
      <VersionNote
        label="strict 与废弃的三个阶段 / defaults"
        note="三级火箭的最后一站的落点：迁移 7 的第一步永远是补显式配置，否则行为静默改变。"
        versions={[
          { range: "TS 5.x", text: "strict 默认关闭——老项目大多显式开启", color: PALETTE.gray },
          {
            range: "6.0",
            text: '默认值向 7 对齐并警告；废弃项可用 ignoreDeprecations: "6.0" 缓冲',
            color: PALETTE.orange,
          },
          {
            range: "7.0",
            text: "strict 默认 true、module 默认 esnext、5.x 起废弃的选项硬移除",
            color: PALETTE.red,
          },
        ]}
      />
      <List
        ordered
        items={[
          <>
            package.json 升级到 <code>typescript@^7</code>，lockfile 锁死平台二进制；
          </>,
          <>
            tsconfig 补显式配置（<code>strict</code>、<code>module</code>
            ），清掉废弃清单里的旧选项；
          </>,
          <>
            跑 <code>tsc -b --dry</code> 实测配置合法性——别信二手 changelog 的「某某被移除」传闻；
          </>,
          <>编辑器升级到新版，让 TS7 的原生语言服务（LSP）接管智能；</>,
          <>
            排查仓库里有没有 <code>import ts from "typescript"</code>{" "}
            当库用的工具——这是唯一的大破坏面。
          </>,
        ]}
      />
      <DoDont
        label="过渡期版本收敛 / one compiler per repo"
        dont={{
          code: `// 混用期各升各的：仓库里同时存在两份 TS
"typescript": "^7.0.2",
"some-ts-tool": "^3"  // 间接依赖里还拖着 typescript@6
// lockfile 出现两个版本 → 不同工具各用一份`,
          note: "6/7 混用期最常见的漂移源：检查结论随「用的是哪份 TS」而变，且症状离版本层很远，很难第一时间想到根因",
        }}
        do={{
          code: `// 用 overrides 把所有间接依赖收敛到同一版本
"pnpm": {
  "overrides": { "typescript": "^7.0.2" }
}
// pnpm why typescript 验证全仓只剩一份`,
          note: "裁判必须唯一：所有把 typescript 当依赖的工具读同一份内核，结论才有对齐的前提（版本漂移的完整机理见版本漂移篇）",
        }}
      />
      <Callout kind="info" title="谁受创，谁无感">
        受创的是把 TS 当库嵌入的工具：vue-tsc/Volar、Next.js 的 TS 检测、ts-morph 一类——TS 7.0
        暂无稳定编程 API（新 API 排在 7.1）。而 Vite + Oxc + oxlint 这类技术栈零 API
        依赖，升级无痛——你当前仓库正是这个形态。
      </Callout>
      <DoDont
        label="别把 typescript 包当库 / JS API 断供"
        dont={{
          code: `import ts from "typescript";

const program = ts.createProgram(/* ... */);
// 7.0 下没有稳定 JS API 可用`,
          note: "把 typescript 包当库嵌入的自研脚本与工具在 7.0 直接断供——这不是编译行为变化，是 API 面被整体移除",
        }}
        do={{
          code: `// 依赖 TS API 的工具留在 6.x 并存通道，等 7.1 新 API
"check:legacy": "tsc6 --noEmit"
// 构建链（Vite + Oxc）零 API 依赖，放心升 7`,
          note: "按「是否 import typescript 包」给工具分清单：断供面只覆盖前者，后者升级无感",
        }}
      />

      <Heading level={2} title="原生浪潮的边界" />
      <Paragraph>
        「tsc
        都原生化了，是不是所有工具都该重写？」——方向对，但边界要清楚。三个「不该」：插件生态是护城河，webpack
        的价值一半在插件，Rspack 必须背上兼容包袱；嵌入式 API 是硬伤，TS 7 断供 JS API
        瘫痪一票嵌入式工具就是活教训；跑在浏览器里的工具没法原生。终态是分层公式：
        <strong>热路径（解析/检查/转译/压缩）下沉原生，编排层与 UX 留在 JS/TS</strong>——JS
        不会退出工具链，它从引擎退成了外壳和胶水。
      </Paragraph>
      <DoDont
        label="npm 包的心智升级 / what npm ships"
        dont={{
          code: "npm 包 = node 程序",
          note: "旧心智：装包就是装一段 node 代码——对 TS 7、esbuild、oxlint 都已经不成立",
        }}
        do={{
          code: "npm 包 = 分发容器",
          note: "包负责下载解压链接，执行的是平台原生进程；node 最多当一次性的启动器（execve 后连它都没了）",
        }}
      />

      <QAChain
        intro="五问从分发机制挖到迁移实务：每一问都基于本仓库的实测证据。"
        items={[
          {
            depth: 3,
            q: "npm 包里怎么会有 Go 二进制？node 是怎么「调度」它的？",
            intent:
              "拆掉「npm 包 = node 程序」的旧心智——答「node 调用 Go 模块」的人把 FFI 和分发搞混了。",
            a: "不存在调度。npm 包只是分发容器：meta 包用 optionalDependencies 装对应平台的二进制，启动链是 shell shim → 一行 node 脚本 → lib/tsc.js 里 process.execve 用原生二进制替换整个进程。所有编译工作在 Go 进程里，node 只是几十毫秒的引导。",
            bonus:
              "esbuild、oxlint、rollup 全是同一套路：平台二进制 + 薄启动器。识别标志是 lockfile 里成排的 *-darwin-arm64 / *-linux-x64 平台包。",
          },
          {
            depth: 3,
            q: "strict 默认变 true，对老项目意味着什么？",
            intent: "考察「默认值也是 API」的意识——静默的行为改变比报错更危险。",
            a: "没显式写 strict 的老项目升级后检查突然变严，一批之前放行的代码开始报错。所以迁移 7 的第一步是补显式配置：要么显式 strict: true 接受新语义，要么显式 false 锁住旧行为——关键是让配置意图明确，而不是依赖默认。",
          },
          {
            depth: 4,
            q: "「语言兼容 ≠ API 兼容」具体指什么？谁受创谁无感？",
            intent: "这是 TS 7 最重要的区分——很多人把「我的代码能编译」等同于「生态没破坏」。",
            a: "语言兼容指你的 TS 代码语义在 7 下不变（检查行为与 6 对齐），这条是稳的；API 兼容指把 typescript 包当库 import 的那批工具，7.0 断供稳定 JS API，vue-tsc/Volar、Next.js 检测、ts-morph 受创。你的技术栈若不 import typescript 包（Vite + Oxc + oxlint 正是），完全无感。",
            bonus:
              "过渡期生态的标准解法：框架侧提供 tsc6 并存命令，让框架工具链继续跑 JS 版编译器，等 7.1 的新 API 落地再切。",
          },
          {
            depth: 4,
            q: "既然 tsc 都重写了，为什么不是所有 JS 工具都该原生重写？",
            intent: "检验对原生浪潮边界的理解——极端化「性能叙事」是架构判断力不足的表现。",
            a: "三个硬边界：插件生态是护城河（webpack 的价值一半在插件，重写必须背兼容包袱）；嵌入式 API 是硬伤（TS 7 断供 API 瘫痪嵌入式工具，就是活教训）；跑在浏览器里的工具没法原生。终态是热路径下沉原生、编排层留在 JS。",
          },
          {
            depth: 5,
            q: "「TS 7 移除了 baseUrl」这个说法怎么鉴别真伪？",
            intent: "方法论题：工程师对待二手 changelog 的求证纪律——这题筛掉人云亦云的人。",
            a: "实测，且以自己仓库的实际配置为准。「已移除」「仅废弃」「改默认」三档语义经常被二手资料混为一谈——而同一条配置在不同仓库里（显式声明、继承默认、压根没写）得到的实测结论可以完全不同，任何示范仓库的现状都替代不了你自己的验证：临时分支上跑一遍 tsc -b --dry，报不报错一目了然。",
            bonus:
              "通用流程：官方 release notes 查原文确认档位 → 自己仓库 --dry 或临时分支实测 → 再决定是否改配置。求证成本五分钟，远低于误改配置的排查成本。",
          },
        ]}
      />

      <MemoryCard keyword="npm 包是分发容器">
        下载解压链接二进制，执行的是原生进程——node 只是 execve 前的打火机。
      </MemoryCard>
      <MemoryCard keyword="热路径下沉原生" color={PALETTE.purple}>
        解析/检查/转译/压缩交给原生二进制，编排与 UX 留在 JS——JS 从引擎退成外壳和胶水。
      </MemoryCard>

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "编辑器和构建的类型检查为什么会不一致？",
            to: "/note/frontend/engineering/typescript/ts-version-drift",
            description:
              "原生化的现实副作用：语言服务与构建用的 TS 版本如何漂移，又如何声明式统一。",
          },
          {
            title: "编辑器的 TS 智能是怎么来的？",
            to: "/note/frontend/engineering/typescript/tsserver-internals",
            description: "TS7 把 tsserver 协议换成了 LSP——旧协议时代的原理是理解这次更换的前提。",
          },
        ]}
      />
    </NoteShell>
  );
}
