import { CodeBlock, FlowChart } from "@/components/demo";
import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import { Callout, CompareTable, CrossRef, DoDont, Prerequisite } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        决定一个文件是「全局」还是「局部」的，不是扩展名，而是
        <strong>
          文件是脚本还是模块——判定标准只有一条：顶层有没有 <code>import</code> 或<code>export</code>
        </strong>
        。没有任何顶层导入导出的文件是脚本，其顶层声明自动进入全局作用域，程序内所有文件都看得见；写了哪怕一个
        <code>export {"{}"}</code>
        ，文件立刻变模块，所有顶层声明退回文件局部。而「全局生效」的前提是文件被拉进编译程序——include
        匹配、被其他文件导入、被三斜线引用，三条路径任一即可，
        <strong>不需要任何人 import 它</strong>。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: ".d.ts 声明文件到底解决什么问题？",
            to: "/note/frontend/typescript/basics/declaration-files",
          },
        ]}
      >
        声明文件是本篇机制的主要载体——先知道 .d.ts
        是「只描述不实现」的合同，再来看这些合同如何进入作用域。
      </Prerequisite>

      <Heading level={2} title="脚本与模块：一套二分法" />

      <Paragraph>
        TypeScript 加载每个文件时只问一个问题：这个文件的顶层有没有 <code>import</code> 或{" "}
        <code>export</code>？没有——它是<strong>脚本</strong>（script），沿用 ES 模块诞生之前的语义：
        顶层声明的变量、函数、interface、type 都落在全局作用域，跨文件直接可见。有——哪怕只是{" "}
        <code>export {"{}"}</code> 这么一个空导出——它是<strong>模块</strong>（module），
        顶层声明被锁进文件局部作用域，外界只能通过 import 访问。这套判定同样适用于普通 .ts 文件，
        不只是 .d.ts。
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`// a.ts —— 顶层无 import/export → 脚本
interface Config {
  endpoint: string;
}
const VERSION = "1.0"; // 全局可见（也可能与别人撞名！）

// b.ts —— 有顶层 import → 模块
import { something } from "./x";
interface Config {} // 局部的，与 a.ts 的 Config 互不相干

// c.ts —— 一个空导出就足以成为模块
export {};
const VERSION = "2.0"; // 局部，与 a.ts 的 VERSION 不冲突`}
      />

      <Paragraph>
        为什么要有这套二分？因为全局作用域是把双刃剑：它让「给宿主环境补类型」这类事变得毫不费力——
        你在脚本式 .d.ts 里写一个 <code>interface Window</code>，全项目立刻能用；但也意味着
        脚本模式的普通 .ts 会互相污染、撞名。ES 模块时代我们希望普通 .ts 默认是模块，
        所以新版脚手架会配 <code>moduleDetection: "force"</code> 强制所有 .ts 按模块处理。 但{" "}
        <strong>.d.ts 不受 force 影响，永远按有无 import/export 实际判定</strong>——这是声明文件
        全局能力的根基，也是它最容易踩坑的地方。
      </Paragraph>

      <CompareTable
        label="脚本 vs 模块 / script vs module"
        left={{ title: "脚本（无顶层 import/export）", color: PALETTE.orange }}
        right={{ title: "模块（有顶层 import/export）", color: PALETTE.blue }}
        rows={[
          {
            aspect: "判定条件",
            left: "顶层没有任何 import / export",
            right: "顶层有任意 import 或 export（export {} 即可）",
          },
          {
            aspect: "顶层声明去向",
            left: "自动注入全局作用域",
            right: "锁定在文件局部作用域",
          },
          {
            aspect: "被谁看见",
            left: "编译程序内所有文件，免 import",
            right: "只有显式 import 它的文件",
          },
          {
            aspect: "同名声明",
            left: "interface/namespace 合并，type/值冲突报错",
            right: "各文件局部，互不相干",
          },
          {
            aspect: "moduleDetection: force",
            left: ".d.ts 仍按实际判定，.ts 被 force 成模块",
            right: "不受影响",
          },
        ]}
      />

      <Callout kind="warning" title="最经典的静默失效">
        脚本式的 <code>vite-env.d.ts</code>（靠全局合并扩展 <code>ImportMetaEnv</code>）
        哪天类型提示突然全没了——第一件事检查文件顶部是不是混进了一个 <code>import</code>。 一行
        import 让整个文件变成模块，全局合并静默失效，不报任何错。
      </Callout>

      <Heading level={2} title="「生效」的前提：先进入编译程序" />

      <Paragraph>
        「脚本自动全局」有一个前提常被忽略：<strong>文件必须先被拉进编译程序</strong>。
        编译程序（program）是 tsc 一次类型检查所加载的全部文件集合，文件进入集合有三条路径，
        满足任一即可：
      </Paragraph>

      <List
        items={[
          <>
            <strong>tsconfig include 匹配</strong>——如 <code>"include": ["src"]</code> 把 src 下所有
            TS 文件（含 .d.ts）收进程序。这是声明文件最常用的入口；
          </>,
          <>
            <strong>被其他文件 import</strong>——模块声明文件的常规入口，import 它的同时它进了程序；
          </>,
          <>
            <strong>三斜线指令引用</strong>——<code>/// {'<reference types="vite/client" />'}</code>{" "}
            或 <code>/// {'<reference path="./x.d.ts" />'}</code> 显式指名。
          </>,
        ]}
      />

      <Paragraph>
        三条路径的共同点是：<strong>没有任何一条要求「有人 import 它」</strong>。include
        匹配就足够了。 所以脚本式声明文件的工作方式是「收录即生效」：include 把它拉进程序 →
        判定为脚本 → 顶层声明进全局 → 全项目可见。这也解释了同一个文件放不同位置的差异—— 放{" "}
        <code>src/</code> 下（默认 include 覆盖）开箱即用；放根目录而 include 只写了 src，
        文件根本没进程序，声明自然不存在。这不是「位置」的魔法，是「收录」的因果。
      </Paragraph>

      <FlowChart
        label="声明进入全局的三条路 / how declarations go global"
        height={380}
        data={{
          nodes: [
            { id: "include", label: "tsconfig include 匹配", color: PALETTE.blue },
            { id: "import", label: "被其他文件 import", color: PALETTE.green },
            { id: "reference", label: "三斜线 reference 指令", color: PALETTE.purple },
            { id: "program", label: "进入编译程序", color: PALETTE.gray },
            { id: "global", label: "判定为脚本 → 声明注入全局作用域", color: PALETTE.orange },
            { id: "all", label: "程序内所有文件可见（免 import）", color: PALETTE.green },
          ],
          edges: [
            { source: "include", target: "program", label: "目录匹配" },
            { source: "import", target: "program", label: "模块依赖" },
            { source: "reference", target: "program", label: "显式指名" },
            { source: "program", target: "global", label: "顶层无 import/export" },
            { source: "global", target: "all", label: "全局作用域" },
          ],
        }}
      />

      <Callout kind="tip" title="排查口诀">
        「声明不生效」按链条查三环：<strong>进没进程序</strong>（include/被导入/reference）→
        <strong>是不是脚本</strong>（顶部有没有混进 import/export）→
        <strong>有没有撞名冲突</strong>（同名成员类型不一致会报错，见声明合并一篇）。
        三环任何一环断掉，症状都是同一种静默失效。
      </Callout>

      <Heading level={2} title="同名 .ts 与 .d.ts 并存：附属声明被忽略" />

      <Paragraph>
        同目录同名是特殊地带。当 <code>utils.ts</code> 和 <code>utils.d.ts</code> 并存时，
        TypeScript 把 <code>utils.d.ts</code> 视为「<code>utils.ts</code> 这个模块的附属声明文件」
        ——就像它平时给 <code>utils.js</code> 当声明一样。但 <code>utils.ts</code> 自己就有完整类型，
        于是真实源码成为权威，<strong>.d.ts 的内容不再被采纳</strong>：怎么改它都不生效，
        看起来像被忽略了。
      </Paragraph>

      <Paragraph>
        这条规则只在<strong>同名同目录</strong>时触发——它本是给「编译产物 js + d.ts 成对分发」
        设计的（tsconfig 的 declaration 选项产出就是这种成对形态），手写场景撞上就是事故： 给手写的{" "}
        <code>utils.ts</code> 配个同名 <code>utils.d.ts</code> 想补类型，
        结果声明白写。解法是换名（如 <code>utils-types.d.ts</code>），别与同目录的 .ts 同名。 注意{" "}
        <code>a.ts</code> 和 <code>b.d.ts</code> 不同名则互不相干。
      </Paragraph>

      <DoDont
        label="同名地雷 / same-name pairing"
        dont={{
          code: `src/
├── utils.ts      // 手写实现
└── utils.d.ts    // 想给它补类型 → 被 .ts 的真实类型取代，永远不生效`,
          note: "同名同目录时 .d.ts 只被视为 .ts 的附属声明，内容被忽略",
        }}
        do={{
          code: `src/
├── utils.ts
└── utils-types.d.ts  // 独立命名的脚本式声明，正常进全局`,
          note: "想给手写 .ts 补全局类型，用独立文件名，避免触发配对规则",
        }}
      />

      <Heading level={2} title="追问链：全局作用域的边界" />

      <QAChain
        intro="四问从判定规则挖到工程实践：作用域二分法的每个坑都能从「加载即生效」推出来。"
        items={[
          {
            depth: 2,
            q: "脚本文件的全局声明，需要被谁 import 才生效吗？",
            intent:
              "热身：确认「收录即生效」和「import 才生效」是不是一回事——大多数人的直觉混淆就在这里。",
            a: "不需要。进入编译程序有三条独立路径：include 匹配、被 import、三斜线引用，任一即可。脚本文件一旦进程序，顶层声明自动注入全局作用域，对程序内所有文件可见。import 只是「进程序」的路径之一，不是全局生效的必要条件——vite-env.d.ts 从未被任何文件 import，全靠 include 生效。",
          },
          {
            depth: 3,
            q: "为什么我的 vite-env.d.ts 加了一行 import 之后，ImportMetaEnv 的类型提示就全没了？",
            intent:
              "本篇最高频事故。考察能否把「静默失效」反向定位到作用域判定这一层，而不是去怀疑 include。",
            a: "顶层的 import 让整个文件从脚本变成模块，文件里所有顶层 interface 失去全局地位——ImportMetaEnv 从「与内置同名接口合并」变成「文件内一个无关的局部接口」，全局合并静默失效。解法：删掉 import；确实需要外部类型时，用 import type 配合 declare global 块来维持全局注入。",
            bonus:
              "import type 只引入类型不产生运行时语句，但同样满足「顶层有 import」的判定条件——作用域判定看的是语法存在，不是运行时副作用。",
          },
          {
            depth: 3,
            q: "moduleDetection: force 已经强制所有文件按模块处理了，脚本式的 .d.ts 还会全局生效吗？",
            intent: "考察是否真正理解 force 的作用边界——很多人以为它统一了所有文件的作用域行为。",
            a: "会。moduleDetection 只作用于普通 .ts/.tsx 文件的判定，.d.ts 永远按「有无顶层 import/export」实际判定，不受 force 影响。这是语言设计的有意为之：声明文件的全局能力（描述宿主环境、扩展内置类型）依赖脚本模式，不能被工程配置一刀切断。",
          },
          {
            depth: 4,
            q: "tsconfig 里 include 写了 src，但根目录还有一个 global.d.ts，为什么有些全局类型生效有些不生效？",
            intent:
              "把「收录即生效」落到 project references 的真实工程结构——考察对编译程序边界的把握。",
            a: "关键看这个 tsconfig 是不是 project references 的壳：壳配置通常 files: []、自己不编译任何文件，include 只在子配置里。global.d.ts 在根目录、不在任何子配置的 include 内，就没进任何编译程序。而在「单 tsconfig + include: [src]」结构里，放 src 内生效、放根目录外不生效——判定永远是「这个文件被哪个程序收录了」，而不是文件在哪个文件夹。",
            bonus:
              "多 tsconfig 结构里各程序的全局作用域互相独立——在 tsconfig.node.json 的程序里全局生效的声明，对 tsconfig.app.json 的程序不可见，除非两边都收录。",
          },
          {
            depth: 4,
            q: "同名 utils.ts 和 utils.d.ts 并存，d.ts 被忽略的机制是什么？什么场景会故意利用这条规则？",
            intent: "最后一问挖到规则的设计动机——「忽略」不是 bug，是产物配对机制的副作用。",
            a: "同名相邻配对规则把 utils.d.ts 视为 utils.ts 的附属声明（如同它对 utils.js 的角色），而 .ts 自己有完整类型信息、是权威来源，附属声明的内容不再被采纳。故意利用它的场景是 declaration 编译产物：tsc emit 出 js + d.ts 成对文件，js 的类型由 d.ts 供给，配对规则正是为这套产物布局设计的。手写场景撞上纯属事故，换名规避。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "TypeScript 的声明合并是怎么工作的？",
            to: "/note/frontend/typescript/basics/declaration-merging",
            description:
              "全局声明撞名之后发生什么——interface 合并、type 冲突、declare module 的双语义。",
          },
          {
            title: "TS 是怎么找到 npm 包的类型声明的？",
            to: "/note/frontend/engineering/typescript/type-lookup",
            description: "换一个视角：类型声明的查找管道——types 白名单与 @types 生态。",
          },
        ]}
      />
    </NoteShell>
  );
}
