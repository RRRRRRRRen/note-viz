import { CodeTabs } from "@/components/demo/CodeTabs";
import { FlowChart } from "@/components/demo/FlowChart";
import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { Callout, CrossRef, DoDont, MemoryCard, Prerequisite, Table } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        当一份 tsconfig 装不下两套语义（浏览器代码 vs Node 配置）、或一个 monorepo
        里多个包互相依赖时，<code>references</code> 负责声明「谁依赖谁」，<code>tsc -b</code>{" "}
        负责按依赖图的
        <strong>拓扑序增量构建</strong>。机制核心是<strong>契约墙</strong>
        ：检查依赖方时不重查被依赖方的源码，只读它的 .d.ts
        声明面——这是性能的秘密，也是声明文件之所以必须存在的原因之一。没有 references 时，
        <code>tsc -b</code>
        退化为带增量的 tsc——本仓库的现状，也是日后拆分预留的门。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "tsconfig 的一份配置到底谁在读？",
            to: "/note/frontend/engineering/typescript/tsconfig-readers",
          },
        ]}
      >
        「一份配置装不下两个世界」是拆分的动机——本篇给出标准的拆法与编排机制。增量缓存（tsbuildinfo）的思想与
        HMR 同源。
      </Prerequisite>

      <Heading level={2} title="tsc -b 在编排什么" />
      <Paragraph>
        裸 <code>tsc</code> 一次只认一份 tsconfig，构建一个 program。<code>-b</code>（build
        模式）换了世界观：它把 tsconfig 之间的 <code>references</code> 声明读成一张{" "}
        <strong>DAG</strong>，按拓扑序构建——被依赖的项目先行，循环引用直接报错。每个子项目有自己的
        tsbuildinfo 增量缓存，没变的子项目整个跳过，依赖方只在「依赖的声明面变了」时才重查。monorepo
        里 core → ui → app 的链路上，改 core 只会触发 core 重查、ui 与 app 各自增量——这是 references
        存在的第一理由。
      </Paragraph>
      <FlowChart
        label="拆分蓝图 / app & node（蓝图，非本仓库现状——本仓库是单 tsconfig）"
        data={{
          direction: "TB",
          nodes: [
            {
              id: "root",
              label: "tsconfig.json（空壳：files: [] + references）",
              color: "#9ca3af",
            },
            {
              id: "app",
              label: "tsconfig.app.json：src/**，lib: DOM，types: vite/client",
              color: "#1677ff",
            },
            {
              id: "node",
              label: "tsconfig.node.json：vite.config + plugins，lib: ES，types: node",
              color: "#f59e0b",
            },
            { id: "cache", label: "各自独立的 tsbuildinfo 增量缓存", color: "#3fb950" },
          ],
          edges: [
            { source: "root", target: "app", label: "reference" },
            { source: "root", target: "node", label: "reference" },
            { source: "app", target: "cache", dashed: true },
            { source: "node", target: "cache", dashed: true },
          ],
        }}
      />
      <Paragraph>
        浏览器代码需要 DOM 类型、不该看见 process；vite.config 和构建插件跑在 Node 进程里、需要
        node:url 与 process、不该看见 window——两套 lib/types 语义共享一份声明只会互相污染。拆开后{" "}
        <code>tsc -b</code> 按图分别检查，tsserver
        也会自动把每个文件路由到它所属的子项目，编辑器侧无需额外配置。
      </Paragraph>

      <Heading level={2} title="契约墙：跨项目只读 .d.ts" />
      <Paragraph>
        检查 ui 项目时，它引用的 core 怎么算？references 的答案是：
        <strong>不重查 core 的源码，只读 core 的声明输出（.d.ts）</strong>。core 对 ui
        暴露的不是实现，是一份类型合同——这就是契约墙。墙的好处是双向的：core
        内部怎么重构，只要声明面不变，ui 就不必重查；ui 也不该越过 import core
        的内部文件——边界即模块化。
      </Paragraph>
      <Paragraph>
        墙需要原料：被引用的项目必须产出 .d.ts。这就是传统上 <code>composite: true</code>
        强制要求「声明产出 +
        增量」的原因——它在为契约墙备料。现代的纯检查型项目（noEmit，不产文件）已放宽此要求，Vite
        官方模板的 tsconfig.app.json 就没有
        composite——检查型引用不需要真的发货，只需要各自为政地查。
      </Paragraph>
      <Callout kind="info" title="单仓库拆分的完整三文件形态">
        根 tsconfig 只做壳（<code>files: []</code> 加 references），真实配置分居 app/node
        两个子文件—— build script 一个字不用改，<code>tsc -b</code> 自动按图编排。
      </Callout>
      <CodeTabs
        tabs={[
          {
            name: "tsconfig.json",
            lang: "typescript",
            code: `{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}`,
          },
          {
            name: "tsconfig.app.json",
            lang: "typescript",
            code: `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "types": ["vite/client"],
    "verbatimModuleSyntax": true,
    "noEmit": true
  },
  "include": ["src"]
}`,
          },
          {
            name: "tsconfig.node.json",
            lang: "typescript",
            code: `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["node"],
    "noEmit": true
  },
  "include": ["vite.config.ts", "plugins"]
}`,
          },
        ]}
      />

      <Heading level={2} title="命令三件套与缓存纪律" />
      <Table
        label="build 模式命令 / commands"
        head={["命令", "做什么"]}
        rows={[
          ["tsc -b", "按引用图拓扑序增量构建——写各项目自己的 tsbuildinfo"],
          ["tsc -b --clean", "清掉产出与缓存——缓存发臭（配置改了缓存没失效）时的重置手段"],
          ["tsc -b --watch", "按图监听：改哪个项目查哪个，依赖方按声明面变化决定是否重查"],
        ]}
      />
      <Paragraph>
        本仓库没有 references，所以 <code>tsc -b</code> 的实际效果是「带增量的
        tsc」：全项目查一遍、写 tsconfig.tsbuildinfo、报错即中断——与裸 <code>tsc --noEmit</code>{" "}
        的差别主要就是增量缓存。顺手的纪律提醒：tsbuildinfo 是本地缓存（内容含机器相关路径），应该
        gitignore；本仓库它目前被 track，值得处理。
      </Paragraph>
      <Paragraph>
        缓存纪律的机制根源在 tsbuildinfo
        的内容：它记录「上次检查时的文件集合、内容指纹与配置状态」，
        构建时先对账再决定查谁。两个推论：一是配置指纹参与对账——改任何 compilerOptions
        让整个缓存作废是设计行为而非
        bug，代价是下次全量；二是「改了代码却没重查」的反向症状多发生在契约墙场景——下游认的是上游的
        <strong>声明面</strong>
        ，上游内部改动不触碰声明面就不触发下游重查，这是增量性的来源；只有当缓存状态与磁盘真实状态脱节时，
        才需要 <code>--clean</code> 强制对账。
      </Paragraph>

      <Heading level={2} title="四个高频坑" />
      <DoDont
        label="include 边界互斥 / disjoint includes"
        dont={{
          code: `// shared/ 被两个子项目同时圈进
// tsconfig.app.json:  "include": ["src", "shared"]
// tsconfig.node.json: "include": ["shared", "plugins"]
// → 报 file is not in project 类错误`,
          note: "拆分的第一纪律：每个文件恰好属于一个子项目——边界重叠时 tsc 与 tsserver 的项目归属判定都会失灵",
        }}
        do={{
          code: `// 边界互斥；共享代码下沉成第三个项目
"include": ["src"],      // app
"include": ["plugins"],  // node
// shared 需要被两边用时：单独成项目被双方 reference`,
          note: "拿不准归属的目录不要两边都写——单独成项目是 references 世界的标准解法",
        }}
      />
      <DoDont
        label="引用环拆环 / acyclic references"
        dont={{
          code: `// app 引 ui，ui 又引 app
// app.json:     "references": [{ "path": "./ui.json" }]
// ui.json:      "references": [{ "path": "./app.json" }]
// error TS6202: Project references may not
// form a circular graph`,
          note: "DAG 直接拒绝成环——循环依赖是设计问题，references 只是把它从运行期提前到了配置期",
        }}
        do={{
          code: `// 把双方共享的部分下沉，环变 DAG
app ──→ shared ←── ui`,
          note: "最小修复是提取共享层：循环的两侧各自依赖它，互不引手——这也是 monorepo 包分层的基本功",
        }}
      />
      <DoDont
        label="缓存发臭先对账 / clean before blame"
        dont={{
          code: `# 下游「莫名没重查」→ 反复改代码重跑
tsc -b   # 命中陈旧 tsbuildinfo，依旧跳过`,
          note: "契约墙只认声明面变化；缓存状态与磁盘脱节时，改再多源码也不会触发重查",
        }}
        do={{
          code: `tsc -b --clean && tsc -b`,
          note: "先清缓存再构建——排除缓存失灵之后，才轮到怀疑项目配置与依赖关系",
        }}
      />
      <Paragraph>
        第四个坑在编辑器侧：<strong>项目结构大改后 tsserver 的内存路由可能滞后</strong>
        （文件换了所属子项目，红线还是按旧 project 给的）——Restart TS Server
        重建路由即可，机理与「编辑器的 TS 智能是怎么来的？」一篇讲的常驻 program 一致。
      </Paragraph>

      <QAChain
        intro="五问按「是什么 → 墙 → 编排 → 治理」推进，后两问偏架构判断。"
        items={[
          {
            depth: 3,
            q: "tsc -b 和裸 tsc --noEmit 差在哪？",
            intent: "确认 build 模式的最小语义——很多人以为 -b 只是 --noEmit 的别名。",
            a: "无 references 时几乎等价：tsc -b 就是带增量的 tsc（多产出 tsbuildinfo，下次跳过没变的文件）。有 references 时才是完整形态：按 DAG 拓扑序编排多个子项目、执行契约墙规则。所以单 tsconfig 仓库用 -b 无害且白赚增量，还为将来拆分预留了门。",
          },
          {
            depth: 3,
            q: "契约墙到底省了什么？",
            intent: "机制价值题——答「少查文件」只对一半，关键是把重查范围从实现面缩到声明面。",
            a: "省的是跨项目的全量重查：ui 依赖 core，若没有墙，core 改一行 ui 就得整个重查；有了墙，ui 只依赖 core 的 .d.ts——core 内部重构只要声明面不变，ui 完全不动。检查成本从「跟着实现走」变成「跟着合同走」，monorepo 的增量性由此而来。",
          },
          {
            depth: 4,
            q: "composite: true 强制的是什么？为什么契约墙需要它？",
            intent: "机制题：把「墙需要原料」这个比喻落回具体选项。",
            a: "它强制两件事：声明产出（declaration）和增量信息（incremental）。前者是墙的原料——被引用项目必须交出 .d.ts，依赖方才有合同可读；后者是编排的燃料——没有每项目的增量状态就谈不上跳过。纯检查型项目（noEmit）不发货，所以现代模板允许不开 composite。",
          },
          {
            depth: 4,
            q: "编辑器怎么决定一个文件属于哪个项目？",
            intent: "把 tsc 的编排语义延伸到 tsserver——references 不只是构建期概念。",
            a: "tsserver 按 references 把文件路由到唯一所属的子项目，每个子项目一个 program，避免同一文件被多个 program 重复检查。这就是拆分配置后编辑器无需任何额外配置的原因——但项目结构大改后内存路由可能滞后，Restart TS Server 重建即可。",
          },
          {
            depth: 5,
            q: "什么信号出现时，才值得把单 tsconfig 拆成 references？",
            intent: "架构判断题：references 是解药也是复杂度——筛掉「为拆而拆」的人。",
            a: "两个信号：一是「一份 compilerOptions 装不下两个世界」（vite.config 需要 node types 而 src 需要 DOM，互相污染检查语义）；二是多包仓库出现明确的依赖方向与增量痛点（改 core 全仓重查）。只嫌一个 tsconfig 行数多不是理由——拆分引入 references 编排的心智成本，要先有真实的痛。",
            bonus:
              "本仓库的判断：单配置目前能用（vite.config 在 DOM lib 下检查是纯度问题不是正确性问题），拆分收益中等——等插件目录变大、或 Node 侧 API 用深了再拆，三文件骨架随时可套。",
          },
        ]}
      />

      <MemoryCard keyword="契约墙：跨项目只读 .d.ts">
        依赖方读的是合同不是实现——core 内部怎么重构，声明面不变 ui 就不动。composite
        曾是备料要求，纯检查型已放宽。
      </MemoryCard>
      <MemoryCard keyword="tsc -b = 按图的增量编排" color="#8b5cf6">
        references 读成 DAG、拓扑序构建、每项目独立 tsbuildinfo；无 references 时退化为带增量的
        tsc。
      </MemoryCard>

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: ".d.ts 声明文件到底解决什么问题？",
            to: "/note/frontend/typescript/basics/declaration-files",
            description: "契约墙的原料就是它——声明文件的四个存在理由与信任模型。",
          },
          {
            title: "编辑器和构建的类型检查为什么会不一致？",
            to: "/note/frontend/engineering/typescript/ts-version-drift",
            description: "拆分之后 include 边界与推断项目的关系——漂移治理的另一半。",
          },
        ]}
      />
    </NoteShell>
  );
}
