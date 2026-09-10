import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import { Callout, CrossRef, DoDont, MemoryCard, Prerequisite, Table } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        类型查找是<strong>两条互不干涉的管道</strong>。管道 A「按导入解析」：import
        一个包时按优先级瀑布找声明——同名扩展名尝试 → exports 的 types 条件 → types/typings 字段（含
        typesVersions 按 TS 版本重定向的分支）→ index.d.ts → 回退 @types → 全部落空则 noImplicitAny
        报错。管道 B「全局注入」：typeRoots（默认
        node_modules/@types）下所有包的全局声明被自动吸进项目，
        <code>types</code>
        字段是白名单。关键事实：@types 与主包<strong>没有版本自动联动</strong>——react 18 配
        @types/react 16 会真出事，对齐靠纪律。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: ".d.ts 声明文件到底解决什么问题？",
            to: "/note/frontend/typescript/basics/declaration-files",
          },
        ]}
      >
        本篇讲「合同怎么被找到」——先知道声明文件是什么，再看查找它的水流图。
      </Prerequisite>

      <Heading level={2} title="管道 A：按导入的解析瀑布" />
      <Paragraph>
        写下 <code>{'import { Button } from "ui-kit"'}</code>{" "}
        之后，检查器按一个严格的优先级瀑布找它的类型。每一级命中即停，全部落空且 noImplicitAny
        开着（strict 包含它）就报 <code>TS7016</code>：
      </Paragraph>
      <List
        ordered
        items={[
          <>
            <strong>同名文件尝试</strong>：解析落点逐个试 <code>.ts → .tsx → .d.ts</code>
            ——仓库内的相对导入靠这级命中；
          </>,
          <>
            <strong>exports 的 types 条件</strong>：包的 package.json 里 <code>"exports"</code>{" "}
            的类型分支（现代包的标配，bundler/nodenext 档才认）；
          </>,
          <>
            <strong>types / typings 字段</strong>：直接指向声明入口，如本仓库{" "}
            <code>@dagrejs/dagre</code> 的<code>"types": "./dist/types/index.d.ts"</code>
            。这一级带一个<strong>版本分支</strong>：<code>typesVersions</code> 按消费方的 TS
            版本重定向声明入口（老 TS 读不懂新语法 .d.ts 时给旧写法）——命中时优先于常规 types
            解析，它不是瀑布后段的兜底，而是这一级内部的岔路；
          </>,
          <>
            <strong>index.d.ts 兜底</strong>：什么都不写时看包根目录；
          </>,
          <>
            <strong>回退 @types/pkg</strong>：包里完全没有类型时，找 DefinitelyTyped 的社区声明；
          </>,
          <>
            <strong>落空</strong>：noImplicitAny 报错「Could not find a declaration file」——补
            @types、写 declare module，或换自带类型的包。
          </>,
        ]}
      />
      <Callout kind="tip" title="两个本仓库的实证">
        react 本体的 package.json 只有 <code>"main": "index.js"</code>、没有 types
        字段——它的类型完全来自
        <code>@types/react</code> 回退；而 @dagrejs/dagre 自带 types，所以 devDependencies 里的
        <code>@types/dagre</code> 已是冗余（src 里也没有旧 dagre 导入），可以删。
      </Callout>

      <Heading level={2} title="管道 B：全局注入与它的白名单" />
      <Paragraph>
        第二条管道与 import 无关：TS 启动时把 <code>typeRoots</code>（默认 node_modules/@types）下
        <strong>所有包</strong>的全局声明自动吸进项目——这就是为什么装了 @types/node 就到处能用
        <code>process</code>、<code>Buffer</code>。副作用是「被动吸全量」：你只想用 A 包，B
        包的全局污染也一起进来。<code>"types": ["vite/client"]</code>{" "}
        就是白名单开关——本仓库用它把全局注入限定为 vite/client 一家。再次强调两条管道的分工：
        <code>types</code> 管<strong>全局注入</strong>，管不住显式 import 的解析——
        <code>import from "node:url"</code> 在白名单外照样找到类型。
      </Paragraph>
      <Paragraph>
        为什么要有「全局注入」这条管道？因为有一类类型天然不走 import：运行时全局（装了 @types/node
        才有的 <code>process</code>、<code>Buffer</code>）和「模块声明增强」（
        <code>declare module '*.css'</code>、<code>*?raw</code> 这类给非 JS 文件发合同的 ambient
        声明）——它们必须预先进入全局作用域，按导入的解析瀑布够不着。注入是启动时一次性吸入的
        <strong>批处理</strong>，不是按查询解析——这也解释了 types
        白名单的生效时机：改名单影响的是编译启动面， 语言服务要重启、tsc 要重跑才重新吸入。
      </Paragraph>
      <Table
        label="三个配置各管什么 / fields vs pipes"
        head={["配置", "管道", "管什么 / 不管什么"]}
        rows={[
          ["paths", "A（按导入）", "手动别名映射，优先级最高；管住导入解析，不影响全局注入"],
          ["typeRoots", "B（全局注入）", "去哪找 @types 式包；不决定装了哪个包，只决定去哪找"],
          ["types", "B（全局注入）", "全局注入的白名单；管不住显式 import 的解析"],
        ]}
      />

      <Heading level={2} title="@types 生态：没有版本联动的水池" />
      <Paragraph>
        <code>@types/react</code> 和 <code>react</code> 是
        <strong>两个独立的 npm 包、独立的 semver</strong>
        ——TS 不会帮你匹配版本。错位的症状非常具体：react 18 配 @types/react 16，新 API（如
        useId）类型不存在、组件签名对不上、甚至反向误报老 API 还在。对齐手段：升级主包时同步升
        @types（大版本对齐）、用 Renovate/Dependabot 的分组更新把两者绑进同一个 PR。
      </Paragraph>
      <Paragraph>
        「类型声明应该归发行方管」这个判断方向正确——自带类型是现代最佳实践（shiki、@xyflow/react
        都是自带派），选依赖时「是否自带类型」本身就是维护质量的信号。但要给 @types
        三个公道：历史囚徒——npm 十年的 JS
        存量不可能都自带；解耦红利——类型可独立发版，社区几小时修一个类型 bug 不用等主包下个
        release，React 官方是明确选择外包给 DefinitelyTyped 的；Node 特例——运行时不可能携带 TS
        类型，@types/node 是准官方。而且信任模型没变：自带也不代表正确（TS 从不核对声明与实现），
        <strong>自带的优势是与实现同步的概率高，不是正确性高</strong>。
      </Paragraph>
      <DoDont
        label="@types 版本对齐 / keep them in sync"
        dont={{
          code: "pnpm up react@18  # @types/react 留在 16",
          note: "主包与声明包无自动联动——错位的症状是新 API 类型不存在、签名对不上，且极难第一时间想到根因",
        }}
        do={{
          code: "pnpm up react@18 @types/react@18  # 或 Renovate 分组更新",
          note: "大版本对齐 + 分组更新进同一个 PR；顺带定期清理已自带类型的冗余 @types（如本仓库的 @types/dagre）",
        }}
      />

      <DoDont
        dont={{
          code: `// 依赖没带类型，随手通配
declare module "legacy-lib";`,
          note: "整个模块变 any，类型检查在此处静默失明",
        }}
        do={{
          code: `// types/legacy-lib.d.ts：按真实 API 补声明
declare module "legacy-lib" {
  export function init(opts: { port: number }): void;
}`,
          note: "手写声明也走类型系统，错误能被拦下",
        }}
      />

      <QAChain
        intro="五问沿两条管道推进：先确认分工，再钻版本联动与生态判断。"
        items={[
          {
            depth: 2,
            q: "import react 的类型是从哪来的？",
            intent: "热身：用最常见的包验证查找瀑布——react 是「回退 @types」路线的代表。",
            a: "来自 node_modules/@types/react。react 本体的 package.json 没有 types 字段（只有 main: index.js），所以瀑布走到「回退 @types」一级才命中——这也是 react 项目必须装 @types/react 的原因。自带类型的包（如 @xyflow/react）则在 exports/types 一级就命中。",
          },
          {
            depth: 3,
            q: "types 字段为什么管不住 import 的解析？",
            intent: "两条管道互不干涉——这是全局类型配置最容易混淆的点。",
            a: '因为 types 只控制「全局自动注入」这条管道：决定 typeRoots 下哪些包的全局声明被吸进项目。而显式 import 走的是按导入解析的瀑布，两者独立。所以配了 types: ["vite/client"] 的项目，import from "node:url" 照样能拿到 @types/node 的类型。',
          },
          {
            depth: 3,
            q: "react 18 配了 @types/react 16，具体会出什么问题？",
            intent: "把「无版本联动」从抽象事实落到具体症状——这类问题的排查难点在于想不到根因。",
            a: "三联症状：新 API 的类型不存在（useId 报 Property 不存在）、签名对不上（18 改过的 props 类型按 16 的合同检查）、反向误报（16 有而 18 已删的 API 类型还在，编译过但运行时炸）。根因是两个独立 semver 的包被人为错位——TS 不会替你匹配。",
            bonus:
              "反向错位（@types 比 react 新）更隐蔽：类型里存在的 API 运行时没有。症状特征是「类型全绿但运行时 undefined is not a function」——第一时间检查 @types 与主包版本。",
          },
          {
            depth: 4,
            q: "typesVersions 解决什么问题？为什么需要它？",
            intent: "把版本兼容从「主包版本」切到「编译器版本」——两根容易混淆的版本轴。",
            a: "它是 types 字段解析上的版本分支：按消费方的 TS 编译器版本重定向声明入口——老 TS 读不懂新语法写的 .d.ts（直接 syntax error），typesVersions 让同一个包对 4.x 用户发旧写法声明、对 5.x 用户发新写法；分支命中时优先于常规 types 解析。注意这根轴是「TS 编译器版本」，与主包运行时版本的轴无关——两个维度，别混。",
          },
          {
            depth: 4,
            q: "「类型应归发行方管」——这个判断的边界在哪？",
            intent: "架构观点题：方向正确但要能说出 @types 的存在理由，才算完整的判断。",
            a: "方向对：自带类型是趋势，也是选依赖的维护质量信号。但边界有三：历史囚徒（JS 存量海洋不可能都自带）、解耦红利（类型可独立于运行时发版，React 官方明确外包给 DefinitelyTyped）、Node 特例（运行时无法自带 TS 类型）。而且自带不等于正确——信任模型下它只是「同步概率更高」。结论：优先自带，把 @types 当必要的基础设施并用对齐纪律管理它。",
          },
        ]}
      />

      <MemoryCard keyword="两条管道互不干涉">
        types 白名单管全局注入，管不住显式 import 的解析——配置不生效时先问走的是哪条管道。
      </MemoryCard>
      <MemoryCard keyword="@types 与主包无版本联动" color={PALETTE.green}>
        两个独立 semver：主包升级时同步升 @types，Renovate 分组更新绑进同一个 PR。
      </MemoryCard>

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "类型检查、lint、格式化为什么不打架？",
            to: "/note/frontend/engineering/typescript/tool-conflicts",
            description: "知识面收尾：找到类型之后，多个工具围绕它的职责该如何切分与治理。",
          },
          {
            title: "import 的模块是怎么被解析找到的？",
            to: "/note/frontend/engineering/typescript/module-resolution",
            description: "回看瀑布的第一级之前——说明符是怎么一步步定位到包的。",
          },
        ]}
      />
    </NoteShell>
  );
}
