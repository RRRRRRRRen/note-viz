import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CompareTable, CrossRef, DoDont, Prerequisite } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        分界线一句话：<strong>loader 管单个文件内容的转换，plugin 管构建过程的介入</strong>
        。loader 是「源码字符串进、目标字符串出」的纯函数，按管道串联（从右到左 =
        函数组合），无状态、可缓存；plugin 是带 <code>apply(compiler)</code> 的对象，通过 Tapable
        钩子挂在编译启动、模块转换完成、chunk
        生成、产物落盘等任意时机，拥有构建全局视角。判断标准：只需要「这一个文件的内容」就是
        loader；需要「别的模块的信息 / 产物的操作 / 构建时机的控制」就只能 plugin。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "构建工具到底解决了什么问题？",
            to: "/note/frontend/engineering/build/build-problem",
          },
        ]}
      >
        依赖图是本篇的坐标系：loader 作用在图的节点（module）上，plugin
        作用在图的构建过程（compiler/compilation）上。
      </Prerequisite>

      <Heading level={2} title="一句话分界：内容 vs 过程" />
      <Paragraph>
        webpack 的两大扩展机制各管一段：loader 出现在「节点转换」环节——每个文件被读进来后、变成
        module 之前，必须经过 loader 管道把 TS/JSX/Sass 翻译成 webpack 能分析的 JavaScript；plugin
        出现在其余一切环节——从编译启动到产物写盘的每个时机都是 Tapable 事件流上的一个钩子，plugin
        订阅钩子拿到控制权。HtmlWebpackPlugin 生成 HTML、MiniCssExtractPlugin 抽离 CSS、DefinePlugin
        注入常量，全是「管流程」而非「转文件」。
      </Paragraph>
      <Paragraph>
        这个分界不是「功能强弱」，而是<strong>数据可见范围</strong>
        的差异：loader 的输入只有当前文件的内容（加上通过 this 上下文拿到的 options
        与查询参数），看不到别的模块、看不到产物；plugin 手里的 compiler/compilation
        引用通向整张依赖图与全部 assets。你写的逻辑如果需要「跨模块的信息」或「产物的操作」，写成
        loader 在架构上就不成立。
      </Paragraph>
      <CompareTable
        label="分界 / loader vs plugin"
        left={{
          title: "Loader = 文件转换器",
          color: PALETTE.orange,
          points: [
            "输入源码、输出代码的纯函数",
            "管道式串联，执行顺序从右到左",
            "只面对单个文件内容，无全局视角",
            "例：babel-loader、sass-loader、ts-loader",
          ],
        }}
        right={{
          title: "Plugin = 生命周期钩子",
          color: PALETTE.purple,
          points: [
            "apply(compiler) + Tapable 钩子订阅",
            "介入任意构建阶段，可改产物、注资源、发日志",
            "拥有构建全局视角（compiler/compilation）",
            "例：HtmlWebpackPlugin、MiniCssExtractPlugin、DefinePlugin",
          ],
        }}
      />

      <Heading level={2} title="Loader 的数据流与纪律" />
      <Paragraph>
        管道的执行顺序是函数组合：<code>use: ['style-loader', 'css-loader']</code> 等价于{" "}
        <code>styleLoader(cssLoader(source))</code>
        ——后写的包在外层，内容先经过 css-loader。两个常被追问的细节都在这里： loader 的
        <strong>无状态纪律</strong>（同一个文件可能被编译多次——HMR、缓存失效、并发 worker
        都会重跑，loader 内绝不能依赖「上次调用」留下的可变状态）；以及{" "}
        <code>this.cacheable()</code>
        ——告诉 webpack「相同输入不必重跑我」，这是 loader 层面最重要的性能契约，有副作用的 loader
        必须声明不可缓存。
      </Paragraph>
      <Paragraph>
        进阶一层的机制是 <strong>pitch</strong>
        ：每个 loader 除了正常阶段还可选实现 pitch 阶段，pitch
        才是真正「从左到右」执行的——style-loader 正是利用 pitch 先执行、拦截掉剩余 loader 的返回，把
        CSS 包装成注入样式的模块。另外两个写法常识：异步转换用 <code>this.async()</code> 拿
        callback（不走同步返回值）；loader 里返回多个值时用{" "}
        <code>this.callback(err, content, sourceMap, meta)</code>
        额外交出 sourcemap——丢了 sourcemap 的转换链，调试体验直接塌方。
      </Paragraph>

      <Heading level={2} title="Plugin 的能力来源：Tapable 钩子体系" />
      <Paragraph>
        Tapable 是 webpack 内置的发布订阅引擎，钩子按「调用方式 × 执行方式」分家族：同步的{" "}
        <code>SyncHook</code>、异步串行的 <code>AsyncSeriesHook</code>
        、异步并行的 <code>AsyncParallelHook</code>
        ，订阅端对应 <code>tap</code> / <code>tapAsync</code> / <code>tapPromise</code>
        三种注册形态。plugin 的骨架因此固定：class 里实现 <code>apply(compiler)</code>，在钩子上 tap
        回调，回调参数里拿 compilation 做事——比如 <code>compiler.hooks.emit.tap</code>{" "}
        在写盘前拿到全部 assets，加文件、改内容、算统计都在这一步。
      </Paragraph>
      <Paragraph>
        compiler 与 compilation 的区分是 plugin 的坐标系：<strong>compiler</strong>{" "}
        对应一次完整的构建生命周期（配置不变它就不变），<strong>compilation</strong>{" "}
        对应一次「资源版本的编译」——watch 模式下文件一变就产生新 compilation，而 compiler
        还是同一个。理解了这点就能解释为什么「只在首次构建做的事」tap 在 compiler
        钩子上、「每轮都要重做的事」tap 在 compilation 钩子上。
      </Paragraph>

      <Heading level={2} title="经典追问链" />
      <DoDont
        dont={{
          code: `// 想给所有模块注入环境变量，写成了 loader
use: [{ test: /\\.js$/, loader: "env-inject-loader" }]`,
          note: "loader 是单文件转换器，管不了「编译之外」的横切流程",
        }}
        do={{
          code: `// 编译之外的事挂插件钩子
new webpack.DefinePlugin({
  "process.env.API": JSON.stringify(api),
})`,
          note: "plugin 挂在构建生命周期上，全局生效一次",
        }}
      />

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
            q: "为什么 loader 必须写成无状态纯函数？this.cacheable() 改变了什么？",
            intent: "考 loader 的性能契约——知道「会被重跑」的人才会真正管住副作用。",
            depth: 3,
            a: "同一文件在构建生命周期里可能被多次编译：HMR 增量更新、缓存失效、多进程 worker 各自跑一遍——loader 若依赖内部可变状态（计数器、上次的中间结果），每次重跑结果都可能不同，构建直接不可复现。this.cacheable() 是向 webpack 声明「我的输出只由输入决定，可以按输入做缓存键」；反过来，读了外部时间、随机值的 loader 必须显式声明不可缓存，否则缓存会放大它的不确定性。",
            bonus:
              "判断自己写的 loader 纯不纯，用一个测试：同一输入跑两遍，输出与副作用（外部世界的变化）是否都一致。",
          },
          {
            q: "什么需求会「只能写成 plugin」？给出判断流程。",
            intent: "考机制选型的边界——能把「数据可见范围」作为判断依据的，是真理解了分界线。",
            depth: 3,
            a: "三问：① 需要别的模块/整张依赖图的信息吗？loader 只见当前文件，需要跨模块视角就只能是 plugin。② 需要操作产物（assets）吗？加文件、改 HTML、抽 CSS、出报告，发生在「模块已组装成 chunk 之后」，loader 管不到。③ 需要控制构建时机吗（写盘前后、编译完成后、watch 触发时）？时机是 Tapable 钩子的事。三问有任一是「是」，loader 方案就不成立；反过来，纯粹的「文件 A 进、代码出」写成 plugin 反而是绕远——它放弃了缓存与管道复用。",
            bonus:
              "灰色地带示例：给 Markdown 的链接做全局校验——看似「转换文件」，实际要汇总所有文件的链接做去重检查，跨模块信息 → plugin。",
          },
          {
            q: "tap、tapAsync、tapPromise 三种注册形态怎么选？用错了会怎样？",
            intent: "考 Tapable 的同步异步家族——能说清「钩子类型决定注册形态」才算读过源码级文档。",
            depth: 4,
            a: "形态由钩子类型决定：SyncHook 只接受 tap，回调同步执行、返回值即结果；AsyncSeriesHook/AsyncParallelHook 三种都能注册，但异步回调必须显式通知完成——tapAsync 用末位 callback 参数，tapPromise 返回 Promise。用错了不是报错而是「静默不等待」：在异步串行钩子上用了 tap，webpack 不会等你的同步函数，你的逻辑没做完流程就走了——这类 bug 表现为产物时有时无，极难排查。",
            bonus:
              "AsyncParallelHook 在某个回调失败（callback(err)）时会立即终止——但「已并行发出的任务无法撤销」，错误处理语义要在设计 plugin 时就想清楚。",
          },
          {
            q: "写一个 plugin 在产物写盘前删除所有体积为 0 的空 chunk，思路是什么？",
            intent: "实操收尾题，检验 compiler/compilation 坐标系与钩子时序是否真的串起来了。",
            depth: 4,
            a: "挂 compiler.hooks.emit（写盘前、assets 已就绪）→ 回调参数 compilation.assets 拿到全部产物文件 → 按 size 为 0 筛出目标 → delete compilation.assets[name]，并在 compilation.hooks.processAssets 或 emit 里同步打印日志。要点有二：emit 阶段的 assets 是「最终形态」，之后就是写盘，改这里是最后窗口；删 chunk 级文件还要考虑 HTML 里的引用——那就得再联合 HtmlWebpackPlugin 的钩子同步改引用，单删文件会留下 404。",
            bonus:
              "这道题的完整版正是 clean-webpack-plugin / webpack-bundle-analyzer 的核心原理——读它们的源码，验证你脑中的钩子时序图。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "为什么 tree-shaking 摇不动 CJS？",
            to: "/note/frontend/engineering/build/tree-shaking-cjs",
            description: "转换之后是分析：依赖图的「静态性」决定了哪些代码能被安全删除。",
          },
          {
            title: "HMR 是怎么做到只替换一块代码的？",
            to: "/note/frontend/engineering/build/hmr-incremental",
            description: "构建过程介入的极致应用：增量编译与模块热替换的完整链路。",
          },
        ]}
      />
    </NoteShell>
  );
}
