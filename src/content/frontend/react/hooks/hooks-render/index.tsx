import { useState } from "react";
import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock, DemoButton, LogPanel, ResetButton } from "@/components/demo";
import { CrossRef, DoDont, Prerequisite, Timeline, VersionNote } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        只加一次不是 React「异步」或出了 bug，而是两件事叠加：三次 <code>setCount(count + 1)</code>{" "}
        捕获的是<strong>同一次渲染的旧快照</strong>
        （等于三次「把 state 替换成 1」），而 React 把这一轮的全部更新<strong>批处理</strong>
        成一次渲染。React 18 起<strong>自动批处理</strong>
        覆盖所有场景——事件处理器、setTimeout、Promise、原生事件里都默认合并；唯一的逃生舱是{" "}
        <code>flushSync</code>。想基于最新值连续更新，写函数式更新{" "}
        <code>setCount(c =&gt; c + 1)</code>。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "setState 之后 React 做了什么？",
            to: "/note/frontend/react/core/setstate-scheduling",
          },
        ]}
      >
        两篇视角互补：本篇讲你眼前能观察到的<strong>行为</strong>
        （为什么只加一次、什么时候才渲染）；那篇讲调用之后 React 内部的<strong>机制</strong>
        （update 入队、组件标记、调度器合并渲染请求）。
      </Prerequisite>

      <Heading level={2} title="批处理：一轮交互只付一次渲染的钱" />
      <Paragraph>
        批处理指「一轮交互里多次 setState 只触发一次渲染」。react.dev 的表述是：React
        会等你事件处理函数里的<strong>全部代码</strong>
        跑完，才开始处理积攒的状态更新。账很好算：渲染是贵操作——重新执行组件函数、diff 新旧树、
        commit 进真实 DOM；如果每次 setState 都立即渲染，一个事件里改 3 个状态就要付 3
        次全额渲染费，而中间那两次渲染用户根本看不到——还没上屏就被最后一次覆盖了。
      </Paragraph>
      <Paragraph>
        这个「先攒后消费」的模型和高普及度的技术参照是消息队列的批量消费：setState 像往队列
        <strong>投递消息</strong>
        ，渲染像下游消费者——成熟的消费者不会每收一条消息就重启一次流水线，而是攒一批一起处理。你在事件处理器里调用
        setState 的那一刻，改的只是队列，界面要等消费时机。所以「setState 之后立刻读 state
        还是旧值」不是 React 出 bug，而是<strong>请求已投递、批次还没开</strong>
        ——本篇后面所有反直觉现象都从这一句推出来。
      </Paragraph>
      <Timeline
        label="一次点击的时间线 / batching"
        steps={[
          { label: "click 触发", sub: "进入事件处理器", color: PALETTE.orange },
          { label: "setState × 3", sub: "只入队，不渲染", color: PALETTE.purple },
          { label: "事件处理结束", sub: "批次的消费时点", color: PALETTE.gray },
          { label: "一次 render + commit", sub: "重放队列 · 更新 DOM", color: PALETTE.blue },
          { label: "浏览器绘制", sub: "用户看到的只有结果", color: PALETTE.green },
        ]}
      />

      <Heading level={2} title="React 18 前后：批处理从事件系统移交给调度器" />
      <Paragraph>
        真正的版本分界在 React 18。此前批处理是<strong>事件系统</strong>
        的行为：只有 React 合成事件处理函数内才批——因为只有那里被 React 的合成事件包着。同一个
        setTimeout 回调里三连 set，每次 setState 都独立触发一次渲染；原生
        addEventListener、Promise.then 里同理。写惯了老版本的人会记得「定时器里 setState
        不批」这条经验，它到 17 为止都是对的。
      </Paragraph>
      <Paragraph>
        18 的 <code>createRoot</code> 把批处理升级为<strong>调度器</strong>
        的行为（官方称 automatic batching，据 React 18 发布公告）：任何场景默认合并——事件处理器、
        setTimeout、Promise、原生事件监听、甚至 async/await 的 await
        之后，全部攒进同一批。边界也保留了一条：批处理
        <strong>不跨多次有意事件</strong>
        ——第一次点击和第二次点击各自合并，不会攒到一起。这条边界是刻意设计的：它保证「第一次点击禁用表单，第二次点击就不会再提交」这类时序语义可预测。
      </Paragraph>
      <VersionNote
        label="批处理演进 / automatic batching"
        versions={[
          {
            range: "React 17-",
            text: "只在合成事件处理函数内批；setTimeout / Promise / 原生监听里逐次渲染",
            color: PALETTE.gray,
          },
          {
            range: "React 18+",
            text: "createRoot 后全场景自动批处理；逃生舱 flushSync；不跨多次有意事件",
            color: PALETTE.green,
          },
        ]}
        note="变化的是「谁负责批」：从事件系统的附属行为，升级为调度器的默认行为"
      />

      <Heading level={2} title="面试最爱：连续 setState" />
      <Paragraph>
        现象人人背得出来，机制才是考点。关键在<strong>闭包快照</strong>
        ：组件函数每次渲染是一次独立调用，本次渲染里的 <code>count</code>{" "}
        是不可变快照——这三次调用捕获的是同一个 <code>0</code>
        。而队列重放时，值更新是「直接替换」：三份 <code>count + 1</code> 算出来都是 <code>1</code>
        ，替换三次结果还是 <code>1</code>。
      </Paragraph>
      <CodeBlock
        lang="typescript"
        code={`function handle() {
  setCount(count + 1);   // 队列：[替换为 1]          —— count 是本次渲染的快照 0
  setCount(count + 1);   // 队列：[替换为 1, 替换为 1] —— 闭包里的 count 还是 0
  setCount(count + 1);   // 还是「替换为 1」          —— 三份闭包捕获同一个 0
  // 渲染时重放队列：三次直接替换，结果仍是 1 —— 只 +1

  setCount(c => c + 1);  // 队列存操作：基于前值 +1
  setCount(c => c + 1);  // 1 → 2
  setCount(c => c + 1);  // 2 → 3
  // 渲染时重放队列：0 → 1 → 2 → 3 —— +3
}`}
      />
      <Paragraph>
        两种写法的本质区别是<strong>队列里存「目标值」还是「操作」</strong>
        。值写法存目标值，重复执行多少次结果都一样，所以合并成一次；函数写法存操作，重放时从当前
        state
        出发依次计算，每一步吃上一步的返回值。函数式更新解决的就是「本次更新依赖上一次更新结果」这个问题——它把对最新值的依赖从
        <strong>闭包</strong>（渲染那一刻已冻结）转移到<strong>队列</strong>
        （渲染那一刻才重放），这就是「基于前值计算」四个字的全部含义。
      </Paragraph>
      <Paragraph>
        读值口径也要对齐：在 setState 之后紧跟 <code>console.log(count)</code>
        ，打印的同样是旧快照（Chrome 实测一致）——<code>count</code> 这个绑定要等组件函数带着新 state
        重新执行才会变。十八批处理之下，上面六次 setState 无论哪种写法都只触发一次渲染，「+1 还是
        +3」的差别全部来自队列重放，与渲染次数无关。
      </Paragraph>

      <Heading level={2} title="交互演示" />
      <Paragraph>
        下面两个按钮各点一次，盯住两个数字：<strong>count</strong>（状态值）和
        <strong>渲染次数</strong>（组件真正重新执行的次数，每渲染一次才
        +1）。左按钮是值写法三连，右按钮是函数式三连。
      </Paragraph>
      <Paragraph>
        预期结果：左按钮点完 count 只 +1、渲染次数 +1——三次 setState
        被合并成一次渲染，而且队列里三份 「替换为 1」重放后还是 1；右按钮点完 count +3、渲染次数
        <strong>同样只 +1</strong>
        。这组对照正好把两件事拆开：<strong>渲染几次由批处理决定</strong>（两种写法都只渲染一次），
        <strong>加几由队列里存的是值还是操作决定</strong>
        ——批处理和函数式更新是两个正交的机制，别再混着答。
      </Paragraph>
      <BatchDemo />

      <Heading level={2} title="边界与陷阱" />
      <Paragraph>
        使用者视角的三个高频坑，全部能用「快照 + 队列 + 批处理」三个词推出后果：绕过 setState
        直接赋值（React
        无感知）、依赖闭包旧值累加（只加一次）、事件外期待立即读到新值（批次还没消费）。逐组对照：
      </Paragraph>
      <DoDont
        label="更新入口 / state update"
        dont={{
          code: `count = count + 1;   // 改的只是本次渲染的局部常量
// React 完全无感知：不入队、不标记、不渲染`,
          note: "state 是本次渲染的快照，直接赋值绕过了队列——React 只认 setState 发起的渲染请求",
        }}
        do={{
          code: `setCount(count + 1);   // 入队 + 标记待更新
// 本轮事件结束后统一渲染一次`,
          note: "唯一合法的更新入口：setState 把 update 放进队列并请求一次渲染",
        }}
      />
      <DoDont
        label="连续累加 / series update"
        dont={{
          code: `setCount(count + 1);
setCount(count + 1);   // 三份闭包都是旧快照
setCount(count + 1);   // 三次「替换为 1」→ 只 +1`,
          note: "值写法存的是目标值：三份 count + 1 用同一个旧快照算出同一个 1",
        }}
        do={{
          code: `setCount(c => c + 1);
setCount(c => c + 1);   // 队列存操作，渲染时依次重放
setCount(c => c + 1);   // 0 → 1 → 2 → 3 → +3`,
          note: "更新依赖上一次结果时用函数式更新：把对最新值的依赖从闭包转移到队列重放",
        }}
      />
      <DoDont
        label="事件外读值 / async read"
        dont={{
          code: `setTimeout(() => {
  setCount(count + 1);
  console.log(count);      // 还是旧值！
  if (count + 1 >= 3) stop(); // 拿旧快照判断，逻辑错位
}, 1000);`,
          note: "React 18 后定时器里同样批处理：setState 后的下一行读到的仍是本次渲染的旧快照",
        }}
        do={{
          code: `setTimeout(() => {
  setCount(c => c + 1);      // 基于最新值算，逻辑进 updater
}, 1000);

// 基于「渲染完成」做副作用：声明依赖
useEffect(() => {
  if (count >= 3) stop();
}, [count]);`,
          note: "要最新值就用函数式更新；要在渲染后处理就用 useEffect 监听依赖——确实需要同步读更新后 DOM 的极端场景才动用 flushSync",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "setState 之后立刻 console.log(count)，为什么拿到的是旧值？",
            intent:
              "热身题，筛掉「setState 是异步的」这种含糊表述——两层原因（闭包快照、批次未消费）答全才算过关。",
            depth: 2,
            a: "因为本次渲染的 count 是不可变快照，而你的更新刚入队、批处理还没消费——状态要等本轮事件结束后的那次渲染，组件函数带着新值重新执行才有新值。所以「读未来的值」不该读变量：基于最新值做计算用函数式更新 setCount(c => c + 1)，在渲染完成后做处理用 useEffect 监听对应依赖。",
            bonus:
              "严格表述是「同步调用、异步生效」：异步的不是 API，而是生效时机——这是调度行为，与 Promise 的异步是两回事。",
          },
          {
            q: "setCount(c => c + 1) 到底解决了什么问题？值写法和函数写法在队列里存的东西差在哪？",
            intent:
              "考批处理的实现层：答出「队列存目标值 vs 存操作」才算懂机制，只答「避免闭包陷阱」停在现象。",
            depth: 3,
            a: "函数式更新解决「本次更新依赖上一次更新结果」的问题。值写法在队列里存目标值——重放等于反复替换，执行三次「替换为 1」结果还是 1；函数写法存操作——渲染期从当前 state 出发依次重放，0 → 1 → 2 → 3。本质是把「对最新值的依赖」从闭包（渲染那一刻已冻结）转移到队列（渲染那一刻才重放）。",
            bonus:
              "react.dev 的课后练习 getFinalState 就是重放算法本体：typeof update === 'function' ? update(state) : update，值得亲手写一遍。",
          },
          {
            q: "React 18 的自动批处理有没有覆盖不到的场景？",
            intent:
              "考边界完整性：说出 flushSync 和「不跨多次有意事件」两个例外，才算把 18 的行为地图背全。",
            depth: 3,
            a: "常规代码路径全覆盖，例外只有两类。一是 flushSync 包裹的更新：跳过合并、立即同步渲染；二是批处理不跨「多次有意事件」——第一次 click 和第二次 click 各自成批，保证「第一下禁用表单、第二下就不会再提交」的时序可预测。除此之外 setTimeout、Promise.then、await 之后、原生 addEventListener 里的更新，18 后默认全部合并。",
            bonus:
              "「setTimeout 里不批」是 React 17 及以前的经验，到 18 为止失效——面试里拿它当 18 的行为答，暴露的是版本认知过期。",
          },
          {
            q: "flushSync 的代价是什么？什么场景才配用它？",
            intent: "考逃生舱的使用纪律：知道 API 不算数，说出代价与正当场景才是能做技术决策的人。",
            depth: 4,
            a: "每次调用都打断批处理、强制一次同步的完整渲染（render + commit 立刻走完），滥用等于手动退回 React 17 之前的渲染粒度。它唯一的正当场景是「必须立刻读到更新后的 DOM」：读完尺寸再决定布局、配合第三方动画库逐帧取值。在事件处理器里循环调用或放进生命周期，会把批处理优化亲手打穿，甚至引发级联重渲染。",
            bonus:
              "React 对「生命周期里调 flushSync」会在开发模式发出警告——同步刷渲染的时机点从 commit 中途穿过去，行为非常难推理。",
          },
          {
            q: "setState 的「异步生效」和微任务有关系吗？事件处理器和 await 之后的更新会合并成一次渲染吗？",
            intent:
              "压轴题，把批处理放到事件循环的坐标系里——分得清「谁排哪个队列、批次以什么为单位」的，是真理解了调度。",
            depth: 4,
            a: "与微任务机制无关，但微任务里的更新确实会赶上同一批。React 18 的渲染请求由自己的 Scheduler 消费（内部用 MessageChannel 排宏任务），消费点在本轮同步代码与微任务之后——所以事件处理器里 setState、随后 Promise.then / await 之后再 setState，两处更新会合并进同一次渲染；而跨宏任务（比如两个独立的 setTimeout 回调）就各自成批。批的单位是「渲染消费窗口」，不是「事件处理器函数」。",
            bonus:
              "这也解释了为什么 18 能把批处理从事件系统解耦：以渲染消费时机为准后，更新发生在什么上下文里根本不重要——调度器只看「渲染开始前还有没有新 update 进来」。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "useLayoutEffect 到底差在哪一帧？",
            to: "/note/frontend/react/hooks/effect-vs-layout-effect",
            description:
              "渲染完成不等于事情做完：effects 在 paint 前后两档执行时机，决定测量 DOM 会不会闪烁。",
          },
          {
            title: "Hook 为什么不能写在条件语句里？",
            to: "/note/frontend/react/hooks/hooks-order-rules",
            description:
              "本篇里 useState 背后的存储：Hook 状态按调用序挂在 Fiber 上，错位一次全线串号。",
          },
          {
            title: "Fiber 为什么能让渲染可中断？",
            to: "/note/frontend/react/core/fiber-rendering",
            description:
              "批处理排进去的那次渲染怎么走：render/commit 两阶段、双缓存与 lane 优先级。",
          },
        ]}
      />
    </NoteShell>
  );
}

function BatchDemo() {
  const [count, setCount] = useState(0);
  const [renderCount, setRenderCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addWrong = () => {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
    setLogs((l) => [...l, "值写法 ×3：三次「替换为旧值 +1」→ count 只 +1，渲染 +1 次"]);
    setRenderCount((r) => r + 1);
  };
  const addRight = () => {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setLogs((l) => [...l, "函数式 ×3：队列重放 0→1→2→3 → count +3，渲染同样只 +1 次"]);
    setRenderCount((r) => r + 1);
  };
  const reset = () => {
    setCount(0);
    setRenderCount(0);
    setLogs([]);
  };

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-surface px-4 py-2 text-xs font-medium text-muted">
        批处理演示：两种写法各点一次，对比 count 与渲染次数
      </div>
      <div className="p-4">
        <div className="mb-3 flex gap-2">
          <DemoButton onClick={addWrong}>setCount(count + 1) × 3</DemoButton>
          <DemoButton onClick={addRight} variant="outline">
            setCount(c =&gt; c + 1) × 3
          </DemoButton>
          <ResetButton onClick={reset} />
        </div>
        <div className="flex gap-4 text-sm">
          <span className="rounded-md border border-border px-3 py-1.5">
            count = <strong className="text-accent">{count}</strong>
          </span>
          <span className="rounded-md border border-border px-3 py-1.5">
            渲染次数 = <strong className="text-accent">{renderCount}</strong>
          </span>
        </div>
        <LogPanel
          logs={logs}
          placeholder="// 点击按钮：count 的变化看写法，渲染次数的变化看批处理"
        />
      </div>
    </div>
  );
}
