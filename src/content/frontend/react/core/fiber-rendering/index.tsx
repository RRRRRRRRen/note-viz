import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo/FlowChart";
import {
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  StateFlow,
  Timeline,
  VersionNote,
} from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        因为 Fiber 把「渲染」从一次不可拆的<strong>递归调用</strong>
        ，改写成沿链表逐个处理的<strong>工作单元</strong>
        ：每处理完一个单元都有机会问一句「该不该让出主线程」，让更高优先级的更新插队。算到一半的现场存在
        workInProgress 树上，commit 之前随时可以<strong>丢弃重来</strong>；而真正改 DOM 的 commit
        阶段保持同步——用户永远看不到改到一半的界面。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "setState 之后 React 做了什么？",
            to: "/note/frontend/react/core/setstate-scheduling",
          },
        ]}
      >
        本篇假设你已经知道「setState
        只入队并请求渲染」——那渲染请求排队之后，渲染本身是怎么被切开的？这就是本篇要回答的下一问。
      </Prerequisite>

      <Heading level={2} title="旧架构的死结：递归栈停不下来" />
      <Paragraph>
        先看为什么以前做不到。旧架构里渲染一棵组件树是<strong>同步递归</strong>
        ：递归对应着真实的调用栈，栈帧一层压一层，中间没有任何暂停点——树越大，占死主线程的时间越长，期间的输入、动画、滚动全部阻塞。要可中断，就得能「停在这里，晚点从这继续」，而调用栈做不到：栈帧要么执行完、要么整个作废，没有中间态可言。
      </Paragraph>
      <Paragraph>
        Fiber 的解法是<strong>把调度权拿回自己手里</strong>：不再依赖语言调用栈，而是把组件树改写成
        React
        自己管理的链表结构——遍历进度存成数据，而不是存成栈帧。这和操作系统用时间片调度进程、协程把调用栈显式化是同构的思路：
        <strong>只有遍历状态是数据，才能随时保存、随时恢复</strong>
        。架构演进分了三步走：
      </Paragraph>
      <VersionNote
        label="架构演进 / reconciler versions"
        versions={[
          {
            range: "React 15-",
            text: "Stack Reconciler：递归对比 + 更新一气呵成，中途无法暂停",
            color: "#9ca3af",
          },
          {
            range: "React 16",
            text: "Fiber 架构重写协调器：链表化节点 + 可分片遍历（架构就绪，默认仍同步渲染）",
            color: "#1677ff",
          },
          {
            range: "React 18",
            text: "并发特性开放：useTransition / useDeferredValue（lane 的 API 出口）、自动批处理",
            color: "#3fb950",
          },
        ]}
        note="「架构就绪」到「特性可用」隔了两个大版本：可中断是能力，让谁中断、中断了怎么办是 18 才给齐的答案"
      />

      <Heading level={2} title="Fiber 链表：把树拍平成工作单元" />
      <Paragraph>
        每个组件对应一个 Fiber 节点，节点上挂着三个指针：<code>child</code>
        （第一个子节点）、<code>sibling</code>
        （下一个兄弟）、<code>return</code>
        （父节点）。为什么是这三个指针？因为它们让遍历可以<strong>随时停下来再接着走</strong>
        ：处理完一个节点，有 child 就下去，没有就找 sibling，兄弟用完沿 return
        回上去——任何一个时刻，只要记住「当前在哪个节点」，遍历就能精确续上。树形结构 + 三指针 =
        把递归 tree-walk 改写成带游标的迭代。
      </Paragraph>
      <Paragraph>
        引擎层面的对应物是两个函数：<code>beginWork</code>
        处理「进入节点」（调用组件函数、对比 props、产出子节点），
        <code>completeWork</code>
        处理「离开节点」（收集属性变更等副作用标记）。一个节点的 beginWork + completeWork 就是一个
        <strong>工作单元</strong>
        ，调度器以工作单元为粒度分配时间：每个单元做完都有一次「要不要继续」的检查点——这就是「可中断」在实现上的最小单位。
      </Paragraph>

      <Heading level={2} title="两阶段：render 可打断，commit 一步到位" />
      <Paragraph>
        可中断不等于随便中断——React 把一次更新切成责任完全不同的两段。<strong>render 阶段</strong>
        只做纯计算：调用组件函数、算 diff、在内存里构建新树，不碰任何真实
        DOM。既然是纯计算，就满足「重算 N
        次结果一样」——被打断、被废弃、从头再来，代价只是时间，不会产生任何可观察的副作用。
        <strong>commit 阶段</strong>则把 diff 结果一次性写入真实 DOM 并执行对应的生命周期与
        effects，全程同步不可中断——因为用户不能看到改到一半的界面。
      </Paragraph>
      <Paragraph>
        这个责任划分解释了一个日常现象：为什么 render 阶段（组件函数体内）禁止
        setState、禁止改外部状态，而 useEffect
        里随便你异步——前者的代码会被重放，后者的代码一生只跑一次。一次更新的完整时间线：
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

      <Heading level={2} title="双缓存与 lane：现场保存与插队规则" />
      <Paragraph>
        中断期间屏幕还要照常显示，算到一半的新树不能碰真实 DOM——所以 Fiber 架构是
        <strong>双缓存</strong>：屏幕对应 <code>current</code> 树，更新在内存里构建{" "}
        <code>workInProgress</code> 树，两棵树的对应节点用 <code>alternate</code> 指针互指。render
        完成后 commit 一次性交换，中断作废时直接丢掉
        workInProgress、屏幕不受影响。中断期间「旧界面照常可用」的底气就在这：current
        树从头到尾没被动过。
      </Paragraph>
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
      <Paragraph>
        那谁有资格插队？早期实现用
        expirationTime（一个过期时间戳），但它只能表达「多急」，表达不了「这一批更新属于可打断的过渡」这类
        <strong>并发特征</strong>。<code>lane</code>{" "}
        模型改用位图：每个优先级占一个比特位，可以精确组合与批量判定——lane 位图在{" "}
        <strong>React 17 已在内部落地</strong>
        ，React 18 通过 <code>useTransition</code> / <code>useDeferredValue</code> 开放出 API
        出口，把开发者自己的更新标进 transition
        lane——「可以慢，但别挡路」。把中断的完整生命周期画成状态机：
      </Paragraph>
      <StateFlow
        label="render 阶段的状态迁移 / interruptible render"
        direction="LR"
        states={[
          { id: "trigger", label: "触发更新", kind: "start", color: "#f59e0b" },
          { id: "rendering", label: "render 进行中", color: "#1677ff", desc: "纯计算 · 不碰 DOM" },
          { id: "yield", label: "让出（时间片用尽）", color: "#9ca3af" },
          { id: "discard", label: "作废重来", color: "#f85149", desc: "高优先级插入" },
          { id: "commit", label: "commit", kind: "terminal", color: "#3fb950" },
        ]}
        transitions={[
          { from: "trigger", to: "rendering", label: "调度取任务" },
          { from: "rendering", to: "yield", label: "shouldYield" },
          { from: "yield", to: "rendering", label: "新宏任务续跑", dashed: true },
          { from: "rendering", to: "discard", label: "更高优先级", color: "#f85149" },
          { from: "discard", to: "rendering", label: "基于新 state 重算", dashed: true },
          { from: "rendering", to: "commit", label: "render 完成 → 同步点" },
        ]}
      />

      <Heading level={2} title="整合应用：render 的工作量从哪省" />
      <Paragraph>
        render 阶段的工作量可以近似成「节点数 ×
        每节点计算量」，可中断只保证大任务不挡死主线程，省钱的正道是让任务本身变小。两条路线都落在
        render 的工作量上：<strong>削减节点</strong>（大列表虚拟化，只渲染可视区的几十行）与
        <strong>跳过无变化的重渲染</strong>（<code>memo</code> 包组件、
        <code>useMemo</code>/<code>useCallback</code> 稳定引用、列表用正确 key 让 diff
        精准移动）。React 的重渲染由<strong>引用比较</strong>
        驱动，所以「稳定引用」才成为一等公民；但记忆化不是免费的——每次都有比较成本，先 Profiler
        定位重渲染热点，再对热点动手。
      </Paragraph>
      <MemoryCard keyword="优化三板斧与使用时机" color="#3fb950">
        <strong>memo</strong>（组件级跳过渲染）+ <strong>useMemo/useCallback</strong>
        （稳定引用，喂给 memo 和依赖数组）+ <strong>正确 key</strong>
        （精准 diff）。先 Profiler 测量再动手；大列表上虚拟化，别只靠 memo 硬扛。
      </MemoryCard>
      <Paragraph>
        2025 年 10 月 React Compiler v1.0 发布（构建期自动记忆化，兼容 React
        17+，不需要改代码），正在改写「手写 memo」这一节的价值：编译器能自动完成大部分
        useMemo/useCallback，且覆盖 hook
        结构上无法手写的场景。但「先测量、再优化」的判断力依然值钱——工具接管的只是机械部分，什么时候该减少状态、该把状态搬到哪里，仍然是人的决策。
      </Paragraph>
      <Paragraph>
        同一条两阶段分界线上还站着一个常被误用的角色：<strong>错误边界</strong>
        。它只在渲染阶段兜底——子组件渲染抛错、生命周期抛错，会被最近的边界捕获并降级
        UI；事件处理器和异步回调里的错误它管不着，前者用 try/catch，后者各自捕获。分界思维和 Node
        里「中间件错误要显式 next(err)」同构：<strong>框架只兜它自己调用的代码</strong>。
      </Paragraph>

      <Heading level={2} title="边界与陷阱" />
      <Paragraph>
        两阶段模型推出三条硬边界：<strong>render 阶段必须纯</strong>
        （可能被打断重放、被 StrictMode 双执行）；<strong>事件闭包里的 state 是快照</strong>
        （await 之后世界可能已经变了）；<strong>commit 是同步点</strong>
        （中途插同步渲染等于在手术中间换刀）。三组对照：
      </Paragraph>
      <DoDont
        label="render 阶段纪律 / keep render pure"
        dont={{
          code: `function Search({ kw }: { kw: string }) {
  api.track(kw);                    // render 期发请求
  matchesRef.current = calc(kw);    // render 期写 ref
  inputRef.current?.focus();        // render 期读真实 DOM
  return <Matches rows={calc(kw)} />;`,
          note: "render 可能被打断重放、StrictMode 会跑两遍——副作用翻倍执行，ref 读到的可能是任意时刻的旧现场",
        }}
        do={{
          code: `function Search({ kw }: { kw: string }) {
  const rows = useMemo(() => calc(kw), [kw]);  // 纯计算留 render
  useEffect(() => {
    api.track(kw);                // 副作用进 effect：一生一次
    inputRef.current?.focus();    // 读写真实 DOM 也在 effect
  }, [kw]);
  return <Matches rows={rows} />;`,
          note: "「render 是纯计算」是可丢弃的前提：碰真实世界的操作全部移出组件函数体",
        }}
      />
      <DoDont
        label="await 之后的快照 / stale closure"
        dont={{
          code: `async function handleSave() {
  await api.save();
  if (count >= 3) return;   // 读的是点击那次渲染的闭包值
  setCount(count + 1);      // 同一个旧快照，可能覆盖新更新
}`,
          note: "await 之后组件可能已重渲染多次，闭包里的 count 还是旧的——事件处理器不是「当前值」的可靠来源",
        }}
        do={{
          code: `async function handleSave() {
  await api.save();
  setCount(c => c + 1);       // 函数式：基于队列里的最新值
}
// 「依最新值分支」的逻辑放 useEffect([count])，
// 或用 ref 持续同步最新值、await 后读 ref`,
          note: "跨过 await 的更新一律函数式；基于最新值的判断交给渲染后的 effect 或 ref",
        }}
      />
      <DoDont
        label="commit 期的同步渲染 / no flushSync in commit"
        dont={{
          code: `useLayoutEffect(() => {
  flushSync(() => setTip(measure(ref.current)));
  // commit 尚未结束又强制开一轮同步 render + commit
}, []);`,
          note: "在生命周期/commit 期调 flushSync：打断当前提交、级联渲染，开发模式直接警告，极端时死循环",
        }}
        do={{
          code: `useLayoutEffect(() => {
  setTip(measure(ref.current));  // 本就同步，无需 flushSync
}, []);
// flushSync 只在事件处理器顶层点状使用：
// 「必须立刻读更新后 DOM」的场景，用完即走`,
          note: "layoutEffect 里的更新本来就在 paint 前同步生效；flushSync 留给事件流程中的点状强制刷新",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "commit 阶段为什么不能中断？",
            intent: "热身题：考两阶段责任划分的设计动机，而不是背「render 可中断 commit 不可」。",
            depth: 2,
            a: "因为用户不能看到「改到一半的 DOM」。commit 要把 diff 结果一次性写入真实 DOM 并执行对应的生命周期与 effects，拆成两半，用户就会在某帧看到「文本更新了但列表还没渲染」的中间态。可中断的价值全在 render 的纯计算阶段——那里只算不改，重算没有可观察的代价。",
            bonus:
              "commit 过长的优化方向不是「可中断」而是「少 commit」：减少 DOM 操作、拆组件让每次 diff 更小。",
          },
          {
            q: "render 阶段被高优先级更新打断了，已经算了一半的 diff 去哪了？",
            intent:
              "考「可丢弃」的代价模型：能说出 workInProgress 作废重来、并解释为什么敢丢弃，才说明理解了纯函数约束。",
            depth: 3,
            a: "直接丢弃。半成品存在 workInProgress Fiber 树上，它与屏幕上的 current 树完全隔离——作废时屏幕不受任何影响，等高优先级更新处理完，React 基于最新 state 重新走一遍 render。敢这么做的前提是 render 阶段全部是纯计算：同样的输入永远算出同样的输出，重算不产生任何可观察副作用。",
            bonus:
              "这也解释了为什么 render 阶段禁止 setState、要求组件函数纯——StrictMode 双调用正是在开发期验证这个约束。",
          },
          {
            q: "React 怎么判断「该让出主线程了」？",
            intent:
              "考 Scheduler 的时间片机制：能说出帧预算与 MessageChannel 的，是看过实现或高质量资料的人。",
            depth: 4,
            a: "Scheduler 给每个宏任务时间片设了帧预算（约 5ms）：工作循环里每处理完一个 Fiber 单元就问一次 shouldYield——时间片用尽或有更高优先级更新插入，就停止当前工作循环、把控制权还给浏览器，剩余工作通过 MessageChannel 排一个新宏任务继续。对浏览器来说这是一段「会自己让路的长时间任务」；对 React 来说，遍历进度已经存在 workInProgress 树上，随时可续。",
            bonus:
              "用 MessageChannel 而不是 setTimeout(0)，是因为 setTimeout 有约 4ms 的嵌套下限，MessageChannel 的宏任务调度延迟更小也不产生多余计时器。",
          },
          {
            q: "useTransition 到底把更新标到了哪里？isPending 期间的「旧内容」是从哪来的？",
            intent: "考 lane 模型与用户可见行为的连线：把 API 对到调度层，才不算背 API。",
            depth: 4,
            a: "标进 transition 优先级的 lane。isPending 期间新内容在 render 阶段慢慢算，屏幕上的「旧内容」就是 current 树——它从未被替换，所以输入框不卡、列表照常响应，render 完成后 commit 一次性切换。期间若来了更高优先级的更新（比如往搜索框打字），render 可以被打断、按新优先级重排，这就是「并发特征」的含义：不是更快，而是可插队、可废弃。",
            bonus:
              "useDeferredValue 是同一机制的另一种封装：不标记更新本身，而是让「值的衍生计算」慢一拍，适合受控值驱动的过滤渲染。",
          },
          {
            q: "双缓存的两棵树在 commit 时怎么交换？alternate 指针扮演什么角色？",
            intent: "硬核收尾，把架构串成实现级的一条线——说不出指针交换，就还停留在示意图层面。",
            depth: 5,
            a: "每对对应节点通过 alternate 互指：current 节点指向 workInProgress 里的镜像，反之亦然，所以构建新树时能低成本复用旧节点的属性。render 完成后，commit 把 workInProgress 树的改动写入 DOM，再把 root 的 current 指针切到新树——交换只是「改一个根指针」，两棵树身份互换：原 workInProgress 升级为 current，旧 current 等下次更新时被复用为新的 workInProgress。",
            bonus:
              "commit 要执行的副作用在 render 末尾就已作为 flags 标记在 Fiber 节点上，commit 沿树收集并依序执行——这是 commit 能同步、一次到位的原因。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "用 index 做 key 为什么会状态错位？",
            to: "/note/frontend/react/reconcile/key-index-mismatch",
            description:
              "render 阶段最核心的算法就是 diff 对账：key 如何决定节点的复用、移动与重建。",
          },
          {
            title: "合成事件到底是什么：一套事件委托机制",
            to: "/note/frontend/react/core/synthetic-events",
            description:
              "事件优先级从哪来：click 为什么同步处理、scroll 为什么可打断——入口在事件系统。",
          },
        ]}
      />
    </NoteShell>
  );
}
