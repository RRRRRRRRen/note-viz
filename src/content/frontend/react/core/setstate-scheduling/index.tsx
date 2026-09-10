import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock, FlowChart } from "@/components/demo";
import { CompareTable, CrossRef, DoDont, OutputTimeline, Prerequisite } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        调用 setState 只做两件事：把 update <strong>入队</strong>、把组件
        <strong>标记</strong>为待更新——它不改任何变量的值，而是「请求一次重新渲染」。真正的渲染由
        <strong>调度器</strong>在本轮事件处理全部结束后合并执行，所以调用后立刻读 state
        一定是旧值。React 18 起<strong>自动批处理</strong>
        覆盖所有场景（setTimeout/Promise/原生事件里同样合并），「立刻刷出去」的唯一逃生舱是{" "}
        <code>flushSync</code>。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "连续 setState 为什么只加一次：批处理",
            to: "/note/frontend/react/hooks/hooks-render",
          },
        ]}
      >
        那篇从使用者视角讲「连续 setState 为什么只 +1」（闭包快照 + 交互演示）；本篇下潜一层，讲
        React 拿到这次调用之后在内部做了什么。两篇视角互补，分界在「行为 vs 机制」。
      </Prerequisite>

      <Heading level={2} title="第一件事：update 入队，而不是赋值" />
      <Paragraph>
        为什么不直接改值？因为 React 需要把「N 次修改」合并成「1 次渲染」，而合并的前提是先把修改
        <strong>攒起来</strong>。调用 setState 后，一个 update 对象进入该组件状态对应的
        <strong>更新队列</strong>——队列里可以存目标值，也可以存 updater 函数。到下一次渲染时，React
        从当前 state 出发<strong>逐个重放</strong>
        队列：遇到值直接替换，遇到函数就拿上一步的返回值继续算。
      </Paragraph>
      <Paragraph>
        这个「存操作、渲染期重放」的模型和数据库
        WAL、事件溯源是同构的思想：记录操作日志而非最终状态，消费时从初始值 reduce 出结果。react.dev
        的官方练习 <code>getFinalState</code>
        就是这个重放算法的原样实现（据 react.dev《Queueing a Series of State
        Updates》）——理解了这段循环，函数式更新就不再是咒语：
      </Paragraph>
      <CodeBlock
        lang="typescript"
        code={`// react.dev 课后练习：队列重放的核心算法
function getFinalState(baseState: number, queue: (number | ((n: number) => number))[]) {
  let finalState = baseState;
  for (const update of queue) {
    if (typeof update === "function") {
      finalState = update(finalState); // 操作：基于前值计算
    } else {
      finalState = update;             // 值：直接替换
    }
  }
  return finalState;
}

getFinalState(0, [1, 1, 1]);           // 1   —— 三次「替换为 1」
getFinalState(0, [n => n + 1, n => n + 1, n => n + 1]); // 3  —— 三次操作依次重放`}
      />
      <OutputTimeline
        label="重放结果 / replay result"
        steps={[
          {
            output: "1",
            phase: "同步",
            why: "三次 update 都是「直接替换为 1」：队列里存的是目标值，最后一次替换决定结果——替换执行多少遍都与渲染次数无关。",
          },
          {
            output: "3",
            phase: "同步",
            why: "三次 update 都是函数：重放时从 baseState 出发依次计算，0 → 1 → 2 → 3，每一步吃上一步的返回值——存「操作」才保得住连续累加。",
          },
        ]}
      />

      <Heading level={2} title="第二件事：标记组件，请求渲染" />
      <Paragraph>
        入队的同时，React 把这个 Fiber 节点<strong>标记</strong>
        为待更新，并向调度器发起一次「渲染请求」。为什么不干脆直接渲染？因为「请求-合并」模型才付得起批量化的账：一个事件里改
        10 个状态，标记会合并到同一次渲染请求上，最终只渲染一次。这也是「setState
        不慢、重渲染才贵」的根源——贵的那部分被推迟并且只收一次费。
      </Paragraph>
      <Paragraph>
        引擎层面的动作是：从触发更新的 Fiber 节点向上找到 root，把这次 update 的优先级记到 root
        的待处理标记上（<code>pendingLanes</code>
        ，机制见「Fiber 为什么能让渲染可中断？」篇）。调度器拿到请求后合并去重——同一轮里第二次
        setState 发现已有待处理渲染，就只追加队列、不再重复请求。下图是一次调用的完整旅程：
      </Paragraph>
      <FlowChart
        label="一次 setState 的旅程 / update flow"
        height={260}
        data={{
          direction: "LR",
          nodes: [
            { id: "call", label: "setState(update)", color: "#f59e0b" },
            { id: "queue", label: "update 入队", color: "#f59e0b" },
            { id: "mark", label: "标记 Fiber 待更新", color: "#8b5cf6" },
            { id: "sched", label: "调度器合并请求", color: "#8b5cf6" },
            { id: "render", label: "render 阶段重放队列", color: "#1677ff" },
            { id: "commit", label: "commit 更新 DOM", color: "#3fb950" },
          ],
          edges: [
            { source: "call", target: "queue" },
            { source: "queue", target: "mark" },
            { source: "mark", target: "sched", label: "本轮只发一次" },
            { source: "sched", target: "render", label: "事件处理结束后" },
            { source: "render", target: "commit" },
          ],
        }}
      />

      <Heading level={2} title="批处理：从事件系统行为到调度器行为" />
      <Paragraph>
        批处理指「一轮交互里多次 setState 只触发一次渲染」。react.dev 的表述是：React
        会等事件处理函数里的<strong>全部代码</strong>
        跑完，才开始处理你积攒的状态更新；同时批处理<strong>不跨多次有意事件</strong>
        ——第一次点击和第二次点击各自合并，不会攒到一起。这个边界是刻意保留的：它保证了「第一次点击禁用表单，第二次点击就不会再提交」这类时序语义可以预测。
      </Paragraph>
      <Paragraph>
        真正的版本分界在 React 18：此前批处理是<strong>事件系统</strong>
        的行为——只有 React 合成事件处理函数内才批，setTimeout、Promise、原生事件监听里每次 setState
        都独立触发渲染；18 的 <code>createRoot</code>
        把批处理升级为<strong>调度器</strong>
        的行为——任何场景默认合并（官方称 automatic batching，据 React 18 发布公告）。行为差异对照：
      </Paragraph>
      <CompareTable
        label="批处理演进 / batching"
        left={{
          title: "React 17 及以前",
          color: "#8b5cf6",
          points: [
            "只在 React 事件处理函数内自动批处理",
            "setTimeout / Promise.then / 原生事件里逐次渲染",
            "入口：ReactDOM.render（legacy 模式）",
            "批处理是「事件系统」的行为",
          ],
        }}
        right={{
          title: "React 18+",
          color: "#3b82f6",
          points: [
            "createRoot 后全场景自动批处理",
            "setTimeout / Promise / 原生事件内同样合并",
            "逃生舱：flushSync 强制立即渲染",
            "批处理升级为「调度器」的行为",
          ],
        }}
      />
      <Paragraph>
        需要绕过批处理的场景很少但真实存在：读完更新后的 DOM
        尺寸再决定布局、配合第三方动画库逐帧取值。逃生舱是 <code>flushSync(fn)</code>
        ——fn 里的更新跳过合并、同步刷进 DOM。它是<strong>唯一</strong>
        的逃生舱，而且代价明确：每次调用都打断批处理、强制一次完整渲染，滥用等于手动退回 17
        之前的渲染粒度。
      </Paragraph>

      <Heading level={2} title="边界与陷阱" />
      <Paragraph>
        第一个坑：<strong>在 updater 里做副作用</strong>
        。updater
        在渲染期才执行，而渲染随时可能被打断后从头重算——副作用跟着重放，发过的请求会重发、push
        过的日志会翻倍。规避方式：updater 只做纯计算，副作用移到 useEffect 或事件处理器里。
      </Paragraph>
      <Paragraph>
        第二个坑：<strong>循环里逐次 flushSync</strong>
        。每次调用都强制一次同步的完整渲染，循环写它等于把批处理优化亲手打穿，渲染次数从 1 回到
        N。规避方式：先把更新攒完，flushSync 只留一次给「必须立刻读更新后 DOM」的那个点，用完即走。
      </Paragraph>
      <Paragraph>
        第三个坑：<strong>依赖 updater 外的可变量</strong>
        （模块级计数器、ref
        的当前值）。重放时外部世界已经变了：同一份队列重放两次，吃到不同的外部值，结果不可复现——StrictMode
        的双执行正是专门暴露这类不纯。规避方式：updater
        只吃入参与前值，需要的外部状态先进队列（作为闭包入参或前置 update）。
      </Paragraph>
      <DoDont
        label="updater 使用纪律 / pure updater"
        dont={{
          code: `// 副作用进 updater + 无脑 flushSync
setCount(c => {
  api.log(c);        // 渲染重放时会重复发请求
  return c + 1;
});
flushSync(() => setA(1));   // 循环里逐次同步刷，
flushSync(() => setB(2));   // 批处理被完全打穿`,
          note: "updater 不纯 + 滥用逃生舱：副作用翻倍、每行 setState 都触发一次完整渲染",
        }}
        do={{
          code: `// updater 保持纯：只算，不做副作用
setCount(c => c + 1);

// 攒完再刷；flushSync 只留给
// 「必须立刻读更新后的 DOM」的场景
flushSync(() => setA(1));
const h = ref.current?.clientHeight;`,
          note: "副作用移到 useEffect；flushSync 单次、点状使用，用完即走",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "setState 之后立刻 console.log，为什么还是旧值？怎么拿到更新后的值？",
            intent:
              "热身题，筛掉「setState 是异步的」这种半对半错的表述——真正的答案是调度，不是异步。",
            depth: 2,
            a: "setState 是同步调用、异步生效的调度行为：它只把 update 入队并标记组件待更新，状态在本轮事件处理结束后的那次渲染才生效——它不是 Promise 意义上的异步 API。要基于最新值连续更新，用函数式写法 setCount(c => c + 1)；要拿「渲染后」的时机，用 useEffect（依赖该状态）或 flushSync 强制同步刷新后再读。",
            bonus:
              "类组件 setState 的第二参数回调与 componentDidUpdate 时机一致——commit 完成后同步执行，早于 passive 的 useEffect。",
          },
          {
            q: "setCount(count + 1) 写三次只 +1，setCount(c => c + 1) 写三次能 +3——队列里到底发生了什么？",
            intent:
              "考批处理的实现层：答出「队列存操作、渲染期重放」才算理解机制，只答「闭包」说明停留在现象。",
            depth: 3,
            a: "渲染期 React 从当前 state 出发逐个重放队列：遇到值直接替换，遇到函数就拿前一步的返回值继续算。三份 count + 1 都闭包捕获了同一个旧值，重放时等于三次「替换为 1」；三份 c => c + 1 则依次 0→1→2→3。本质区别是：队列里存的是「目标值」还是「操作」。",
            bonus:
              "react.dev 的课后练习 getFinalState 就是这个重放算法——for 循环里 typeof update === 'function' ? update(state) : update，值得亲手写一遍。",
          },
          {
            q: "React 18 的自动批处理有没有覆盖不到的场景？",
            intent: "考边界：能说出 flushSync 与「批处理不跨多次有意事件」才算完整掌握。",
            depth: 3,
            a: "覆盖不到的只有两类。一是 flushSync 包裹的更新，立即同步渲染；二是批处理不跨「多次有意事件」——第一次 click 和第二次 click 各自合并，不会跨事件攒批，这保证了「第一下禁用表单、第二下就不会再提交」这类时序语义可预测。除此之外事件、setTimeout、Promise、原生监听里的更新全部默认批处理。",
            bonus:
              "flushSync 内部是「同步刷完当前队列再继续」，每次调用都强制一次完整渲染——滥用等于手动退回 React 17 之前的渲染粒度。",
          },
          {
            q: "setState 的「异步生效」和 microtask 有关系吗？渲染请求排进了哪个队列？",
            intent:
              "把 React 调度与事件循环区分开——能分清「谁管队列、谁管渲染」的才是理解过调度层的人。",
            depth: 4,
            a: "没有关系。它不是微任务也不是 Promise：React 用自己的 Scheduler 排渲染请求，通过 MessageChannel 的宏任务切片执行，每个时间片处理若干工作单元、片间询问是否让出主线程。事件循环只提供宏任务时间片，React 在里面做了自己的二级调度；这与微任务队列是两个完全独立的层级。",
            bonus:
              "离散事件（click）与连续事件（scroll）的更新优先级不同——这条线索通向 Fiber 的 lane 模型，见「Fiber 为什么能让渲染可中断？」。",
          },
          {
            q: "为什么 updater 函数必须是纯的？StrictMode 为什么要把 updater 跑两遍？",
            intent:
              "压轴题，为 Fiber 的可中断渲染埋线——答出「渲染期可能重放、可能丢弃重来」就直接通向下一篇。",
            depth: 4,
            a: "updater 在渲染期才执行，而渲染随时可能被打断后从头重算——updater 若带副作用（发请求、改外部变量、push 日志），重放一次就执行一次，副作用会翻倍。StrictMode 在开发模式把 updater 和组件函数各跑两遍、丢弃第二遍结果，就是在开发期暴露这类不纯。纯函数保证「算多少遍结果都一样」，这是渲染可丢弃的前提。",
            bonus:
              "这个前提在并发渲染里是硬约束：render 阶段被高优先级插队后，半成品直接作废重来——不纯的 updater 会在用户无感知的情况下重复执行。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "Fiber 为什么能让渲染可中断？",
            to: "/note/frontend/react/core/fiber-rendering",
            description:
              "排队之后渲染怎么走：render/commit 两阶段、双缓存与 lane 优先级——本篇的下一问。",
          },
          {
            title: "用 index 做 key 为什么会状态错位？",
            to: "/note/frontend/react/reconcile/key-index-mismatch",
            description: "render 阶段的核心对账算法：key 如何决定节点的复用、移动与重建。",
          },
        ]}
      />
    </NoteShell>
  );
}
