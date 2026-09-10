import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo";
import { CrossRef, MemoryCard, Prerequisite } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        构建工具解决的是「<strong>浏览器只认 HTML/CSS/JS，而工程代码不是这三样</strong>
        」的落差：把几百个模块静态分析成<strong>依赖图</strong>、把 TS/JSX/Sass
        转译成浏览器能跑的形态、再把图组装优化成少量高缓存友好的产物。webpack
        的一次构建是五步流水线：初始化 → 从 entry 转换模块 → 递归建图 → 封装 chunk →
        渲染输出。理解了「依赖图是核心数据结构」，loader/plugin/tree-shaking/HMR
        全都是挂在这张图上的不同介入点。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "从输入 URL 到页面渲染，中间发生了什么？",
            to: "/note/frontend/browser/fundamentals/url-to-render",
          },
        ]}
      >
        本篇讲「源码怎么变成产物」；那篇讲「产物怎么变成页面」——构建与渲染是同一条链路的上下游。
      </Prerequisite>

      <Heading level={2} title="三件事：模块化、转译、打包优化" />
      <Paragraph>
        逐个拆开看。第一件<strong>模块化</strong>：ES Module
        虽已是浏览器原生标准，但工程代码的依赖形态远超原生加载的能力——几百个模块在 HTTP
        上逐个请求是瀑布灾难，且依赖关系需要一张<strong>完整的静态图</strong>
        才能做删除、分割、缓存哈希这些优化，浏览器不会替你建这张图。构建工具从 entry 出发解析
        import，把整个项目折成一（或几）个文件。
      </Paragraph>
      <Paragraph>
        第二件<strong>转译</strong>
        ：TS、JSX、Sass 根本不是浏览器认识的语言——TS 要降成 JS、JSX 标签要变成 createElement
        调用——转译不只是语法替换，还包含降级（把新语法编译成旧语法以兼容目标浏览器，按 browserslist
        精确控制）。第三件<strong>打包优化</strong>
        ：压缩混淆、内容指纹命名（文件内容变 → 文件名变 → HTTP
        缓存精准失效）、代码分割（首屏只下首屏要用的
        chunk）。三件事共用同一张依赖图，所以现代构建工具的全部差异，本质上都是「建图方式」与「图的利用方式」的差异。
      </Paragraph>

      <Heading level={2} title="webpack 的一次构建：从 entry 到 dist" />
      <Paragraph>
        webpack 的构建流程分五步：<strong>初始化</strong>
        （读配置、合并命令行参数、实例化 Compiler）→ 从 entry 出发调用 loader 转换每个模块并解析依赖
        → <strong>递归建依赖图</strong>
        （每个文件是一个 module，解析出的新依赖继续走转换，直到图闭合）→
        <strong>封装 chunk</strong>（按 entry 与分割规则把模块分组）→ <strong>渲染输出</strong>
        （生成 bundle 代码、压缩、写 dist）。整条流水线由 Tapable 事件流驱动——这就是 plugin
        能在任意时机介入的原因（机制见「Loader 与 Plugin 的分界线在哪里？」篇）。
      </Paragraph>
      <FlowChart
        label="webpack 构建流程 / build flow"
        height={400}
        data={{
          direction: "TB",
          nodes: [
            { id: "init", label: "初始化：合并配置 → 实例化 Compiler", color: "#1677ff" },
            { id: "entry", label: "从 entry 出发，调用 loader 转换模块", color: "#f59e0b" },
            { id: "dep", label: "解析 import/require → 递归建依赖图", color: "#f59e0b" },
            { id: "chunk", label: "封装 chunk（entry + 代码分割规则）", color: "#8b5cf6" },
            { id: "out", label: "渲染输出：压缩、指纹、写 dist", color: "#3fb950" },
          ],
          edges: [
            { source: "init", target: "entry" },
            { source: "entry", target: "dep" },
            { source: "dep", target: "entry", label: "新依赖继续转换", dashed: true },
            { source: "dep", target: "chunk", label: "依赖图完成" },
            { source: "chunk", target: "out" },
          ],
        }}
      />

      <Heading level={2} title="「翻译」的内部：babel 的三步" />
      <Paragraph>
        转译环节以 babel 为代表，是编译原理的最小实用集：<strong>parse</strong>
        （词法分析切 token 流、语法分析建 AST）→ <strong>transform</strong>（
        <code>@babel/traverse</code> 深度优先遍历 AST，visitor
        模式对命中节点增删改——所有语法降级、JSX 转换都发生在这里）→ <strong>generate</strong>
        （把新 AST 反代回代码字符串并生成 sourcemap）。插件写的就是 visitor 里的节点处理函数。
      </Paragraph>
      <Paragraph>
        这条管线的截取思维很有解释力：eslint 只到 AST 就停（检查而不生成代码）、prettier 用 AST
        做排版、压缩器在 AST
        层做死代码消除——同一套编译管线，截取不同阶段就是不同工具。看懂这一点，工程化工具链的文档就都能按同一个骨架去读。
      </Paragraph>

      <Heading level={2} title="整合应用：让构建保持快" />
      <Paragraph>
        构建慢的根源是「依赖图太大、每个节点都做了贵操作」。提速三板斧对应三个治法：
        <strong>① 缩小范围</strong>——loader 配 include/exclude（node_modules 不必过 babel）、精简
        resolve.modules/extensions、用 alias 减少查找；
        <strong>② 持久化缓存</strong>——webpack 5 的 <code>cache: {"{ type: 'filesystem' }"}</code>{" "}
        把模块图与产物缓存到磁盘，二次构建只重建变更子图（更早的 dll 方案已被它淘汰）；
        <strong>③ 并行/换引擎</strong>——thread-loader 多进程，或 esbuild-loader 直接换掉重负载环节。
      </Paragraph>
      <Paragraph>
        Vite 的答案是釜底抽薪：dev 阶段<strong>不打包</strong>——浏览器原生 ESM 按需请求，Vite 只做
        esbuild 预构建依赖（把 CJS 依赖合并成单 ESM
        文件）和按请求即时编译源码，启动时间与项目规模解耦；生产仍打包（Rollup）。代价与边界在下方追问链里展开。
      </Paragraph>
      <MemoryCard keyword="提速三板斧" color="#1677ff">
        <strong>缩小范围</strong>（include/exclude、精简 resolve）→ <strong>持久化缓存</strong>
        （webpack 5 filesystem cache）→ <strong>并行/换引擎</strong>
        （thread-loader、esbuild）。定位慢在哪一步用 <code>--profile</code>
        /speed-measure，先测量再优化。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "module、chunk、bundle 三个概念到底是什么关系？",
            intent: "热身题，校准词汇——这三个词混用的人，构建流程的叙述一定会串。",
            depth: 2,
            a: "module 是依赖图的节点（每个文件经 loader 转换后的单元）；chunk 是输出阶段的分组——按 entry 和分割规则把一批 module 打包在一起；bundle 是 chunk 渲染成的最终文件。一句话：构建阶段操作 module，输出阶段组织 chunk，落盘的是 bundle。一个 chunk 通常产出一个 bundle，但内联小 chunk 等场景下不必一一对应。",
            bonus:
              "splitChunks 优化的对象是 chunk 的划分策略——说「优化 bundle」是外行话，说「调整 chunk 拆分」才是准确的。",
          },
          {
            q: "babel 把字符串变成可运行代码分几步？AST 在哪一步？",
            intent:
              "考编译原理最小集——词法/语法/转换/生成四个词能说出来是及格，说清 visitor 遍历替换才是进阶。",
            depth: 3,
            a: "三步：parse（词法分析切成 token 流，语法分析建 AST）→ transform（@babel/traverse 深度优先遍历 AST，visitor 模式对命中节点做增删改——所有语法降级、React JSX 转换都发生在这一层）→ generate（把新 AST 反代回代码字符串并生成 sourcemap）。插件写的就是 visitor 里的节点处理函数。",
            bonus:
              "推论：eslint 只到 AST 就停了（检查不生成代码），prettier 用 AST 排版——同一条编译管线，截取不同阶段就是不同工具。",
          },
          {
            q: "动态 import() 在依赖图里是什么？它和普通 import 的建图行为差在哪？",
            intent: "考「图怎么被切割」——答得出「分割点」说明理解代码分割的机制而非只会写 lazy()。",
            depth: 3,
            a: "静态 import 是建图阶段就直接连上的边（模块进主 chunk）；动态 import() 是一个「标记为分割点」的边——webpack 仍会静态分析出目标模块（所以路径不能完全运行时拼接），但把它切进独立 chunk，运行时按需以 JSONP/fetch 方式加载。这就是路由懒加载的全部机制：React.lazy 包的就是这个动态 import 返回的 Promise。",
            bonus:
              "魔法注释 /* webpackPrefetch: true */ / /* webpackPreload: true */ 控制的是这个新 chunk 的加载时机：prefetch 闲时拉（未来可能用），preload 当前导航就要（关键依赖）。",
          },
          {
            q: "两个模块循环引用，webpack 怎么处理？运行时行为是什么？",
            intent:
              "考依赖图的边界情况——能说清「图能建出来但执行顺序有讲究」的，是真的想过模块语义。",
            depth: 4,
            a: "建图不成问题（a 引 b、b 引 a，两条边都记录），问题在执行顺序：webpack 按深度优先从 entry 执行模块，循环处后回来的那个模块会先拿到「尚未执行完」的对方的导出——ESM 下表现为 live binding（绑定存在，值待填），访问时机不当就是 undefined。CJS 下拿到的是不完整的 module.exports 副本。工程解法是打破循环：把共享逻辑抽到第三个模块，或把「需要对方」的操作推迟到函数调用时（运行时图已闭合）。",
            bonus:
              "ESM 的 live binding 让循环比 CJS 友好：导出的是绑定而非值拷贝，只要「使用时机」晚于「赋值时机」就能拿到正确值——TDZ 报错也发生在这一层。",
          },
          {
            q: "Vite dev 为什么快？它付出的代价是什么？",
            intent:
              "压轴题，考「按需编译」与「请求瀑布」的权衡——能同时说出代价与补救手段，说明理解了架构而非站队。",
            depth: 5,
            a: "快在把「打包」从启动路径上拿掉了：webpack 启动要先把整个依赖图打包完才能给你看页面；Vite 启动只起一个 dev server，页面按原生 ESM 的 import 链路现用现编译——入口小，启动时间与项目规模解耦。依赖（node_modules）用 esbuild 预构建成单个 ESM 文件，避免几百个请求的瀑布。代价有三：首次访问某路由仍要现场编译（有短暂等待）；深层 import 链在 HTTP/1.1 下请求瀑布明显（靠预构建和 HTTP/2 缓解）；生产仍要打包（Rollup），dev 与 prod 的行为差异偶尔踩坑。",
            bonus:
              "生态动向：Vite 团队正在用 Rust（rolldown/oxc）替换 Rollup 与 esbuild 环节，目标是 dev/prod 统一引擎——「双引擎行为不一致」这个最后的代价也在被消解。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "Loader 与 Plugin 的分界线在哪里？",
            to: "/note/frontend/engineering/build/loader-vs-plugin",
            description: "依赖图的两种介入方式：转换单个文件，还是钩住构建生命周期。",
          },
          {
            title: "为什么 tree-shaking 摇不动 CJS？",
            to: "/note/frontend/engineering/build/tree-shaking-cjs",
            description: "图的利用方式之一：依赖图必须「静态」才能安全删代码。",
          },
        ]}
      />
    </NoteShell>
  );
}
