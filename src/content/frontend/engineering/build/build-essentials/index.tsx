import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo/FlowChart";
import { CompareTable, DoDont, MemoryCard, Timeline } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        构建的本质 = <strong>从入口递归解析出依赖图 → 逐模块转换 → 组装输出</strong>
        。webpack 里 loader 管「单个文件怎么转」（纯函数管道），plugin
        管「介入构建生命周期的任何时机」（Tapable 钩子）。tree-shaking 的前提是{" "}
        <strong>ESM 的静态结构</strong>
        ——CJS 的 require 是运行时行为，摇不动。提速三板斧：
        <strong>缩小处理范围、持久化缓存、并行化</strong>
        。Vite dev 快是因为把「打包」从启动路径上拿掉了：原生 ESM 按需编译 + esbuild 预构建依赖。
      </Conclusion>

      <Heading level={2} title="构建解决什么问题，webpack 流程长什么样" />
      <Paragraph>
        浏览器原生只认 HTML/CSS/JS，且没有模块系统（旧版）、没有 TypeScript/JSX 能力、更没有「
        hundreds 个文件几百个请求」的加载效率。构建工具把这三件事一次性解决：
        <strong>模块化</strong>（从 entry 出发，静态分析 import 递归建立依赖图）、
        <strong>转译</strong>（TS/JSX/Sass 编译成浏览器能跑的形态）、<strong>打包优化</strong>
        （合并 chunk、压缩、按指纹命名、代码分割）。
      </Paragraph>
      <Paragraph>
        webpack 的构建流程分五步：<strong>初始化</strong>（读配置合并 shell 参数，实例化 Compiler）→{" "}
        <strong>从 entry 出发</strong>调用 loader 转换每个模块并解析依赖 →
        <strong>递归建依赖图</strong>（每个文件是一个 module）→
        <strong>封装 chunk</strong>（按 entry 与分割规则分组）→ <strong>输出</strong>
        （渲染 bundle 代码到 dist）。整条流水线由 Tapable 事件流驱动，plugin
        的全部能力就来自「在任意钩子上注册回调」。
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

      <Heading level={2} title="Loader 与 Plugin：一条清晰的分界线" />
      <Paragraph>
        面试年年考，分界线其实只有一句：
        <strong>loader 管文件内容的转换，plugin 管构建过程的介入</strong>。loader
        是「输入源码字符串、输出目标字符串」的纯函数，按管道串联（从右到左/从下到上），只处理单个文件、不关心全局；plugin
        是带 <code>apply(compiler)</code> 的对象，通过 Tapable 在编译启动、模块转换完成、chunk
        生成、输出落盘等任意钩子上插入逻辑——HtmlWebpackPlugin 生成 HTML、MiniCssExtractPlugin 抽
        CSS、DefinePlugin 注入常量，全是「管流程」而非「转文件」。
      </Paragraph>
      <Paragraph>
        自己写的最小思路：loader 就是导出一个函数，return 处理后的字符串（异步用
        this.async）；plugin 则在 apply 里订阅钩子，如 <code>compiler.hooks.emit.tap</code>
        在写盘前拿到 assets 做加工。能说出「何时该写成 loader、何时只能写成
        plugin」，比背常用清单更有说服力。
      </Paragraph>

      <CompareTable
        label="分界 / loader vs plugin"
        left={{
          title: "Loader = 文件转换器",
          color: "#f59e0b",
          points: [
            "输入源码、输出代码的纯函数",
            "管道式串联，执行顺序从右到左",
            "只面对单个文件内容，无全局视角",
            "例：babel-loader、sass-loader、ts-loader",
          ],
        }}
        right={{
          title: "Plugin = 生命周期钩子",
          color: "#8b5cf6",
          points: [
            "apply(compiler) + Tapable 钩子订阅",
            "介入任意构建阶段，可改产物、注资源、发日志",
            "拥有构建全局视角（compiler/compilation）",
            "例：HtmlWebpackPlugin、MiniCssExtractPlugin、DefinePlugin",
          ],
        }}
      />

      <Heading level={2} title="tree-shaking：为什么 CJS 摇不动" />
      <Paragraph>
        tree-shaking = 删掉「导出了但没被用」的代码。它的前提是
        <strong>依赖关系在编译期可静态确定</strong>
        ——ESM 的 import/export 是语法层面的声明，引擎不执行代码就知道谁导入了谁；而 CJS 的{" "}
        <code>require()</code>{" "}
        是运行时函数调用，模块可以按条件加载、可以拼接导出对象，打包器无法在不执行的情况下断言
        「这个导出没人用」，所以摇不动。
      </Paragraph>
      <Paragraph>
        实操三个开关：<code>mode: production</code> 自带 usedExports 标记；
        <code>sideEffects: false</code>（package.json）告诉
        webpack「本包没有副作用，没被引用的模块直接整棵跳过」——CSS 导入、polyfill
        这类「导入即生效」的文件要在数组里显式豁免；barrel file（
        <code>index.js</code> 全量
        re-export）会拖慢构建并可能连带引入副作用模块，按需直连深路径更稳。发布 npm 包时配好{" "}
        <code>sideEffects</code> 与 <code>module</code>/<code>exports</code>{" "}
        字段，是库作者对用户构建的最后贡献。
      </Paragraph>

      <DoDont
        label="副作用声明 / sideEffects"
        dont={{
          code: `// package.json
{ "sideEffects": false }
// 但项目里还有：
import "./reset.css";
import "./polyfill";
/* CSS/polyfill 被 "无副作用" 摇掉了 */`,
          note: "一刀切 false 会把「导入即生效」的文件摇没，且不报错——上线才发现样式丢失",
        }}
        do={{
          code: `{
  "sideEffects": [
    "**/*.css",
    "./src/polyfill.js"
  ]
}
/* 其余模块按无副作用摇树
   豁免名单保留必须执行的导入 */`,
          note: "声明豁免清单：副作用语义要精确，tree-shaking 才敢放心删",
        }}
      />

      <Heading level={2} title="HMR 与构建提速" />
      <Paragraph>
        HMR 和 live reload 的本质区别：
        <strong>live reload 是整页刷新（状态全丢），HMR 是模块级的增量替换（状态保留）</strong>
        。流程：watch 到文件变化 → 重新编译受影响的模块 → 生成带新 hash 的 manifest 与 update 文件 →
        客户端（HMR runtime 经 WebSocket 收到通知）拉取补丁 → 沿模块图向上找{" "}
        <code>module.hot.accept</code>
        声明的<strong>接受边界</strong>
        ——边界内的模块热替换，边界外不惊动。react-refresh、vue-loader 就是在组件模块上声明 accept
        并注入「重渲染组件」的逻辑，所以改组件代码页面状态不丢。
      </Paragraph>
      <Paragraph>
        构建提速三板斧：<strong>① 缩小范围</strong>——loader 配 include/exclude（node_modules 不必过
        babel）、resolve.modules/extensions 精简、alias 减少查找；<strong>② 缓存</strong>
        ——webpack 5 的 <code>cache: {"{ type: 'filesystem' }"}</code> 持久化缓存二次构建（曾几何时的
        dll 方案已淘汰）；<strong>③ 并行</strong>——thread-loader 或用 esbuild-loader 重写重负载
        loader。Vite 的答案更釜底抽薪：dev 阶段完全不打包，浏览器原生 ESM 按需请求，Vite
        只做两件事——esbuild 预构建依赖（把 CJS 合并成单个 ESM
        文件）和按请求即时编译源码；生产仍打包（Rollup）。
      </Paragraph>

      <Timeline
        label="HMR 更新流程 / hmr flow"
        steps={[
          { label: "文件变化", sub: "watch 触发增量编译", color: "#f59e0b" },
          { label: "生成补丁", sub: "新 hash + update 文件", color: "#8b5cf6" },
          { label: "WebSocket 通知", sub: "客户端 HMR runtime", color: "#1677ff" },
          { label: "找 accept 边界", sub: "边界内热替换", color: "#3fb950" },
          { label: "模块失效重执行", sub: "状态保留，无整页刷新", color: "#3fb950" },
        ]}
      />
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
            q: "loader 的执行顺序为什么是从右到左（从下到上）？",
            intent:
              "热身题，考你对「管道 = 函数组合」的理解——答 compose 的人理解了设计，答「规定如此」的人只是背了。",
            depth: 2,
            a: "loader 数组本质是函数组合：use: ['style-loader', 'css-loader'] 等价于 styleLoader(cssLoader(source))——后写的包在外层。选择从右到左是刻意贴合 compose 的数学习惯（与 Unix 管道从左到右相反），让「先转换内容的」写在右边。理解了这一点，异步 loader 用 this.async 返回 callback 串联的写法也就自然了。",
            bonus:
              "pitch 阶段才是真正「从左到右」执行的钩子：style-loader 正是利用 pitch 先执行、把剩余 loader 的结果包装成注入样式模块。",
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
            q: "tree-shaking 为什么对 CommonJS 无效？「静态」到底指什么？",
            intent:
              "考模块系统的本质差异——「require 是运行时函数调用」这句能展开的人，模块理解才算过关。",
            depth: 3,
            a: "CJS 的依赖关系在运行时才确定：require 可以放进 if、可以拼路径、module.exports 可以被任意改写——打包器不执行代码就无法断言「某导出没人用」，自然不敢删。ESM 的 import/export 是语法声明：import 语句只能出现在顶层、绑定的名字在编译期可见，「哪些导出被谁用」是一张静态可达图，标记 usedExports 后可达图之外的导出即可安全删除。「静态」指的就是「不执行代码即可分析出依赖」。",
            bonus:
              "边界案例：export 的名字被动态拼接（export { [name]: fn } 类似写法）或做了计算后导出，静态分析同样失效——这也是为什么库作者要避免动态导出。",
          },
          {
            q: "HMR 为什么能保留组件状态？live reload 做不到的是什么？",
            intent:
              "考增量更新的机制层——「accept 边界」与「谁负责重新执行」答得出来才算理解 HMR 而不是背流程。",
            depth: 4,
            a: "live reload 是整页刷新：内存里所有 JS 状态清零。HMR 只把「变化的模块」沿模块图向上交给最近的 module.hot.accept 声明边界：边界回调拿到新模块并自己决定怎么应用（如 react-refresh 用新定义重渲染组件实例）——DOM 之外的组件状态、模块级缓存都在浏览器内存里原样保留，所以改代码不打断正在填的表单。若一路上没有任何边界接受，HMR runtime 退化成整页刷新。",
            bonus:
              "react-refresh 的精细处：组件的 Hook 调用顺序必须稳定，否则状态对不上——所以改 Hook 数量/顺序时会强制整组件重挂载，这是它「保守降级」的安全设计。",
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

      <Heading level={2} title="写在最后" />
      <Paragraph>
        构建工具的考点正在从「webpack 细节」转向「体系对比」：bundleless、Rust 工具链、Turbo/bundler
        分层缓存。但底层问题恒定不变——依赖图怎么建、转换怎么管、产物怎么切，换哪家工具都绕不开。性能侧的延伸阅读：站内「从输入
        URL 到页面渲染」把构建产物的传输与渲染成本接了下去。
      </Paragraph>
    </NoteShell>
  );
}
