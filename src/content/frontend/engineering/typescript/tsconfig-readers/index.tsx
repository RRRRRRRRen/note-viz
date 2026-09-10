import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  Callout,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  Table,
  VersionNote,
} from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        tsconfig 是一份被三类读者<strong>按需裁剪阅读</strong>的文件：tsc 和 tsserver
        全读；esbuild/Oxc/swc/babel
        只读少数投影字段（target、jsx、useDefineForClassFields、paths、experimentalDecorators
        等）；ts-loader 全读——因为它就是 tsc。由此得到排查配置问题的第一定律：
        <strong>配置没生效时，先问「这个字段谁在读」</strong>——strict
        系纯检查字段转译器根本不认识，改了只影响 tsc/tsserver 两个读者。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "为什么 Vite 转译 TS 却不做类型检查？",
            to: "/note/frontend/engineering/typescript/vite-transpile-ts",
          },
        ]}
      >
        「转译器读不懂 strict」的前提是「转译不需要懂类型」——本篇把这句话落到具体的字段清单上。
      </Prerequisite>

      <Heading level={2} title="三类读者，三种读法" />
      <Table
        label="读者矩阵 / who reads what"
        head={["读者", "读多少", "代表行为"]}
        rows={[
          ["tsc（跑批审计）", "全读", "strict 系检查、noEmit、paths、增量缓存都按它来"],
          ["tsserver（编辑器）", "全读", "红线与补全的结论理论上与 tsc 趋同——前提是版本一致"],
          [
            "esbuild / Oxc / swc / babel",
            "只读投影",
            "认 target、jsx、paths、verbatimModuleSyntax；strict 系根本不认识",
          ],
          ["ts-loader", "全读", "内部就是 tsc 的 API 封装"],
        ]}
      />
      <Paragraph>
        读者矩阵立刻解释了一类经典困惑：「我明明开了 <code>noUnusedLocals</code>
        ，为什么构建产物里还是有未使用的变量？」——因为那个字段只影响 tsc/tsserver
        的检查结论，转译器读不到、也不需要读：转译的职责是把类型抠掉，变量用没用跟它无关。
      </Paragraph>
      <Paragraph>
        这份读者差异不是实现偷懒，是职责边界的必然。tsc/tsserver 要回答「这段代码
        <strong>对不对</strong>」，而检查语义由全程序关系决定，所以必须全读；转译器只回答「这段文本
        <strong>变成什么 JS</strong>
        」，转换所需的信息恰好全部落在单文件内——投影字段都是「不读项目里其他文件也能执行」的变换参数。
        <strong>读者读多少，由它要回答的问题决定</strong>——这句判据比矩阵本身更值得带走。
      </Paragraph>

      <Heading level={2} title="转译器认得哪几个字段" />
      <Paragraph>
        投影清单短到可以背下来：<code>target</code>（语法降级目标）、<code>jsx</code> 与{" "}
        <code>jsxImportSource</code>（JSX 的转换形态）、<code>useDefineForClassFields</code>
        （类字段语义，影响运行时行为）、
        <code>experimentalDecorators</code>（旧版装饰器）、<code>paths</code>
        （路径别名，转译器做模块解析时需要）、<code>verbatimModuleSyntax</code>
        （决定未使用的导入是保留还是擦除）。除此之外的字段——<code>strict</code> 全家、
        <code>noUnusedLocals</code>、<code>exactOptionalPropertyTypes</code>、
        <code>skipLibCheck</code>
        ——都是纯检查字段，转译器视而不见。
      </Paragraph>
      <Paragraph>
        入选投影清单的判据只有一条：<strong>这个字段的取值会改变产出的字节吗？</strong>
        target 决定语法降级到哪一档、jsx 决定 JSX 展开成哪个函数调用、useDefineForClassFields
        决定类字段编译成定义还是赋值——答案都会写进产物；而 strict 全家、noUnusedLocals
        无论取值如何，产出的 JS
        一个字节都不变，它们只存在于「报不报错」的判断层。记住判据比背清单更耐用：新字段出现时用它归类一遍，归属自动清晰。
      </Paragraph>
      <Callout kind="warning" title="「认 paths」有形态前提">
        转译器「认 paths」只在 <strong>bundling 模式</strong>下成立——esbuild 的打包流程会解析
        paths，但 Vite dev 的单文件 transform <strong>不做 paths 解析</strong>
        （每个请求独立转换，没有模块级的别名改写环节）。这正是 vite-tsconfig-paths 插件与{" "}
        <code>resolve.alias</code> 存在的原因：别名要在打包器的模块解析层单独接上。
      </Callout>

      <Heading level={2} title="verbatimModuleSyntax：为单文件视角而生" />
      <Paragraph>
        这是「为转译器服务」的字段里最值得深拆的一个。单文件视角下，转译器遇到{" "}
        <code>import &#123; Foo &#125; from './x'</code> 无法判断 Foo
        是值还是纯类型：类型要擦除、值要保留，而它看不见 x 模块长什么样。它的唯一安全策略是
        <strong>保守保留</strong>——但若 Foo 是纯类型，运行时 x 模块没有这个导出，可能直接报错。
        <code>verbatimModuleSyntax</code> 强制你把纯类型导入显式写成 <code>import type</code>
        ，在编辑期就把歧义消掉；它的前辈 <code>isolatedModules</code> 动机相同，约束更宽。Vite
        官方模板预配这个字段，就是在替转译器向你「要承诺」。
      </Paragraph>
      <DoDont
        label="类型导入的显式纪律 / explicit types"
        dont={{
          code: 'import { UserInfo } from "./types"',
          note: "纯类型导入不写标记——转译器单文件视角无法判定，保守保留可能运行时炸出「no exported member」",
        }}
        do={{
          code: 'import type { UserInfo } from "./types"',
          note: "显式 type 标记：tsc 强制你写对，转译器放心擦除——歧义在编辑期归零",
        }}
      />

      <Heading level={2} title="baseUrl 的退役始末" />
      <Paragraph>
        baseUrl 是 TS 早期的「假根」机制：设置后所有裸导入都多出一条「相对 baseUrl 解析」的通道——
        <code>import 'foo/utils'</code> 可能命中 src/foo/utils 而不是 node_modules 里的包。它是 TS
        专属发明，Node
        和所有打包器都没有这个概念，直接违反「类型解析必须对齐运行时」的原则，还是大量解析诡异 bug
        的源头。
      </Paragraph>
      <VersionNote
        label="baseUrl 的三段命运 / the fake root"
        note={
          '本仓库已删除 baseUrl——4.1 起 paths 直接相对 tsconfig 目录解析，"./src/*" 写法不再依赖假根。'
        }
        versions={[
          {
            range: "TS ≤ 4.0",
            text: "paths 依赖 baseUrl 才能工作——要用别名就必须设假根",
            color: PALETTE.gray,
          },
          {
            range: "4.1+",
            text: "paths 独立化：路径项直接相对 tsconfig 所在目录解析，baseUrl 失去刚需",
            color: PALETTE.blue,
          },
          {
            range: "6.0+",
            text: "进入废弃潮；「7.0 已移除」的传闻以自己仓库的实测为准（tsc -b --dry），不背二手结论",
            color: PALETTE.orange,
          },
        ]}
      />
      <Callout kind="tip" title="删掉 baseUrl 的收益">
        裸导入从此只有一种含义——node_modules 里的包；别名只存在于 paths
        一处显式声明。解析通道变少，「这个 import 到底命中了什么」的心智负担直线下降。
      </Callout>

      <Heading level={2} title="types 与 skipLibCheck：两条独立旋钮" />
      <Paragraph>
        <code>"types": ["vite/client"]</code> 是<strong>全局自动注入的白名单</strong>：没有它，TS
        会把 node_modules/@types
        下所有包的全局声明自动吸进项目；写了它，全局注入只认名单上的。注意它管的是「全局注入」——
        <strong>管不住 import 的解析</strong>，显式 <code>import from "node:url"</code>
        照样能找到 @types/node 的类型（两条管道的完整拆解见类型查找篇）。
        <code>skipLibCheck: true</code> 则跳过所有 .d.ts
        的检查——库的类型声明数量巨大且可能互相冲突，检查它们性价比为负，工程标配。
      </Paragraph>
      <Paragraph>
        两个旋钮的默认值都是「便利与严谨」的权衡，理解设计意图才不会拧错方向：全局注入默认全量吸入，是
        @types 时代的零配置便利——装了即生效；代价是全局命名空间被动扩大，所以才需要白名单收口。
        skipLibCheck 默认关，是「声明也该被检查」的严谨姿态；但 .d.ts
        属于第三方、数量巨大且你无法修复其中的冲突，全量检查等于替所有依赖付类型税——跳过它们
        <strong>不影响你自己代码的检查严格性</strong>
        ，这是「工程标配」成立的机制前提。
      </Paragraph>

      <Heading level={2} title="排查第一定律的实操流程" />
      <List
        ordered
        items={[
          <>
            <strong>问读者</strong>：这个字段属于检查语义还是转译投影？（strict
            系=检查；target/jsx/paths=投影）
          </>,
          <>
            <strong>对读者验证</strong>：检查字段跑 <code>tsc -b --dry</code>{" "}
            或看编辑器；投影字段直接看构建产物；
          </>,
          <>
            <strong>警惕双读者字段</strong>：paths 同时被 tsc
            与部分转译器读，改一处忘另一处会出现「构建能跑编辑器红线」的分裂（详见模块解析篇）。
          </>,
        ]}
      />

      <QAChain
        intro="五问围绕第一定律展开：从读者矩阵到具体字段的归宿，再到跨版本的行为差异。"
        items={[
          {
            depth: 2,
            q: "改了 strict 没生效，第一个该问什么？",
            intent: "把第一定律变成条件反射——排查配置问题的第一步不是重装依赖。",
            a: "问「这个字段谁在读」。strict 是纯检查字段，只有 tsc/tsserver 认——确认你跑的检查（tsc -b 或编辑器）用的是改过配置的那份 tsconfig、那个版本的 TS；转译器和构建产物对它完全无感。",
          },
          {
            depth: 3,
            q: "为什么转译器读不到 strict，还能正确处理代码？",
            intent: "考察「检查语义」与「转译语义」的分离——严格性影响判断结论，不影响代码变换。",
            a: "因为转译不需要做任何判断：类型标注一律擦除，语法转换只看 target/jsx。strict 决定的是「这段代码报不报错」，而转译器从不回答这个问题——检查语义对它是不存在的输入。",
          },
          {
            depth: 3,
            q: "verbatimModuleSyntax 和 isolatedModules 什么关系？",
            intent: "同族配置的演进史——背配置名的人说不出动机，说得出动机的人不需要背。",
            a: "同一动机的两代实现：单文件转译器无法跨文件判断「这个导入是不是纯类型」，isolatedModules 让 tsc 对依赖跨文件信息的用法报错，verbatimModuleSyntax 更进一步——强制所有纯类型导入显式写 import type，把歧义在源头消除。新项目直接用后者。",
          },
          {
            depth: 4,
            q: "types 字段为什么是「白名单」？它管住了什么、管不住什么？",
            intent:
              "全局注入与导入解析是两条管道——混淆它们的人会得出「types 限制了导入」的错误结论。",
            a: '它只管全局自动注入：不写则 @types 下所有包的全局声明被自动吸进项目，写了则只认名单上的。它管不住显式 import 的解析——import from "node:url" 照样能找到 @types/node。两条管道互不干涉是理解这类配置的关键。',
            bonus:
              '本仓库的 types: ["vite/client"] 就是典型用法：只要 vite/client 的全局类型（import.meta、*?raw 模块声明），不要 node 全局污染浏览器代码的命名空间。',
          },
          {
            depth: 4,
            q: "「baseUrl 在 TS 7 被移除了」这类传闻怎么处理？",
            intent: "信息素养题：配置层的传闻鉴别有标准流程，这题筛掉道听途说的人。",
            a: "三级火箭的思维加实测：先查官方 release notes 确认它在哪一级（废弃/改默认/移除），再在自己仓库（或临时分支）跑 tsc -b --dry 验证——结论以你仓库的实际配置为准，任何示范仓库的现状都替代不了这一步。就 baseUrl 本身：自 4.1 起就是冗余项（paths 已独立解析），删掉是清理而非止损。",
          },
        ]}
      />

      <MemoryCard keyword="这个字段谁在读？">
        排查配置失效的第一定律：检查字段归 tsc/tsserver，投影字段才归转译器。
      </MemoryCard>
      <MemoryCard keyword="转译器只读投影" color={PALETTE.purple}>
        target / jsx / paths / useDefineForClassFields /
        verbatimModuleSyntax——背下这份短清单，其余都是检查字段。
      </MemoryCard>

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "import 的模块是怎么被解析找到的？",
            to: "/note/frontend/engineering/typescript/module-resolution",
            description:
              "paths 只是解析的一角——moduleResolution 四档算法与 alias 双事实的完整故事。",
          },
          {
            title: "references 和 tsc -b 解决什么？",
            to: "/note/frontend/engineering/typescript/project-references",
            description: "一份 tsconfig 装不下两个世界时的拆分与编排方案。",
          },
        ]}
      />
    </NoteShell>
  );
}
