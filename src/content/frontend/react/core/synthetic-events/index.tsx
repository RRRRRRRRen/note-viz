import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { SequenceDiagram } from "@/components/viz";
import { CrossRef, DoDont, VersionNote } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        合成事件 = React 对原生事件的<strong>统一包装</strong> + <strong>委托分发</strong>
        机制。你在 JSX 里写的 <code>onClick</code>
        从不挂到对应的 DOM 上——React 在 root 容器挂一个总监听器，原生事件冒泡到 root 后沿 Fiber 树
        <strong>模拟</strong>
        捕获/冒泡顺序，找到该响应的组件处理器再调用。换来三样东西：跨浏览器行为统一、成千上万处理器只有
        1 个真实监听器、事件可以<strong>分优先级</strong>进入调度器。
      </Conclusion>

      <Heading level={2} title="委托：onClick 到底挂在哪" />
      <Paragraph>
        为什么不直接 addEventListener？事件委托本是 DOM
        编程的经典手法：给一千行列表每行绑一个监听器，不如在父容器上绑一个、靠冒泡分发——绑定成本从
        O(n) 降到 O(1)，动态增删的节点也不用反复绑解。React 把这个手法做成了
        <strong>框架默认</strong>
        ：所有通过 props 声明的事件处理器，最终都由一个委托体系统一分发，组件代码里完全看不到
        addEventListener 的存在。
      </Paragraph>
      <Paragraph>
        引擎层面的路径：React 16 及以前把总监听器挂在 <code>document</code> 上；React 17 起改挂到{" "}
        <code>createRoot</code> 的 <strong>root 容器</strong>
        （迁移动机：多个版本 React 共存、微前端场景下事件不再全局窜台）。原生事件冒泡到 root
        后，React 拿到事件目标对应的 Fiber
        节点，沿树收集所有相关处理器，按模拟的捕获/冒泡顺序依次调用。一次点击的完整旅程：
      </Paragraph>
      <SequenceDiagram
        label="合成事件分发 / delegation"
        actors={["DOM 元素", "root 总监听", "Fiber 树", "你的 onClick"]}
        messages={[
          {
            from: 0,
            to: 1,
            label: "click 原生冒泡",
            note: "全应用只有这一个真实监听器",
          },
          {
            from: 1,
            to: 2,
            label: "沿 target 向上收集处理器",
            note: "拿到 Fiber 链，按模拟捕获/冒泡排序",
          },
          {
            from: 2,
            to: 3,
            label: "依序调用处理器",
            note: "传入 SyntheticEvent 包装对象",
          },
          {
            from: 3,
            to: 2,
            label: "e.stopPropagation()",
            dashed: true,
            note: "拦的是模拟传播，不是原生冒泡",
          },
          {
            from: 3,
            to: 1,
            label: "setState：进入批处理队列",
            color: "#8b5cf6",
            note: "事件处理结束后由调度器合并渲染",
          },
        ]}
      />

      <Heading level={2} title="包装：SyntheticEvent 与原生事件的差别" />
      <Paragraph>
        传给你的事件对象不是浏览器原生的那份，而是 React 包装过的 <code>SyntheticEvent</code>
        ：接口对齐 W3C 规范（<code>preventDefault</code>、<code>stopPropagation</code>、
        <code>target</code>{" "}
        等），把各浏览器的差异在包装层抹平——这是它叫「合成」的原因：行为是合成的标准事件，不是某个浏览器的原生实现。要碰底层原对象，用{" "}
        <code>e.nativeEvent</code>。对组件代码来说还有一笔隐性的账：合成事件不用
        removeEventListener、不用管清理，组件卸载时委托体系自然不再分发。
      </Paragraph>
      <Paragraph>包装层有两次值得记住的架构变动，都和「委托点在哪」直接相关：</Paragraph>
      <VersionNote
        label="事件体系演进 / event system"
        versions={[
          {
            range: "React 16-",
            text: "委托到 document；事件池复用合成事件对象，异步回调里读 e 要先 e.persist()",
            color: "#9ca3af",
          },
          {
            range: "React 17",
            text: "委托点移到 root 容器（多版本共存/微前端友好）；移除事件池，e 可随时读取",
            color: "#1677ff",
          },
          {
            range: "React 18+",
            text: "事件带优先级进入调度器：离散事件（click/keydown）同步处理，连续事件（scroll/mousemove/wheel）可被打断",
            color: "#3fb950",
          },
        ]}
        note="三段演进是同一件事：让事件从「DOM 的通知」升级为「调度体系的一等公民」"
      />

      <Heading level={2} title="边界：两套事件体系要分开想" />
      <Paragraph>
        第一个坑：<strong>原生监听与合成事件的顺序错位</strong>
        。React 16 时代委托点在 document，你在 document 上自己绑的原生监听若调用
        stopPropagation，会按注册顺序把 React 的处理器一起拦掉；React 17 把委托点内移到 root
        后顺序反转——React 的处理器在 root 层先执行，document
        上的原生监听后到，冒泡阶段想拦也拦不住了（要拦只能在{" "}
        <strong>root 之外祖先的捕获阶段</strong>
        监听——捕获自外向内先于 root 到达；冒泡阶段的 window 监听排在 root
        之后触发，同样拦不住）。同一个「拦截」意图，跨版本行为相反，根因就是委托点位置变了。
      </Paragraph>
      <Paragraph>
        第二个坑：<strong>portal 的冒泡按 React 树走</strong>
        。把模态框 portal 到 body 下，DOM 上它是外层容器的「邻居」，事件却沿{" "}
        <strong>React 父子链</strong>冒泡——外层父组件的 onClick 照样会收到 portal
        内容的点击。这是刻意设计：逻辑结构优先于物理 DOM。想阻断，在 portal 内容自己的 onClick 里
        stopPropagation（拦的是 React 模拟传播）。第三个坑：
        <strong>自己 addEventListener 到组件 DOM 节点</strong>的监听要自己在 cleanup
        解绑——委托体系只管它自己分发的部分，合成事件「免清理」的便利不覆盖原生绑定。
      </Paragraph>
      <DoDont
        label="portal 里的点击拦截 / portal bubbling"
        dont={{
          code: `// Modal portal 到了 body 下
<div onClick={close}>        // 外层遮罩
  <Modal>...</Modal>         // 点 Modal 内部
</div>
// 期望：点 Modal 不触发 close
// 实际：事件沿 React 树冒泡 → close 被触发`,
          note: "portal 改变的是 DOM 位置，冒泡仍按 React 父子链——物理上是邻居，逻辑上是父子",
        }}
        do={{
          code: `// 在 portal 内容内部阻断模拟传播
<div onClick={e => e.stopPropagation()}>
  <Modal>...</Modal>
</div>`,
          note: "stopPropagation 拦的是 React 模拟传播：外层父组件的处理器不再收到",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "onClick 的监听器到底挂在哪？什么时候绑上去的？",
            intent:
              "热身题：确认「委托」这个底层事实——答「挂在这个 DOM 上」的人还没建立两套事件体系的模型。",
            depth: 2,
            a: "挂在 createRoot 的 root 容器上（React 16 及以前挂在 document），在 createRoot 初始化时绑一次，全应用只有这一个真实监听器。你写的 onClick 只是 React 组件树上的一个声明，原生事件冒泡到 root 后由 React 沿 Fiber 树模拟传播、找到对应处理器再调用。",
            bonus:
              "所以列表渲染一千个 onClick 也只有一个真实监听器——绑定成本 O(1)，动态增删行无需绑解。",
          },
          {
            q: "合成事件对象和原生事件对象是什么关系？e.nativeEvent 是什么？",
            intent: "考「合成」二字的实现含义：包装层抹平差异，而不是重新发明事件。",
            depth: 3,
            a: "SyntheticEvent 是对原生事件的包装：接口对齐 W3C 规范，把各浏览器的行为差异抹平在包装层内，所以叫「合成」——行为是合成的标准事件。e.nativeEvent 指向浏览器派发的原生对象；两者指向同一次物理事件，合成对象是 React 自己的字段视图。React 17 起事件池移除，这个对象可以安全地在异步回调里持有和读取。",
            bonus:
              "React 16- 有事件池：合成事件对象被复用、回调结束后字段清空，异步访问前必须 e.persist()——老项目里偶尔还能见到这个 API。",
          },
          {
            q: "在合成事件里调 e.stopPropagation()，阻止的到底是什么？",
            intent: "考模拟传播的边界：两套体系各自的「冒泡」是独立机制，能分清才算理解委托。",
            depth: 3,
            a: "阻止的是 React 模拟传播：同一轮派发里排在后面的 React 处理器（外层父组件、捕获阶段的处理器）不再收到事件。React 17 后它同时会阻止原生事件继续向 root 之上冒泡（此时原生事件已经到达 root）；但它管不了已经在 DOM 上发生的冒泡过程——物理冒泡到 root 是委托的前提，模拟传播是 root 之上的逻辑重放。",
            bonus:
              "「模拟」的直觉：事件物理上已经冒到顶了，React 拿着完整路径按逻辑规则重新路由一遍——类似应用层按协议规则重放已收到的报文。",
          },
          {
            q: "为什么 React 17 要把委托点从 document 挪到 root？迁移后哪个行为变了？",
            intent: "考版本演进的动机与代价：答出「多版本共存」是基本盘，能说出顺序反转才是完整。",
            depth: 4,
            a: "动机是让多个版本/多份 React 实例能安全共存（微前端）：document 只有一个，root 各有各的，事件各归各的委托体系，不再全局窜台。行为变化也在这里：委托点内移后，React 的处理器比 document 上的原生监听先执行——16 时代「document 监听里 stopPropagation 拦住合成事件」的手段失效；要赶在 React 处理之前拦截，只能在 root 之外的祖先（window/document）上用捕获阶段监听——冒泡阶段的 window 监听排在 root 之后触发，同样拦不住。同一拦截意图跨版本行为相反。",
            bonus:
              "root 容器委托还有个隐性收益：SSR/hydration 与并发渲染对事件路径的控制不再依赖全局 document 的状态。",
          },
          {
            q: "click 为什么同步处理、scroll 却可以被打断？事件优先级和 Fiber 是怎么接上的？",
            intent:
              "压轴题，把事件体系与调度器串成一条线——这是「合成事件」在 18 之后最大的存在意义。",
            depth: 4,
            a: "React 把事件按交互特征分了优先级：click、keydown 这类离散事件（用户在等一个明确反馈）派生同步优先级的更新，事件处理结束后尽快同步渲染；scroll、mouseover 这类连续事件（高频、下一帧就过期）派生可打断的低优先级更新，交给调度器切片处理。接线点是：事件处理器里每次 setState 都带着事件的优先级标记进更新队列，Fiber 的 lane 模型据此决定谁插队、谁可中断。",
            bonus:
              "这就是 useTransition 存在的语境：它允许开发者把自己的更新手动降级进 transition lane——「我这件事不急，别挡用户的输入」。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "Fiber 为什么能让渲染可中断？",
            to: "/note/frontend/react/core/fiber-rendering",
            description: "事件优先级的消费者：lane 模型、时间片让出与 useTransition 的机制。",
          },
          {
            title: "setState 之后 React 做了什么？",
            to: "/note/frontend/react/core/setstate-scheduling",
            description: "事件处理器里 setState 的批处理入口：入队、标记与调度合并。",
          },
          {
            title: "用 index 做 key 为什么会状态错位？",
            to: "/note/frontend/react/reconcile/key-index-mismatch",
            description:
              "事件带着优先级进了调度器，render 阶段怎么对账：key 如何决定节点的复用、移动与重建。",
          },
        ]}
      />
    </NoteShell>
  );
}
