import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo/FlowChart";
import { CompareTable, DoDont, MemoryCard, Timeline } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        setState 是「<strong>标记 + 调度</strong>」而不是「立即改状态」：调用后 update
        入队、组件被标记待更新，真正的重渲染由调度器合并执行——所以调用后立刻读 state 还是旧值。React
        18 起全场景<strong>自动批处理</strong>（setTimeout/Promise 里也合并为一次渲染）。Fiber
        把渲染拆成<strong>可中断的 render 阶段</strong> +<strong>同步的 commit 阶段</strong>。diff
        靠三个假设把 O(n³) 降到 O(n) ：同类型复用、key 标识唯一性、只做同层比较——
        <strong>key 用 index 在增删场景必然状态错位</strong>。性能三板斧：memo、稳定引用、列表正确
        key。
      </Conclusion>

      <Heading level={2} title="setState：标记与调度，不是立即更新" />
      <Paragraph>
        调用 setState（函数组件里是 setter）后发生的事：update 对象进入该 Fiber
        节点的更新队列，节点被<strong>标记</strong>
        为待更新，然后由调度器在合适的时机统一处理。所以「调用后立刻
        console.log」拿到的一定是旧值——状态变更发生在<strong>下一次渲染</strong>
        ，不是当下。函数组件想基于最新值连续更新，用函数式写法 <code>setCount(c =&gt; c + 1)</code>
        ，让 update 在队列里逐个基于前值计算。
      </Paragraph>
      <Paragraph>
        批处理指「一个事件里多次 setState 只触发一次渲染」。React 17 只在事件处理函数内批处理，
        setTimeout、Promise、原生事件里每次 setState 都独立渲染；React 18 的 <code>createRoot</code>{" "}
        入口启用<strong>自动批处理</strong>
        ，任何场景都合并为一次渲染。需要「立刻刷出去」的逃生舱是 <code>flushSync</code>
        ——读更新后的 DOM 尺寸这类场景才用，滥用会把批处理优化全部打穿。
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

      <Heading level={2} title="合成事件：一套委托机制" />
      <Paragraph>
        React 给 <code>onClick</code> 这类 props 的事件名叫<strong>合成事件</strong>
        ：它不是原生事件对象，而是 React 统一包装后的对象。实现上是<strong>事件委托</strong>
        ——React 17 起把所有监听器挂到 root 容器（更早版本挂在
        document）上，原生事件冒泡到顶层后，React 沿 Fiber
        树模拟捕获/冒泡顺序，找到对应的组件处理器调用。
      </Paragraph>
      <Paragraph>
        委托换来了三样东西：跨浏览器行为统一、成千上万处理器只挂一个真实监听器、以及实现事件分优先级（离散事件同步处理、连续事件可延迟）。代价是一个经典边界：在原生
        <code>addEventListener</code>（挂在 document 上）里调用 <code>stopPropagation</code>
        ，React 的合成事件可能根本收不到——两套事件体系的冒泡顺序要分开想；反过来在合成事件里
        <code>e.stopPropagation()</code> 阻止的也只是 React 模拟的传播。
      </Paragraph>

      <Heading level={2} title="Fiber：可中断的渲染架构" />
      <Paragraph>
        老架构渲染一棵大树是<strong>同步递归</strong>，中断点不存在，大更新会把主线程占死。Fiber
        把每个组件变成一个带 <code>child / sibling / return</code>{" "}
        指针的链表节点——渲染从「递归不可停」变成「沿链表一步步走，随时可以暂停」。 架构上是
        <strong>双缓存</strong>：屏幕上对应 current 树，更新时在内存里构建 workInProgress 树，render
        完成后一次性 commit 交换。
      </Paragraph>
      <Paragraph>
        两个阶段的责任划分是考点核心：<strong>render 阶段</strong>（计算 diff、构建
        workInProgress）纯计算、可中断、可废弃重来；<strong>commit 阶段</strong>
        （真实改 DOM、执行生命周期）同步不可中断——因为用户不能看到改到一半的 DOM。优先级用 lane
        模型表达（并发特征标记），高优先级更新可以打断低优先级的 render；开发者侧的{" "}
        <code>useTransition</code> / <code>useDeferredValue</code>{" "}
        就是把自家更新标为「可被打断的低优先级」。
      </Paragraph>

      <Timeline
        label="一次更新的生命周期 / update flow"
        steps={[
          { label: "触发更新", sub: "update 入队", color: "#f59e0b" },
          { label: "调度", sub: "按 lane 优先级排队", color: "#8b5cf6" },
          { label: "render 阶段", sub: "可中断 · 算 diff", color: "#1677ff" },
          { label: "commit 阶段", sub: "同步 · 改真实 DOM", color: "#3fb950" },
          { label: "effects", sub: "layout / passive 副作用", color: "#f59e0b" },
        ]}
      />
      <FlowChart
        label="双缓存 / double buffering"
        height={300}
        data={{
          direction: "TB",
          nodes: [
            { id: "current", label: "current 树（屏幕正在显示）", color: "#1677ff" },
            { id: "wip", label: "workInProgress 树（内存中构建）", color: "#8b5cf6" },
            { id: "commit", label: "commit：一次性替换 current", color: "#3fb950" },
            { id: "dom", label: "真实 DOM 更新 + effects", color: "#f59e0b" },
          ],
          edges: [
            { source: "current", target: "wip", label: "alternate 指针对照复用" },
            { source: "wip", target: "commit", label: "render 完成（可中断→同步点）" },
            { source: "commit", target: "dom" },
          ],
        }}
      />

      <Heading level={2} title="diff 与 key：三假设与错位陷阱" />
      <Paragraph>
        树 diff 的通用复杂度是 O(n³)，React 靠三个<strong>假设</strong>
        降到 O(n)：① 不同类型的元素直接销毁重建，不尝试复用；② 同层节点比较，不跨层移动；③
        同层多个子节点用 <strong>key</strong> 标识身份，key 相同且类型相同才复用。注意 「key
        相同」比「位置相同」优先——列表重排时 React 按 key 对账移动节点，而不是销毁重建。
      </Paragraph>
      <Paragraph>
        <code>key={"{index}"}</code> 的问题出在「身份造假」：index
        描述的是位置，不是元素。删除或插到头部后，后面的元素集体顶位，React 看到 key 0/1/2
        都还在，就<strong>复用了错误节点</strong>
        ——非受控输入框里残留上一个用户的输入、动画状态错乱、选中态串位，都是这个机制。纯静态只读列表用
        index 无害，但凡有增删排序，就用业务唯一 id。
      </Paragraph>

      <DoDont
        label="列表 key / list key"
        dont={{
          code: `{items.map((item, i) => (
  <UserRow key={i} user={item} />
))}
/* 删除第一项 → 全体 key 顶位
   复用错节点：输入残留、动画串位 */`,
          note: "index 是「位置」不是「身份」，增删/排序场景必然复用错节点",
        }}
        do={{
          code: `{items.map((item) => (
  <UserRow key={item.id} user={item} />
))}
/* key = 稳定业务 id
   删除后其余节点身份不变，精准移动 */`,
          note: "用稳定唯一 id 做 key；纯静态只读列表用 index 才无害",
        }}
      />

      <Heading level={2} title="性能优化与错误边界" />
      <Paragraph>
        React 的重渲染是<strong>引用比较</strong>驱动的：props/state
        的引用变了才认为「变了」。由此推出三板斧：
        <code>memo</code> 包组件跳过无变化渲染；<code>useMemo</code>/<code>useCallback</code>{" "}
        稳定对象与函数引用（给 memo 的组件或依赖数组用）；列表用正确 key 让 diff
        精准移动。但它们不是越多越好——每次都有比较成本，记忆化一个廉价计算反而更慢；先测量（Profiler
        定位重渲染热点）再优化。大数据量列表的正解是<strong>虚拟化</strong>
        ：只渲染可视区的那几十行。
      </Paragraph>
      <Paragraph>
        错误边界（ErrorBoundary）只在<strong>渲染阶段</strong>
        兜底：子组件渲染抛错、生命周期抛错会被最近的边界捕获并降级
        UI；事件处理器和异步回调里的错误它管不着——前者用 try/catch，后者各自捕获。这和 Node
        里「中间件错误要显式 next(err)」是同构的分界思维：框架只兜它调用的代码。
      </Paragraph>

      <MemoryCard keyword="优化三板斧与使用时机" color="#3fb950">
        <strong>memo</strong>（组件级跳过渲染）+ <strong>useMemo/useCallback</strong>
        （稳定引用，喂给 memo 和依赖数组）+ <strong>正确 key</strong>（精准 diff）。先 Profiler
        测量再动手； 大列表上虚拟化，别只靠 memo 硬扛。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "setState 之后立刻 console.log，为什么还是旧值？怎么拿到更新后的值？",
            intent:
              "热身题，筛掉「setState 是异步的」这种半对半错的表述——真正的答案是调度而非异步。",
            depth: 2,
            a: "setState 不改状态，只把 update 入队并标记组件待更新，状态在「下一次渲染」时才生效——它是同步调用、异步生效的调度行为，不是 Promise 那种异步 API。要基于最新值连续更新用函数式写法 setCount(c => c + 1)；要拿到「渲染后」的时机用 useEffect（依赖该状态）或 flushSync 强制同步刷新后再读。",
            bonus:
              "类组件的 setState 第二参数（回调）与函数组件 useEffect 都是把动作推迟到 commit 之后——两者时机一致，都发生在 DOM 更新完成后。",
          },
          {
            q: "一个点击里连续三次 setState，为什么只渲染一次？批处理在 React 18 的边界在哪？",
            intent:
              "考批处理的实现层——能说出「合并为一次渲染 + 18 扩大了范围 + flushSync 逃生舱」才算完整。",
            depth: 3,
            a: "每次 setState 只产生 update 入队 + 标记，渲染由调度器统一触发：事件处理跑完后调度器处理积压的全部 update，一次 render 消化三份数据。React 18 的 createRoot 把批处理从「事件函数内」扩展到 setTimeout、Promise、原生事件等一切场景；需要立刻刷出 DOM 时用 flushSync 包裹，它会打断批处理同步渲染。",
            bonus:
              "旧版 ReactDOM.render（legacy 模式）保留旧批处理行为——迁移 18 后行为差异常出现在 setTimeout 里的渲染次数变化上。",
          },
          {
            q: "Hooks 为什么不能写在 if/循环里？违反了会怎样？",
            intent:
              "考 Hooks 的存储结构——答出「链表顺序」说明理解实现，只答「规范如此」说明只会用。",
            depth: 3,
            a: "函数组件的 Hook 状态存在 Fiber 节点的 memoizedState 链表上，React 按「调用顺序」对号入座：第 1 个 useState 对链表第 1 个节点。放进 if 里，某次渲染少调用一个 Hook，链表整体错位——第 2 个 useState 读到了第 1 个的状态，轻则数据串位，重则直接抛错。这就是 eslint-plugin-react-hooks 那条规则存在的全部理由。",
            bonus:
              "推论题：同一个组件渲染出的 Hooks 数量与顺序必须恒定——所以「条件渲染 Hook」的正确姿势是把条件写进 Hook 的参数里（如 useState(cond ? a : b)），而不是条件执行 Hook 本身。",
          },
          {
            q: "key 为什么不能用 index？具体怎么错位？什么时候用 index 无害？",
            intent: "考 diff 对账机制——能推演出「删除头部后哪个节点复用了谁的 DOM」才算真懂。",
            depth: 4,
            a: "diff 按 key 对账：key 相同且类型相同就复用节点（连 DOM 与内部状态一起）。key 用 index 时，删除头部元素后，后面所有元素 key 集体前移——React 认为「key 0 还是 key 0」，把原第二个元素的节点复用给了新第一个元素：非受控输入残留旧值、CSS 过渡串位、动画重放。本质是身份错认。纯静态、渲染后不再增删排序的只读列表，index 无害。",
            bonus:
              "key 还参与「移动判定」：正确 key 让 React 对旧列表做最长递增子序列优化，只移动必要节点——所以 key 不稳定不只是状态错位，还可能让 diff 退化为大量重建。",
          },
          {
            q: "Fiber 的「可中断」中断在哪、怎么恢复？双缓存解决什么问题？",
            intent:
              "压轴题，把架构串成一条线——lane、shouldYield、双缓存交换一个都少不了，答不全就是背的。",
            depth: 5,
            a: "中断发生在 render 阶段（beginWork/completeWork 的纯计算），每个工作单元处理完都会问 Scheduler 的 shouldYield：有更高优先级的更新或帧时间用尽就让出主线程；进度保存在 workInProgress Fiber 树上，恢复时沿链表继续。commit 阶段同步不可中断——DOM 不能改一半给用户看。双缓存解决「中断期间的现场保存」：current 树维持屏幕可用，workInProgress 树承载半成品，render 完成 commit 时一次性交换指针；若 render 被高优先级打断作废，直接丢弃 workInProgress 重来，屏幕不受影响。",
            bonus:
              "优先级模型从旧版 expirationTime 演进为 lane 位图：用位运算表达「并发特征」（如 transition 范畴），useTransition 正是把更新标进 transition lane，让 diff 可被更高优先级插队。",
          },
        ]}
      />

      <Heading level={2} title="写在最后" />
      <Paragraph>
        这篇是整合视角；站内已有多篇对应的深挖笔记——「Hooks 原理」拆 memoizedState
        链表与更新机制，「协调与 Diff」逐场景推演对账算法。再往后两个自然延伸：React 19 的 Actions
        与编译器（React Compiler 自动记忆化，正在改写「手写
        memo」这一节的价值），以及服务端组件（RSC）对「渲染发生在哪」的重定义。
      </Paragraph>
    </NoteShell>
  );
}
