import { StepThrough } from "@/components/demo";
import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  SpecQuote,
  Table,
  VersionNote,
} from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        不是「Vite 偷懒」，是分工使然：<strong>转译不需要懂类型</strong>
        （把类型标注当文本抠掉即可），<strong>检查需要全程序模块图</strong>（最贵的部分，且对产出 JS
        零贡献）。Vite 官方口径毫不含糊：只转译、不检查。检查的责任外包给 build script 里的{" "}
        <code>tsc -b</code>
        ——先审计、后打包。理解了这个分离，「dev 时类型错误页面照样跑」就不再是 bug，而是设计。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "TypeScript 在工程里到底扮演什么角色？",
            to: "/note/frontend/engineering/typescript/ts-roles",
          },
        ]}
      >
        本篇展开三角色模型中的第三角色（剥类型转译器），并把「为什么不用 tsc 当转译器」讲透。
      </Prerequisite>

      <SpecQuote source="Vite 官方文档 · Features">
        Vite only performs transpilation on .ts files and does NOT perform type checking… type
        checking requires knowledge of the entire module graph.
      </SpecQuote>

      <Heading level={2} title="三个理由：为什么不用 tsc 当转译器" />
      <List
        ordered
        items={[
          <>
            <strong>速度</strong>：dev server 的契约是「每个文件请求毫秒级返回」。tsc 是单线程 JS
            全程序分析，冷启动以秒计；esbuild/Oxc 是原生并行单文件转换，快一到两个数量级；
          </>,
          <>
            <strong>职责上不需要</strong>
            ：转译只要求「剥类型」，不要求「懂类型」——懂类型是全程序推断，是整条链最贵的部分，且对产出
            JS 毫无贡献。检查已经外包给 build script 里的 tsc；
          </>,
          <>
            <strong>形态不对</strong>：tsc 是批处理 CLI（读项目→产文件），dev server
            需要「给一个文件、还一个字符串」的转换服务——接口形态都不匹配。
          </>,
        ]}
      />
      <Paragraph>
        顺便校准一个正在发生的换角：Vite 6/7 时代的转译器是 esbuild（Go），Vite 8 起官方文档已换成
        Oxc Transformer（Rust）。但「只转译、不检查」的岗位描述一字未变——
        <strong>岗位和演员要分开看</strong>
        ，这也再次印证三角色模型里的分工是结构性的，不绑定任何具体工具。
      </Paragraph>
      <VersionNote
        label="Vite 转译层换角 / the transformer seat"
        versions={[
          {
            range: "Vite 4-7",
            text: "esbuild 负责逐文件 TS/JSX 转译，并承担依赖预构建与压缩",
            color: "#1677ff",
          },
          {
            range: "Vite 8+",
            text: "官方文档：转译由 Oxc Transformer（Rust）承担——更快，岗位描述不变",
            color: "#8b5cf6",
          },
        ]}
      />

      <Heading level={2} title="dev 请求的一生：检查员全程缺席" />
      <Paragraph>
        把「类型错误页面照样跑」放到一次真实的请求生命周期里看，缺席的是谁一目了然：
      </Paragraph>
      <StepThrough
        label="一次 dev 请求 / request lifecycle"
        height={150}
        steps={[
          {
            title: "浏览器请求 /src/main.tsx",
            desc: "dev server 无打包、按需 serve——每个文件一个请求。",
            color: "#9ca3af",
          },
          {
            title: "命中 TS，交给转译器",
            desc: "单文件视角：此刻它不知道、也不关心项目里还有谁。",
            color: "#1677ff",
          },
          {
            title: "剥类型，产出纯 JS",
            desc: "类型标注当注释抠掉；enum 展开、JSX 转换——原生并行的毫秒级操作。",
            color: "#f59e0b",
          },
          {
            title: "返回浏览器执行",
            desc: "Vite 文档口径：HMR 级别的更新在 50 毫秒内反映到浏览器。",
            color: "#3fb950",
          },
          {
            title: "类型检查员缺席",
            desc: "tsc -b 不在 dev 管线里，tsserver 只服务编辑器——红线与拦截都不来自这条链。",
            color: "#f85149",
          },
        ]}
      />

      <Heading level={2} title="转译器的能力与硬边界" />
      <Paragraph>
        「不做检查」不等于「只会删字」。转译器对 TS
        特性的处理分两档：不需要类型信息的都干——包括代码生成（enum 展开成运行时对象、namespace
        转换、装饰器展开）；需要类型信息的一概不干。官方文档点名的两个硬边界：
        <code>emitDecoratorMetadata</code>（要把参数的静态类型塞进运行时，必须先做类型推断）和产出
        <code>.d.ts</code>（要先算出类型面才能描述）。const enum
        的跨文件内联同理——而且它的两档行为值得单独点名：ambient const enum 在{" "}
        <code>isolatedModules</code> 下直接报
        TS1209（纯类型构造留到运行时必炸，编译期就拦）；普通跨文件 const enum
        则隐蔽得多——被单文件转译器静默降级成普通 enum，不报错，但内联消失、运行时多出枚举对象。
      </Paragraph>
      <VersionNote
        label="三份工的归属变迁 / who does the jobs"
        note="对照本仓库 node_modules/vite 的 package.json（8.2.2）：dependencies 已无 esbuild，只剩 rolldown 等；esbuild 降级为可选 peerDependency。"
        versions={[
          {
            range: "Vite 4-7",
            text: "esbuild 一人分饰三角：transform 逐文件转译、optimizeDeps 依赖预构建、minify 产物压缩",
            color: "#1677ff",
          },
          {
            range: "Vite 8+",
            text: "依赖里已无 esbuild——bundle / minify / transform 全部由 rolldown（内含 oxc）承担，esbuild 仅剩可选 peer 位置",
            color: "#8b5cf6",
          },
        ]}
      />
      <Table
        label="转译层在 Vite 里的分工 / capabilities"
        head={["能力", "在 Vite 里的用途"]}
        rows={[
          [
            "Transform",
            "dev 逐文件 TS/JSX 转译（本篇主角）——esbuild 时代由 esbuild 承担，Vite 8 起由 oxc 承担",
          ],
          [
            "Bundle",
            "依赖预构建 optimizeDeps：把 node_modules 的 CJS 包转 ESM、合并成单文件减少请求数",
          ],
          ["Minify", "构建产物的代码压缩"],
          ["Serve", "esbuild 自带简陋 dev server——Vite 从未使用，自研了完整的 dev 层"],
        ]}
      />

      <Heading level={2} title="Webpack 的殊途同归" />
      <Paragraph>
        webpack 本体不认识 .ts，必须配 loader，历史上三条路：ts-loader（内部真调 tsc
        API，检查加转译一体，全程序检查串行挂在打包关键路径上，慢；开 <code>transpileOnly</code>
        退化成只剥类型）；babel-loader + preset-typescript（剥类型）；swc-loader（Rust
        版，更快）。配套的 <code>fork-ts-checker-webpack-plugin</code> 起独立子进程异步跑
        tsc——报错不阻塞打包。
      </Paragraph>
      <CompareTable
        label="一体式 vs 分离式 / sync vs async"
        left={{ title: "一体式：ts-loader 默认", color: "#f85149" }}
        right={{ title: "分离式：loader + fork-ts-checker", color: "#3fb950" }}
        rows={[
          {
            aspect: "类比",
            left: "把校验写成同步触发器挂在写入路径上",
            right: "写入全速跑，异步审计另行报账",
          },
          { aspect: "检查时机", left: "打包关键路径内串行", right: "独立子进程并行" },
          { aspect: "速度", left: "慢——全程序分析阻塞打包", right: "快——转译与检查互不等待" },
          {
            aspect: "终态",
            left: "（开 transpileOnly 后）退化成分离式",
            right: "与 Vite 的天生分离完全一致",
          },
        ]}
      />
      <Paragraph>
        所有 bundler 生态十年演化的终点是同一条：
        <strong>转译交给快转换器，检查交给慢检查器，两者解耦、异步、并行</strong>。Vite
        只是出生就在终态，Webpack 是演化到了终态。
      </Paragraph>

      <Heading level={2} title="陷阱：转译器视角反噬 tsconfig" />
      <DoDont
        label="dev 链上没有检查员 / no checker on dev chain"
        dont={{
          code: `// dev 页面正常 → 认为类型没问题
const user: User = { name: "a", age: "x" };
// age 类型错了：页面照跑，控制台安静`,
          note: "dev 管线只有剥类型转译器在场——「能跑」不构成类型背书；红线来自编辑器、拦截来自 build script，都不在这条链上",
        }}
        do={{
          code: `# 检查在另外两条链上
tsc -b                 # 构建门禁
# 编辑器 tsserver 实时红线`,
          note: "dev 时想要类型反馈，另开 tsc --noEmit --watch 或用 vite-plugin-checker 投到浏览器",
        }}
      />
      <DoDont
        label="transpileOnly 裸奔 / checkerless pipeline"
        dont={{
          code: `// webpack 只求快：开了 transpileOnly
{ test: /\\.ts$/, use: { loader: "ts-loader",
  options: { transpileOnly: true } } }
// 没配 fork-ts-checker → 全程无人检查类型`,
          note: "转译与检查解耦后，检查必须另有归属——否则项目处于零检查状态，类型错误一路漏进产物",
        }}
        do={{
          code: `// 剥类型与审计拆成两条通路
{ loader: "ts-loader", options: { transpileOnly: true } },
new ForkTsCheckerWebpackPlugin() // 独立子进程异步审计`,
          note: "报错不阻塞打包，但一定会在 CI 前暴露——与 Vite 的天生分离同构",
        }}
      />
      <Paragraph>
        单文件视角还会反噬配置：<code>import &#123; Foo &#125;</code>{" "}
        分不清是值还是类型，转译器只能保守保留——纯类型导入可能运行时报「没有这个导出」。这是{" "}
        <code>verbatimModuleSyntax</code> 强制 <code>import type</code> 的存在动机；它与{" "}
        <code>isolatedModules</code> 的关系、Vite 模板为何预配，完整深拆见「 tsconfig
        的一份配置到底谁在读？」一篇。
      </Paragraph>
      <DoDont
        label="单文件视角的纪律 / explicit type imports"
        dont={{
          code: 'import { UserConfig } from "./config"',
          note: "纯类型导入不带显式标记——转译器分不清值与类型，只能保守保留整个 import，运行时可能炸出「no exported member」",
        }}
        do={{
          code: 'import type { UserConfig } from "./config"',
          note: "显式 type 标记：编辑期就把歧义消掉，转译器放心擦除——本仓库 verbatimModuleSyntax 已开启",
        }}
      />

      <QAChain
        intro="四问从缺席现象挖到生态终态：核心始终是「转译与检查可分离」这一条。"
        items={[
          {
            depth: 2,
            q: "dev 时写出类型错误，为什么页面照样跑？",
            intent: "本篇的现象级问题——答「Vite 宽容」的人还没建立管线视角。",
            a: "因为 dev 管线里只有剥类型转译器在场：它把 .ts 当文本抠掉类型标注返回 JS，看不出任何类型错误。红线来自编辑器的 tsserver，拦截来自 build script 的 tsc -b——dev 链路上两个检查员都不在。",
          },
          {
            depth: 3,
            q: "esbuild 为什么那么快？",
            intent: "区分「语言快」和「设计快」——只答 Go 的人漏了更重要的一半。",
            a: "Go 只是前提。设计上的四个决定更关键：全核并行、零第三方依赖全自研（数据结构自己造）、AST 只过一遍（解析一次打印一次）、单文件视角（不做任何跨文件分析，天然可并行切片）。Oxc 在 Rust 上复刻了同一套设计哲学。",
          },
          {
            depth: 4,
            q: "const enum 为什么被称为单文件转译器的毒药？",
            intent:
              "「需要类型信息的活儿转译器干不了」的最佳试金石——内联看似不需要类型，其实需要全程序。",
            a: "const enum 的使用点要内联成字面量：a.ts 里的 Color.Red 要变成 0，必须知道 b.ts 里的定义——跨文件知识。单文件转译器看不见 b.ts，行为分两档：ambient const enum（declare const enum）在 isolatedModules 下直接报 TS1209——纯类型构造留到运行时必然炸，编译期就拦住；普通跨文件 const enum 则被静默降级成普通 enum——不报错，但内联消失、运行时多出枚举对象。这是「不需要类型信息」和「需要全程序信息」的分界案例。",
            bonus:
              "降级那档最危险：tsc 检查照过、运行时行为也「对」，只有产物体积与内联优化悄悄变化——排查方法是看构建产物里有没有枚举对象。ambient 档报的 TS1209 则把问题挡在编译期。",
          },
          {
            depth: 4,
            q: "Webpack 生态是怎么收敛到和 Vite 相同终态的？",
            intent:
              "演化视角：终态的一致性证明「转译/检查分离」是结构性规律而非某家工具的设计品味。",
            a: "webpack 从一体式 ts-loader（tsc API 检查加转译，串行挂打包路径）演化出两条退路：transpileOnly 退化成只剥类型，再配 fork-ts-checker 独立子进程异步审计。演化终点和 Vite 的天生分离完全一致——快转换器管剥，慢检查器管查，异步并行。",
            bonus:
              "工程启示：当你想把慢检查塞进快管线时，正确动作不是硬塞，而是拆成两条异步通路——这个模式同样适用于 lint、格式化等一切「贵但必要」的环节。",
          },
        ]}
      />

      <MemoryCard keyword="转译不需要懂类型">
        剥类型 = 抠注释。检查才需要全程序模块图——把最贵的部分隔离在 dev 管线之外，是速度的来源。
      </MemoryCard>
      <MemoryCard keyword="先审计后打包" color="#8b5cf6">
        tsc -b 拦截并缓存，转译器信任上游只管快——「未经审计的字节」不应该出现在你的 build script
        里。
      </MemoryCard>

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "tsconfig 的一份配置到底谁在读？",
            to: "/note/frontend/engineering/typescript/tsconfig-readers",
            description:
              "verbatimModuleSyntax 的完整深拆在这篇——一份 tsconfig 被三类读者裁剪阅读的地图。",
          },
          {
            title: "编辑器的 TS 智能是怎么来的？",
            to: "/note/frontend/engineering/typescript/tsserver-internals",
            description: "dev 补检方案之外，编辑器实时红线的完整原理链。",
          },
        ]}
      />
    </NoteShell>
  );
}
