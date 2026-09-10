import { StepThrough } from "@/components/demo";
import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  Callout,
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  SpecQuote,
  Table,
} from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        <code>import &#123; x &#125; from "./foo"</code> 里的 "./foo"
        如何变成磁盘上的真实文件，不同运行环境有不同算法——
        <code>moduleResolution</code> 就是在选这套算法，而选择的原则只有一条：
        <strong>必须对齐真正会加载你代码的那个运行时</strong>
        ，否则「类型检查通过」推不出「运行时能跑」。现代打包器项目配
        <code>bundler</code> 档——官方定义它是 CommonJS 无扩展名导入与 ESM import 条件优先的
        <strong>融合算法</strong>，不是某个打包器的私有方言。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "tsconfig 的一份配置到底谁在读？",
            to: "/note/frontend/engineering/typescript/tsconfig-readers",
          },
        ]}
      >
        moduleResolution 是「转译器投影字段」里最复杂的一个——它同时影响 tsc、tsserver
        与部分转译器的解析行为。
      </Prerequisite>

      <SpecQuote source="TypeScript 5.0 Release Notes">
        Most modern bundlers use a fusion of the ECMAScript module and CommonJS lookup rules in
        Node.js… extensionless imports work just fine just like in CommonJS, but when looking
        through the export conditions of a package, they'll prefer an import condition just like in
        an ECMAScript file.
      </SpecQuote>

      <Heading level={2} title="三档解析：你在选哪套文件系统规则" />
      <Table
        label="解析档位 / resolution flavors"
        head={["档位", "建模对象", "相对导入扩展名", "认 exports 字段"]}
        rows={[
          ["node10（旧 node）", "Node CommonJS 算法", "可省略", "不认——子路径导出直接找不到"],
          [
            "node16 / nodenext",
            "Node ESM 算法",
            "ESM 中必须写全（./utils.mjs）",
            "认，严格按条件分支",
          ],
          ["bundler", "打包器的融合算法", "可省略", "认，优先 import 条件"],
        ]}
      />
      <Paragraph>
        官方引入 bundler 档（TS 5.0）的动机写得很直白：node16 精确建模了 Node 的 ESM
        规则，但那些规则（尤其是强制扩展名）「是 Node
        与浏览器为加快文件查找而设的，打包器并没有这些限制」。于是 bundler = 无扩展名导入（CJS
        风格）+ 优先 import 条件（ESM 风格）的混合体，适用于 Vite、esbuild、swc、webpack、parcel
        这些实现「hybrid lookup」的工具。错配的代价立竿见影：配成 nodenext，tsc
        会强迫你所有相对导入写
        <code>.js</code> 扩展名——在打包器世界纯属自找麻烦。
      </Paragraph>
      <Paragraph>
        顺带校准 node16 与 nodenext 的差异，它们合为表格一档的原因：解析规则完全一致（ESM
        都强制扩展名、都严格认 exports），区别只在算法版本——node16 钉死 Node 16 的行为不再变，
        nodenext 跟随最新 Node 的解析语义滚动。对绝大多数项目，真正的选择发生在 nodenext 与 bundler
        之间，判断依据只有一条：你的代码最终由谁加载。
      </Paragraph>
      <DoDont
        label="nodenext 忘写扩展名 / explicit extensions"
        dont={{
          code: `// moduleResolution: nodenext，源码是 ESM
import { x } from "./utils/a";
// error TS2835: Relative import paths need
// explicit file extensions`,
          note: "nodenext 按 Node 真实规则强制相对导入写全扩展名——打包器项目写惯的无扩展名导入在这里直接报错",
        }}
        do={{
          code: `import { x } from "./utils/a.js";
// 源码写 .js，指向编译产物同名文件
// 打包器项目换 bundler 档则免扩展名`,
          note: "「解析对齐运行时」的具体化：跑在 Node ESM 就写 Node 认的说明符；由打包器加载就换 bundler 档",
        }}
      />

      <Heading level={2} title="bundler 档下的一次解析" />
      <Paragraph>
        拿本仓库的真实别名走一遍完整流程，解析器每一步在做什么、能看到什么、看不到什么：
      </Paragraph>
      <StepThrough
        label="解析 src/utils/a / one import, six steps"
        height={170}
        steps={[
          {
            title: '读入 import { x } from "@/utils/a"',
            desc: "裸说明符，先查 paths 映射。",
            color: PALETTE.gray,
          },
          {
            title: "paths 命中 @/* → ./src/*",
            desc: "别名替换，说明符变成 src/utils/a（相对 tsconfig 目录）。",
            color: PALETTE.purple,
          },
          {
            title: "尝试扩展名 .ts → .tsx → .d.ts",
            desc: "bundler 档允许无扩展名导入——逐个试到命中为止。",
            color: PALETTE.blue,
          },
          {
            title: "命中 a.ts，模块图 +1",
            desc: "该文件进入 program；若命中的是 .js 则找同名 .d.ts 拿类型。",
            color: PALETTE.green,
          },
          {
            title: "递归解析它的 import",
            desc: "整个模块图就是这样滚雪球长出来的。",
            color: PALETTE.orange,
          },
          {
            title: "结论",
            desc: "「检查需要全程序知识」的根源：每一步都只有走完才知道下一步是什么。",
            color: PALETTE.red,
          },
        ]}
      />

      <Heading level={2} title="paths 与 alias：一份事实，两处手抄" />
      <Paragraph>
        本仓库同时存在两份别名声明：tsconfig 的 <code>"paths": {'{ "@/*": ["./src/*"] }'}</code> 管
        tsc/tsserver 的类型解析；vite.config 的 <code>resolve.alias</code>{" "}
        管打包器的运行时解析。两边各自的读者不同、算法不同，于是必须人肉保持一致——这是 Vite
        工程最经典的坑之一。
      </Paragraph>
      <CompareTable
        label="双份事实 / two sources of truth"
        left={{ title: "tsconfig paths", color: PALETTE.purple }}
        right={{ title: "vite resolve.alias", color: PALETTE.blue }}
        rows={[
          {
            aspect: "谁在读",
            left: "tsc / tsserver（类型解析）",
            right: "打包器（运行时模块解析）",
          },
          {
            aspect: "影响什么",
            left: "类型检查、补全、跳转、auto-import 生成",
            right: "dev 请求与构建产物能不能找到文件",
          },
          {
            aspect: "改一漏一的症状",
            left: "编辑器红线、auto-import 歪路",
            right: "dev/build 直接 module not found",
          },
          {
            aspect: "收敛方案",
            left: "单一事实源：vite-tsconfig-paths 让打包器直接读 tsconfig",
            right: "同左——alias 从 vite.config 删除",
          },
        ]}
      />
      <DoDont
        label="双份事实改一漏一 / two sources of truth"
        dont={{
          code: `// tsconfig 加了别名，vite.config 忘了同步
"paths": { "@/*": ["./src/*"] }
// vite.config.ts：resolve.alias 里没有 @
import { x } from "@/utils/a"; // dev 请求 module not found`,
          note: "paths 与 alias 不一致时，类型过的路径和运行时过的路径是两套判断——「编辑器全绿、dev 一请求就炸」的症状分裂才是真坑",
        }}
        do={{
          code: `// 单一事实源：打包器直接读 tsconfig
import tsconfigPaths from "vite-tsconfig-paths";

export default { plugins: [tsconfigPaths()] };`,
          note: "alias 从 vite.config 删除后两个读者同源；此后 paths 配错的症状反而响亮（编辑器红线与 tsc 报错同时出现），反而好排查",
        }}
      />

      <Heading level={2} title="发布者的特别提醒" />
      <Paragraph>
        官方对 bundler 档有一条专门警告：它会<strong>掩盖非打包器用户的兼容问题</strong>——你的库在
        Vite 项目里一切正常，到了用 Node 原生 ESM 的消费者那里可能解析失败。所以发布 npm
        库的项目应该配 <code>nodenext</code>，bundler
        档是应用项目的档位。另外两类接缝要心里有数：自定义
        <code>conditions</code> 与 <code>resolve.alias</code> 是打包器私有能力，tsc 不认识；
        <code>?raw</code> / <code>?url</code> 这类 Vite 私有语法后缀，靠 <code>vite/client</code>
        类型包里的 <code>declare module '*?raw'</code>{" "}
        补上类型——「标准化部分靠档位自动一致，私有部分靠声明与插件对齐」。
      </Paragraph>
      <Paragraph>
        这条警告背后的机制是「建模对象的分野」：bundler 档建模的是打包器的宽容，而宽容成立的前提是
        <strong>消费者环境被打包器统一托管</strong>。库发布后，解析发生在消费者的环境里——你无法预设
        每个消费者都用打包器，Node
        脚本、测试运行器都可能直接加载你的包。所以库作者要按最严格的解析器 （Node 原生
        ESM）声明自己：exports 条件写全（import/require/types 分支）、扩展名齐全、用 nodenext
        自测。严格档位下能通过的包，在宽容档位下必然也能通过；反之不成立——这是单向蕴含，
        也是「应用配 bundler、发库配 nodenext」的全部逻辑。
      </Paragraph>
      <Callout kind="info" title="排查解析问题的固定动作">
        VSCode 里右键「Go to Definition」看解析落点；命令面板{" "}
        <code>workbench.action.gotoSymbol</code> 不够用时直接 <code>tsc --traceResolution</code>{" "}
        输出完整解析轨迹——每一跳命中失败都会写明原因。
      </Callout>

      <QAChain
        intro="五问从档位语义挖到发布策略：核心原则只有一个——解析对齐运行时。"
        items={[
          {
            depth: 2,
            q: "moduleResolution 到底决定什么？",
            intent: "热身：确认它管的是「说明符 → 文件」的算法选择，而不是任何类型语义。",
            a: "决定导入说明符如何映射到磁盘文件：相对路径怎么试扩展名、裸导入怎么走 node_modules、包的 package.json 里认哪些字段（main/exports）。它是算法档位选择器，与类型检查的严不严毫无关系。",
          },
          {
            depth: 3,
            q: "bundler 和 nodenext 差在哪？什么时候会踩到？",
            intent: "两档最容易混——差异集中在一个日常写法上：扩展名。",
            a: "一句话：nodenext 的 ESM 强制相对导入写全扩展名（Node 真实规则），bundler 放宽了它（打包器不关心）。认 exports/imports 字段两档一致，customConditions 也都支持。踩法：打包器项目错配 nodenext，tsc 强迫你写 .js 扩展名，纯自找麻烦。",
          },
          {
            depth: 3,
            q: "为什么「解析必须对齐运行时」？不对齐会怎样？",
            intent: "本篇第一性原则——让「类型检查通过」能推出「运行时能跑」的根基。",
            a: "因为 tsc 和 tsserver 解析模块用的是 moduleResolution 算法，而真正加载文件的是运行时或打包器。两套算法不一致时，类型系统认得的导入和运行时认得的导入是两个集合——类型全绿的 import 运行时可能 module not found。对齐了，检查通过才对运行时有效力。",
          },
          {
            depth: 4,
            q: "exports 字段谁是读者？node10 为什么是发布事故高发档？",
            intent: "把解析档位和 npm 包发布策略连起来——库作者的兼容面意识。",
            a: "exports 是包的「子路径路由表」，读者是认它的解析器：node16/nodenext/bundler 都认，node10 完全不认。用 node10 的项目 import 你的子路径（如 pkg/ui）会直接找不到——哪怕你 exports 写得完美。所以发库要测多档位，文档里写清支持范围。",
            bonus:
              "反向坑：老包只写 main 没有 exports，bundler/nodenext 照样能解析（回退 main）——exports 是增量路由，不是唯一入口。",
          },
          {
            depth: 4,
            q: "alias 和 paths 为什么必须两处写？能收敛到一处吗？",
            intent: "把「双份事实」落到治理动作——这是模块解析层面最常见的工程债。",
            a: "因为读者不同：paths 喂 tsc/tsserver 的类型解析，alias 喂打包器的运行时解析，历史上没有一份配置两边都认。可以收敛：vite-tsconfig-paths 插件让打包器直接读 tsconfig 的 paths，alias 从 vite.config 删除——类型解析与运行时解析从此同源，改一漏一的结构性风险消失。",
            bonus:
              "收敛方向的选择有讲究：只能「tsconfig 为源 + 插件」，不能反过来——tsc 不会去读 vite.config。单一事实源必须选所有读者都愿意读的那份。",
          },
        ]}
      />

      <MemoryCard keyword="解析对齐运行时">
        moduleResolution 的选择原则只有一条：跟真正加载你代码的运行时用同一套算法。
      </MemoryCard>
      <MemoryCard keyword="bundler = 融合算法" color={PALETTE.purple}>
        CJS 的无扩展名 + ESM 的 import 条件优先——官方定义的标准交集，不是某家打包器的私有方言。
      </MemoryCard>

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "TS 是怎么找到 npm 包的类型声明的？",
            to: "/note/frontend/engineering/typescript/type-lookup",
            description:
              "解析找到模块之后，类型声明从哪来——types/typeRoots/@types 的两条独立管道。",
          },
          {
            title: "tsconfig 的一份配置到底谁在读？",
            to: "/note/frontend/engineering/typescript/tsconfig-readers",
            description: "回看 paths 作为「双读者字段」的完整背景。",
          },
        ]}
      />
    </NoteShell>
  );
}
