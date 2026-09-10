import { CodeAnnotate, FlowChart } from "@/components/demo";
import {
  Callout,
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  SpecQuote,
} from "@/components/viz";
import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        TypeScript 在工程里不是「一个工具」，是<strong>三个各自独立的程序</strong>：跑批审计的{" "}
        <code>tsc</code>（读全项目、报类型错误、可产出声明文件）、常驻编辑器内存的语言服务{" "}
        <code>tsserver</code>（画红线、给补全、不参与构建）、以及只剥类型不做检查的转译器（
        <code>esbuild</code> / Oxc / swc / babel）。一条铁律贯穿始终：
        <strong>运行时没有 TS，构建产物里也没有 TS</strong>
        。由此得到分工公式——<strong>esbuild 管字节，tsc 管真理</strong>
        ：要「快产出」找剥类型转译器，要「对不对」找类型检查器。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "构建工具到底解决了什么问题？",
            to: "/note/frontend/engineering/build/build-problem",
          },
        ]}
      >
        本篇是 TypeScript
        工程化知识面的地基：先立住「三个角色」的心智模型，后面所有篇目——版本、配置、生态、治理——都是这三个角色的分工细节。
      </Prerequisite>

      <Heading level={2} title="一条铁律：运行时没有 TS" />
      <Paragraph>
        浏览器和 Node 执行的永远是纯 JavaScript。<code>const x: number = 1</code> 经过转译后就是{" "}
        <code>const x = 1</code>——类型标注不是被「优化掉」，而是<strong>根本不进入产物</strong>
        。接口、泛型、类型别名这些纯类型结构在转译时被整体擦除；enum 这类「带运行时身体」的 TS
        特性，转译器也会把它展开成普通对象再交出去。产物里找不到任何类型的痕迹，这是理解一切 TS
        工程问题的起点。
      </Paragraph>
      <Paragraph>
        由此立刻得到两个推论。第一，<strong>类型检查是纯粹的编译期行为</strong>
        ——它发生在你按下保存、跑下构建的时刻，运行时零参与，所以「TS
        影响运行时性能」这类担忧不成立。第二，<strong>检查和转译是两件可以完全分离的事</strong>
        ：把类型标注从文本里抠掉不需要懂类型——正如 minifier
        抠除注释不需要读懂代码逻辑，两者剥掉的都是纯编译期的元数据层。这正是现代工具链把「转译」交给快工具、把「检查」留给慢工具的合法性来源。你在
        dev 页面上写出类型错误、页面照样跑，就是这个分离的直接体现：dev 管线里只有转译器在场。
      </Paragraph>

      <Heading level={2} title="三个程序，三份职责" />
      <Paragraph>
        把 TypeScript 仓库的产物拆开看，它同时是三个程序：命令行编译器 <code>tsc</code>、语言服务{" "}
        <code>tsserver</code>
        ，以及生态里一堆「只剥类型」的第三方转译器。前两者共享同一个类型内核（同一个代码库导出的两个入口），第三个是彻底的外人——它不
        import TypeScript 包，对类型一无所知。
      </Paragraph>
      <CompareTable
        label="同内核 vs 外人 / one kernel, two forms vs outsider"
        left={{ title: "类型内核（tsc / tsserver）", color: "#8b5cf6" }}
        right={{ title: "剥类型转译器（esbuild / Oxc / swc）", color: "#1677ff" }}
        rows={[
          {
            aspect: "输入视角",
            left: "全程序：读整个模块图 + 全部声明文件",
            right: "单文件：把 .ts 当文本逐个处理",
          },
          {
            aspect: "要不要懂类型",
            left: "要——全程序类型推断是最贵的部分",
            right: "不要——把类型标注当注释抠掉即可",
          },
          {
            aspect: "速度特征",
            left: "秒到分钟级（无法按文件并行切片）",
            right: "毫秒级/文件（Go/Rust 全核并行）",
          },
          { aspect: "产出", left: "错误清单、.d.ts、增量缓存", right: "剥净类型的纯 JS" },
          { aspect: "失败后果", left: "能挡住构建（门禁）", right: "永不拦截——它看不出类型错误" },
        ]}
      />
      <Paragraph>
        <strong>tsc 是跑批的审计员</strong>。它读完整的
        tsconfig、解析整个模块图、加载所有依赖声明，然后全量报告类型错误——就像发布流程里的 QA
        审计：全量检查、只报问题、（在 <code>noEmit</code>{" "}
        模式下）不改货。跑批天然适合做门禁：审计不过，后面的打包就不该发生。
      </Paragraph>
      <Paragraph>
        <strong>tsserver 是内存里的实时查询</strong>。编辑器启动一个独立进程养着它，通过 JSON-RPC
        随时提问：「这行有没有错」「这里能补全什么」「这个符号跳到哪」——它在内存里对项目做一次常驻的增量编译，用回答喂养编辑器的红线、补全、跳转。数据库做个锚点：tsserver
        之于 tsc，如同常驻连接的实时查询之于定时跑批——同一个 schema（tsconfig），两种消费形态。
      </Paragraph>
      <Callout kind="warning" title="红线不参与构建">
        编辑器的报错来自 tsserver 的内存编译，构建的门禁来自 build script 里的 <code>tsc</code>
        ——两个判断源互相独立：红线永远不会拦住构建，CI
        报错也不会自动出现在编辑器。它们的结论理论上趋同（读同一份
        tsconfig），漂移只可能来自版本不一致——这个问题的完整拆解见「编辑器和构建的类型检查为什么会不一致？」一篇。
      </Callout>
      <Paragraph>
        <strong>剥类型转译器是管线里的无状态转换函数</strong>。esbuild
        官方文档对它的工作方式说得很直白：
      </Paragraph>
      <SpecQuote source="esbuild 官方文档 · content types">
        TypeScript types are treated as comments and are ignored by esbuild… esbuild does not do any
        type checking, so you will still need to run <code>tsc --noEmit</code> in parallel with
        esbuild to check types.
      </SpecQuote>
      <Paragraph>
        类型被当作注释忽略——这就是它的全部工作哲学。但「不做检查」不等于「只会删字」：enum
        展开、装饰器展开这类代码生成照做，它的硬边界只有一条——
        <strong>需要类型信息的活儿一概不干</strong>，典型是 <code>emitDecoratorMetadata</code>{" "}
        与产出 <code>.d.ts</code>
        ——前者要把参数的静态类型塞进运行时，后者要先算出类型面才能描述。这份能力边界的完整拆解是「
        为什么 Vite 转译 TS 却不做类型检查？」一篇的主问句，此处不展开。
      </Paragraph>
      <FlowChart
        label="一个源文件的三条去向 / three consumers"
        data={{
          direction: "TB",
          nodes: [
            { id: "src", label: "src/**/*.{ts,tsx} 源文件", color: "#9ca3af" },
            { id: "server", label: "tsserver 语言服务（常驻内存）", color: "#8b5cf6" },
            { id: "tsc", label: "tsc -b 类型审计（跑批）", color: "#f59e0b" },
            { id: "trans", label: "剥类型转译器（esbuild → Oxc）", color: "#1677ff" },
            { id: "ide", label: "红线 / 补全 / 跳转，零文件产出", color: "#8b5cf6" },
            { id: "err", label: "错误清单 + tsbuildinfo，挡住构建", color: "#f85149" },
            { id: "js", label: "浏览器执行的纯 JS", color: "#3fb950" },
          ],
          edges: [
            { source: "src", target: "server" },
            { source: "src", target: "tsc" },
            { source: "src", target: "trans" },
            { source: "server", target: "ide" },
            { source: "tsc", target: "err" },
            { source: "trans", target: "js" },
          ],
        }}
      />

      <Heading level={2} title="一份 build 脚本里的分工" />
      <Paragraph>
        抽象模型落回一个所有 Vite 项目都有的实物——package.json 的
        scripts。本仓库的两条命令，恰好是三个角色各自到岗的最小完整形态：
      </Paragraph>
      <CodeAnnotate
        lang="javascript"
        code={`// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build"
  }
}`}
        annotations={[
          {
            line: 4,
            text: "dev：管线里只有剥类型转译器到岗——类型错误照样跑，检查责任在编辑器的 tsserver",
          },
          {
            line: 5,
            text: "tsc -b：先全程序审计——读全 tsconfig、报类型错误、写增量缓存 tsbuildinfo",
          },
          {
            line: 5,
            text: "&& 是门禁：审计不过，打包不发生；vite build 里的转译器信任上游审计，自己只管快",
          },
        ]}
      />
      <Paragraph>
        这就是官方推荐姿势的完整语义。Vite 文档对此毫不含糊——「type checking requires knowledge of
        the entire module graph」，把检查塞进按请求转换的 dev
        管线必然牺牲速度，所以官方建议构建时串上 <code>tsc --noEmit</code>、开发时另开一个{" "}
        <code>tsc --noEmit --watch</code> 进程（或用 vite-plugin-checker
        把错误投到浏览器上）。先审计、后打包，两路人马各司其职。
      </Paragraph>

      <Heading level={2} title="高频误区" />
      <Paragraph>
        三个高频误区，恰好对应三个角色的职责边界：dev
        链上没有检查员、两个检查源互不知情、检查器换版不影响产物。前两条上面的 Callout 与 DoDont
        已有铺垫，这里用代码对照把三条边界逐一钉死：
      </Paragraph>
      <DoDont
        label="dev 能跑 ≠ 类型对 / no checker on dev chain"
        dont={{
          code: `// dev 页面正常渲染，就认为类型没问题
pnpm dev
getUser(42) // 参数类型全错——页面照跑，控制台安静`,
          note: "dev 管线里只有剥类型转译器在场，它看不出任何类型错误——「能跑」不构成任何类型背书",
        }}
        do={{
          code: `# 检查发生在另外两条链上
tsc -b --watch          # 或编辑器 tsserver 的实时红线
tsc -b && vite build    # 构建门禁`,
          note: "红线来自 tsserver 的内存编译，拦截来自 build script 的 tsc——想要类型结论，去找这两个角色",
        }}
      />
      <DoDont
        label="换检查器不动产物 / checker vs emitter"
        dont={{
          code: `// 以为升级 typescript 包会改变构建产物
pnpm up typescript@7
pnpm build   # 产物字节与升级前完全一致`,
          note: "产物由转译器决定，typescript 包只影响检查结论——它甚至读不到 strict 这类纯检查字段",
        }}
        do={{
          code: `// 想动产物，升级的是管线里的转译层
pnpm up vite   # 6/7 时代内嵌 esbuild，8 起内嵌 Oxc
pnpm build   # 转译语义变化才可能反映到字节`,
          note: "「谁产出产物，谁的版本才影响产物」——升级检查器是审计口径变化，不是生产行为变化",
        }}
      />
      <DoDont
        label="产物类型安全从哪来 / the gate"
        dont={{
          code: "vite build",
          note: "以为过了 build 产物就类型安全——转译器不做任何检查，这条命令独自产出的是「未经审计的字节」",
        }}
        do={{
          code: "tsc -b && vite build",
          note: "先审计后打包：tsc 拦截类型错误并留下增量缓存，转译器放心剥类型——本仓库的真实 build script",
        }}
      />

      <QAChain
        intro="从热身到进阶，每一问建立在前一答之上：先立「运行时无 TS」，再拆两个检查员，最后摸清转译器的边界与原生化的影响。"
        items={[
          {
            depth: 2,
            q: "浏览器能直接运行 .ts 文件吗？",
            intent:
              "筛掉把「TS 可以直接跑」误解为「运行时认识类型」的人——任何工具的「直接跑」背后都是先剥类型。",
            a: "不能。运行时没有 TS：.ts 必须先经转译器把类型标注剥成纯 JS 才能执行，构建产物里同样没有类型。类型检查是纯编译期行为，运行时零参与。",
            bonus:
              "Node 22.6+ 的原生类型剥离（--experimental-strip-types）同理——它也是「剥」而不是「懂」，同样不做任何检查。",
          },
          {
            depth: 3,
            q: "tsc 和 tsserver 是什么关系？编辑器报错为什么拦不住构建？",
            intent:
              "考察是否把「编辑器」和「构建」当成两个独立判断源——很多人以为红线就是编译器在跑。",
            a: "同一个类型内核的两种运行形态：tsc 是跑批（全量、产错误清单、可做门禁），tsserver 是常驻实时查询（内存增量编译、不产文件、不参与构建）。红线只是语言服务的诊断输出，构建管线里根本没有它。",
            bonus:
              "tsserver 对不在 tsconfig include 里的散文件会自建「推断项目」去查，结论可能和 tsc -b 不一致——这是编辑器与构建漂移的第二来源（第一是版本）。",
          },
          {
            depth: 3,
            q: "Vite 转译 TS 用的是 tsc 吗？为什么它不检查类型？",
            intent: "考察「转译与检查可分离」这个核心洞察——这是整条 TS 工具链演化的第一性原理。",
            a: "不是 tsc。Vite 用单文件剥类型转译器（6/7 时代是 esbuild，8 起官方文档已换成 Oxc Transformer），转译不需要懂类型；而类型检查需要整个模块图的知识，塞进按请求转换的 dev 管线必然牺牲速度。",
            bonus:
              "官方给的两条补检方案：dev 时另开 tsc --noEmit --watch 进程，或用 vite-plugin-checker 把类型错误直接投到浏览器 overlay 上。",
          },
          {
            depth: 4,
            q: "为什么 esbuild 产不出 .d.ts，也不支持 emitDecoratorMetadata？",
            intent: "摸「哪些活儿必须留给真正的编译器」的边界感——这是判断工具选型的基本功。",
            a: "因为这两件事都需要类型信息。.d.ts 是对类型面的描述——必须先算出类型才能写声明；装饰器元数据要把参数的静态类型塞进运行时——必须先做类型推断。esbuild 把类型当注释忽略，压根没有类型概念，所以官方文档明确不支持这两项。",
            bonus:
              "这就是库作者发布 npm 包时仍然绕不开 tsc 的原因：.js 交给转译器，.d.ts 必须由类型检查器产出（或用 API Extractor 这类基于检查器的工具）。",
          },
          {
            depth: 4,
            q: "TS 7 原生化之后，「三个程序」的格局变了吗？",
            intent:
              "检验你掌握的是抽象模型还是工具名——模型的核心是「一个类型内核 + N 种运行形态」。",
            a: "没变。TS 7 原生化换的是内核的实现语言与服务协议，三角色分工一格没动：tsc 还是审计、语言服务还是投影、剥类型器还是外人——这个模型的正确抽象是「一个类型内核 + N 种运行形态」，原生化只是给内核换了个更快的运行形态。原生化具体改了什么、真正的破坏面在哪，是「TypeScript 7 原生化改变了什么？」一篇的主问句，此处不展开。",
            bonus:
              "同期转译器岗位的演员也从 esbuild 换成了 Oxc，岗位描述（只转译、不检查）一个字没变——两次换角都没动格局，恰是分工结构性的最好佐证。",
          },
        ]}
      />

      <MemoryCard keyword="运行时没有 TS">
        产物里也没有。类型是纯编译期存在，检查与转译可以彻底分离。
      </MemoryCard>
      <MemoryCard keyword="esbuild 管字节，tsc 管真理" color="#8b5cf6">
        要「快产出」找剥类型转译器，要「对不对」找类型检查器——两个问题别问同一个工具。
      </MemoryCard>
      <MemoryCard keyword="红线不参与构建" color="#f85149">
        编辑器报错来自 tsserver 的内存编译，构建门禁只能来自 build script 里的
        tsc——两个判断源互不知情。
      </MemoryCard>

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "前端实际用得到多少 TS 功能？",
            to: "/note/frontend/typescript/basics/ts-feature-surface",
            description: "角色清楚了，那这门语言的「功能地图」有多大？三层详略与消费/生产者之分。",
          },
          {
            title: "编辑器的 TS 智能是怎么来的？",
            to: "/note/frontend/engineering/typescript/tsserver-internals",
            description: "红线、补全、跳转背后的 tsserver：五步原理链与插件机制。",
          },
          {
            title: "为什么 Vite 转译 TS 却不做类型检查？",
            to: "/note/frontend/engineering/typescript/vite-transpile-ts",
            description:
              "第三角色的完整拆解：转译器的能力边界、const enum 陷阱与「先审计后打包」的由来。",
          },
        ]}
      />
    </NoteShell>
  );
}
