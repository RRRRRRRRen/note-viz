import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { StateFlow, Timeline } from "@/components/viz";
import { CrossRef, Prerequisite } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        靠三件事咬合：<strong>增量编译</strong>
        ——文件变更只重编译受影响的模块，产出「更新清单（manifest：新 hash + 变更 chunk 列表）+ 补丁
        chunk」；<strong>runtime 对账</strong>
        ——浏览器里的 HMR runtime 收到 WebSocket 通知后，按清单下载补丁、把变更模块标为失效；
        <strong>accept 边界</strong>
        ——每个模块可以声明「我变了怎么处理」，有边界就局部替换并保留内存状态，没有边界就沿依赖图向上冒泡，一路冒到入口还没有，退化为整页刷新。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "构建工具到底解决了什么问题？",
            to: "/note/frontend/engineering/build/build-problem",
          },
        ]}
      >
        HMR 建立在「模块 ID 跨构建保持稳定」这张图上——先知道依赖图怎么建，热替换才有着力点。
      </Prerequisite>

      <Heading level={2} title="live reload 与 HMR 的分界" />
      <Paragraph>
        live reload 的模型是「文件变了 → 通知浏览器 → location.reload()」：整页刷新，内存里的 JS
        状态全部清零——表单填到一半、调试断点、组件内部状态，全部陪葬。HMR 的目标只有一个：
        <strong>把「重新执行」的范围从整页缩小到模块</strong>
        ，页面其他部分的内存状态原样保留。这两者不是对立功能——dev-server 的 hot 模式总是先试
        HMR，失败才回退整页刷新；「HMR 是热替换的常态，刷新是它的兜底」这个关系要摆正。
      </Paragraph>
      <Paragraph>
        实现层面的关键障碍是：浏览器里跑着旧代码，新代码在服务器上，谁来执行「替换」？答案是打包时预埋进
        bundle 的 <strong>HMR runtime</strong>
        ：它是产物的一部分，常驻页面，与 dev-server 之间维持 WebSocket
        长连接。「编译在服务端、应用在客户端、通知靠推送、补丁靠拉取」——四个角色先分清，流程就不乱了。
      </Paragraph>

      <Heading level={2} title="一次热更新的完整旅程" />
      <Paragraph>
        服务端：watch 到文件变化 → 增量编译 → 产出更新的两件套：<strong>manifest（JSON）</strong>与
        <strong>一个或多个 update chunk（JS）</strong>。manifest 里是新编译 hash 与全部变更 chunk
        的列表，每个 update chunk 装着对应模块的新代码（或「已删除」标记）；跨构建的模块 ID、chunk
        ID 保持一致——这是 runtime 能把补丁「对号入座」的前提（据 webpack.js.org《Hot Module
        Replacement》）。
      </Paragraph>
      <Paragraph>
        客户端：runtime 通过 WebSocket 收到通知（推的只有 hash 变化事件，不是代码），发起 check——按
        manifest 拉取补丁，与当前已加载 chunk 对账后进入 ready 状态；随后 apply 把所有变更模块标记为
        invalid、调用 dispose 处理器清理旧模块、更新当前 hash、依次调用 accept 处理器——apply
        是同步的，check 是异步的。整个过程对页面上的其他模块零打扰。
      </Paragraph>
      <Timeline
        label="HMR 更新流程 / hmr flow"
        steps={[
          { label: "文件变化", sub: "watch 触发增量编译", color: PALETTE.orange },
          { label: "生成补丁", sub: "新 hash + manifest/update", color: PALETTE.purple },
          { label: "WebSocket 通知", sub: "runtime check 拉取补丁", color: PALETTE.blue },
          { label: "apply：失效与处置", sub: "dispose 清旧模块", color: PALETTE.orange },
          { label: "accept 边界执行", sub: "局部替换，状态保留", color: PALETTE.green },
        ]}
      />

      <Heading level={2} title="accept 边界与冒泡" />
      <Paragraph>
        HMR 是<strong>opt-in</strong> 的：<code>module.hot.accept</code>{" "}
        声明「这个模块（或它依赖的某个模块）变更时，由我来处理替换」。没有声明的模块，更新沿依赖图
        <strong>向上冒泡</strong>
        ——找到最近一个有处理器的祖先模块；官方文档的表述是：每个失效模块要么自己有处理器、要么冒泡失效其父级，逐级向上直到入口或某个处理器为止；从入口冒出，流程失败，dev-server
        回退整页刷新。这个模型解释了为什么组件库（react-refresh、vue-loader）只在「组件」这一层声明边界：一个边界托管整棵子树。
      </Paragraph>
      <StateFlow
        label="补丁的命运 / update routing"
        direction="LR"
        states={[
          { id: "arrive", label: "补丁到达", kind: "start", color: PALETTE.orange },
          { id: "check", label: "runtime check", color: PALETTE.blue, desc: "拉 manifest 与补丁" },
          { id: "apply", label: "accept 边界热替换", kind: "terminal", color: PALETTE.green },
          { id: "bubble", label: "无边界，向上冒泡", color: PALETTE.gray },
          { id: "reload", label: "整页刷新（兜底）", kind: "terminal", color: PALETTE.red },
        ]}
        transitions={[
          { from: "arrive", to: "check", label: "WS 通知 hash 变化" },
          { from: "check", to: "apply", label: "模块或祖先有 accept" },
          { from: "check", to: "bubble", label: "无人认领", color: PALETTE.gray },
          { from: "bubble", to: "apply", label: "祖先声明 accept" },
          { from: "bubble", to: "reload", label: "冒泡至入口", color: PALETTE.red },
        ]}
      />

      <Heading level={2} title="dispose：状态怎么交棒" />
      <Paragraph>
        替换意味着旧模块的代码即将作废，但它可能还攥着运行时资源——定时器、事件订阅、与 DOM 的关联。
        <code>module.hot.dispose</code>{" "}
        处理器在旧模块卸载前执行，负责清理与「交棒」：把要延续的数据挂到{" "}
        <code>module.hot.data</code> 上，新模块执行时从 data 里取回。CSS
        是最典型的免费受益者：webpack 内置的 CSS 支持替你实现了 HMR 接口，样式更新就是替换 style
        节点，无需你写一行 accept。
      </Paragraph>
      <Paragraph>
        组件框架把这层又包了一层：react-refresh 在组件模块上声明
        accept，用新定义重渲染既有组件实例——状态保在 Hook 链上。它的保守降级规则值得知道：Hook
        的调用数量与顺序必须稳定，改动 Hook
        结构会触发整组件重挂载——宁可贵一点，也不让状态错位（机制见「Fiber
        为什么能让渲染可中断？」篇的 memoizedState 链表）。
      </Paragraph>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
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
            q: "module.hot.accept 有两种调用形态，分别声明了什么责任？",
            intent:
              "考「谁来处理替换」的所有权模型——只会写 accept() 括号里什么都不放的人，答不出这题。",
            depth: 3,
            a: "自更新形态 accept() 无参数：模块自己变了，由自己的代码原地重新执行，旧的全局副作用要靠 dispose 清理；依赖更新形态 accept('./dep.js', callback)：声明「我依赖的 dep 变了，别冒泡，把新模块交给我，我在 callback 里决定怎么用」。前者适合叶子工具模块，后者适合「管理子模块的容器」——路由文件 accept 各页面模块、样式入口 accept 各 CSS，都是后者的形态。",
            bonus:
              "accept 了却不处理，更新等于被「吞掉」：页面还在跑旧逻辑、没有任何报错——排查「改了代码没反应」时先怀疑有人乱 accept。",
          },
          {
            q: "冒泡到入口为什么会演变成整页刷新？runtime 判断的依据是什么？",
            intent: "考冒泡模型的终点——「图向上走到头」这个几何事实与「兜底策略」的因果关系。",
            depth: 3,
            a: "accept 边界是「局部替换」的许可：没有许可，失效标记只能向上传染——因为父模块引用着失效模块的导出，子模块换了、父模块不重新执行就可能出现新旧混杂。一路到入口仍然无人认领，意味着这次变更事实上无法局部应用（入口已经没有「父级」可以接管）；HMR 对这种失败没有更聪明的办法，dev-server 只能退回 live reload 整页刷新——先试热替换、再试刷新正是 hot 模式的既定顺序。",
            bonus:
              "所以「改什么都整页刷新」的排查方向：从被改文件沿 import 链向上找，看断在哪一层没人 accept——常见是入口直连的工具模块没被任何边界托管。",
          },
          {
            q: "dispose 处理器负责什么？module.hot.data 的交棒机制是怎么设计的？",
            intent: "考状态延续的实现——答「清理资源」只对一半，能说出 data 交棒的是完整版。",
            depth: 4,
            a: "两件事：清理与交接。dispose 在旧模块失效后、新模块执行前同步运行——清定时器、解绑监听、销毁副作用实例；要延续的状态写进 module.hot.data（同一引用贯穿新旧两代模块），新模块执行时先读 data 里的遗留值恢复现场。这套约定的意义在于把「替换」变成有秩序的新陈代谢：旧代码自己收拾自己，新代码凭遗物接手，浏览器里没有任何全局注册表参与。",
            bonus:
              "推论：dispose 里抛错会让这次热更新失败退化成整页刷新——它和 accept 回调一样在关键的同步路径上，不能随意省 try/catch。",
          },
          {
            q: "WebSocket 推的是什么？为什么不直接把新代码从 WS 推下来，而要走 HTTP 拉补丁？",
            intent:
              "压轴题，考「通知」与「传输」的分层——把推送模型画对的人，对整套协议的理解是真懂。",
            depth: 4,
            a: "WS 只推轻量事件：新编译的 hash（以及无效、错误等状态信号），代码本身由 runtime 发起普通 HTTP 请求按 manifest 清单拉取。分层的原因有三个：① 补丁是静态资源，HTTP 的缓存协商、CDN、断点续传白拿；② manifest/补丁走 HTTP 意味着与「页面加载产物」同源同管线，代理、鉴权、压缩策略一致；③ WS 保持轻量只做信号通道，断了重连的成本和复杂度都最低——信号与数据分离，是分布式系统的通用分层直觉。",
            bonus:
              "Vite 的 HMR 同样是 WS 信号 + HTTP 拉模块的分层，只是补丁粒度从 chunk 细化到原生 ESM 模块——架构同构，粒度不同。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "为什么 tree-shaking 摇不动 CJS？",
            to: "/note/frontend/engineering/build/tree-shaking-cjs",
            description: "同一张依赖图的另一种利用：模块 ID 的稳定性同样支撑着死代码删除。",
          },
          {
            title: "Fiber 为什么能让渲染可中断？",
            to: "/note/frontend/react/core/fiber-rendering",
            description: "react-refresh 保状态的底层：Hook 状态链为什么必须按顺序对号入座。",
          },
        ]}
      />
    </NoteShell>
  );
}
