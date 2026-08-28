import { Conclusion, NoteShell, Prose, QAChain, Section, Subsection } from "@/components/note";
import { BarChart, CompareTable, MemoryCard, OutputTimeline, Timeline } from "@/components/viz";
import { FlowChart } from "@/components/demo/FlowChart";
import { PlayGround } from "@/components/demo/PlayGround";
import EventLoopSimulator from "./EventLoopSimulator";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        JS 单线程。同步代码在调用栈执行；栈清空后<strong>先清空全部微任务</strong>
        （Promise.then、queueMicrotask、MutationObserver），再取<strong>一个宏任务</strong>
        （setTimeout、I/O、UI 渲染等），如此循环。微任务优先级永远高于下一个宏任务。
      </Conclusion>

      <Section title="一个生活化的类比">
        <Prose>
          <p>
            把 JS 引擎想成<strong>一个只有一位厨师的小餐馆</strong>：
          </p>
          <p>
            <strong>调用栈</strong> = 厨师手上正在做的菜。他一次只能做一道，做完才腾手。
          </p>
          <p>
            <strong>宏任务队列</strong> =
            前台接的单子（点单、催单、退单）。厨师说："单子先放着，我做完手上这道再看。"
          </p>
          <p>
            <strong>微任务队列</strong> = 客人当场补的一句话："不要香菜！"——这是对
            <strong>当前这道菜</strong>的修改要求，厨师做完手上这道必须
            <strong>立刻全部处理完</strong>这些补充，才能去前台拿下一张单子。
          </p>
          <p>
            这就是为什么 <code>Promise.then</code>（微任务）总是赶在下一个 <code>setTimeout</code>
            （宏任务）之前：补话不用排队，新单子必须等下一轮。
          </p>
        </Prose>
      </Section>

      <Section title="逐段拆解">
        <Subsection title="调用栈（Call Stack）">
          <Prose>
            <p>函数调用形成栈帧，后进先出。栈空是事件循环推进的唯一信号。</p>
          </Prose>
        </Subsection>
        <Subsection title="微任务（Microtask）">
          <Prose>
            <p>
              Promise.then/catch/finally、queueMicrotask、await 之后的代码。当前宏任务结束后
              <strong>立即、全部、递归地</strong>
              清空——执行微任务过程中产生的新微任务也会在本轮处理。
            </p>
          </Prose>
        </Subsection>
        <Subsection title="宏任务（Macrotask）">
          <Prose>
            <p>
              setTimeout/setInterval、I/O、UI 事件。每轮循环只取<strong>一个</strong>
              ，执行完再次清微任务。
            </p>
          </Prose>
        </Subsection>
        <Subsection title="渲染时机">
          <Prose>
            <p>
              浏览器在每轮宏任务结束后、微任务清空后决定是否渲染（requestAnimationFrame
              在渲染前调用），并非每轮都渲染。
            </p>
          </Prose>
        </Subsection>
      </Section>

      <Section title="一轮事件循环的完整时序">
        <Timeline
          steps={[
            { label: "执行同步代码", sub: "调用栈运行", color: "#f59e0b" },
            { label: "栈清空", sub: "唯一推进信号", color: "#f59e0b" },
            { label: "清空微任务", sub: "全部·递归", color: "#8b5cf6" },
            { label: "渲染检查", sub: "可能跳过", color: "#10b981" },
            { label: "取 1 个宏任务", sub: "只取一个", color: "#3b82f6" },
            { label: "回到开头", sub: "循环往复", color: "#1677ff" },
          ]}
        />
        <MemoryCard keyword="微任务永远插队">
          每个宏任务执行完，都要先把微任务队列<strong>彻底清空</strong>才能进入下一阶段——
          微任务不是"优先级高的宏任务"，而是绑定在<strong>本轮</strong>的收尾工作。
        </MemoryCard>
      </Section>

      <Section title="动手验证：经典输出题">
        <p className="mb-2 text-sm text-muted">
          先自己推一遍输出顺序，再直接运行对照。下面的代码可以随意改动——加几个 setTimeout、嵌套一层
          Promise.then，验证你对该主题的所有猜想：
        </p>
        <PlayGround
          label="在线运行 / playground"
          code={`console.log(1);

new Promise((resolve) => {
  console.log("executor 同步执行");
  resolve();
}).then(() => console.log(3));

setTimeout(() => console.log("A"), 0);
setTimeout(() => console.log("B"), 0);

console.log(2);
// 真实输出：1 → executor 同步执行 → 2 → 3 → A → B`}
        />
        <p className="mb-1 text-sm text-muted">每一行输出的来历：</p>
        <OutputTimeline
          steps={[
            {
              output: "1",
              phase: "同步",
              why: "脚本开头的 console.log(1) 直接进调用栈执行，没有任何等待。",
            },
            {
              output: "executor 同步执行",
              phase: "同步",
              why: "new Promise(executor) 的 executor 是【同步】立即调用的——这是 Promise 规范的规定，不是异步回调。",
            },
            {
              output: "2",
              phase: "同步",
              why: "同步代码还没跑完，调用栈非空，此时 setTimeout 和 .then 都只是在排队，轮不到执行。",
            },
            {
              output: "3",
              phase: "微任务",
              why: "同步代码执行完，调用栈清空，引擎立即清空微任务队列——.then 的回调在这里执行。它在 A、B 之前，因为微任务先于下一个宏任务。",
            },
            {
              output: "A",
              phase: "宏任务",
              why: "微任务清空后才取第一个宏任务。setTimeout(...,0) 的 0ms 不代表立即执行，只是『下一轮』。",
            },
            {
              output: "B",
              phase: "宏任务",
              why: "A 执行完后，栈再次清空、微任务队列是空的，于是取下一个宏任务 B。每轮只取一个。",
            },
          ]}
        />
        <MemoryCard keyword="executor 是同步的；setTimeout(...,0) 只是『下一轮』">
          判断输出顺序只问两个问题：① 这段代码是同步、微任务还是宏任务？ ②
          当前轮次进行到哪一步了？两问一答，顺序自然出来。
        </MemoryCard>
      </Section>

      <Section title="微任务 vs 宏任务：一张图分清">
        <CompareTable
          left={{
            title: "微任务 Microtask",
            color: "#8b5cf6",
            points: [
              "Promise.then / catch / finally",
              "queueMicrotask()、await 之后的代码",
              "MutationObserver（浏览器）",
              "本轮全部清空，递归处理新微任务",
              "场景：状态变化的即时后续处理",
            ],
          }}
          right={{
            title: "宏任务 Macrotask",
            color: "#3b82f6",
            points: [
              "setTimeout / setInterval",
              "I/O、UI 事件回调",
              "setImmediate（Node）、MessageChannel",
              "每轮只取 1 个，执行完再清微任务",
              "场景：大块工作切片，给渲染让路",
            ],
          }}
        />
        <MemoryCard keyword="setTimeout(fn, 0) ≠ 立即执行" color="#d29922">
          延时 0 只表示"下一轮宏任务"。当前栈不清空、微任务不清完，它永远排不上。
        </MemoryCard>
      </Section>

      <Section title="执行开销参考">
        <p className="mb-1 text-sm text-muted">
          为什么规范要把渲染放在宏任务之后、且每轮只取一个宏任务？给一层抽象成本做参考
          （同一台机器上的相对量级，仅供直觉建立，不要背具体数字）：
        </p>
        <BarChart
          title="相对开销量级（越大越该避免在高频路径出现）"
          items={[
            { label: "读内存变量", value: 1, color: "#3fb950" },
            { label: "微任务调度", value: 3, color: "#8b5cf6" },
            { label: "setTimeout ≥4ms", value: 40, color: "#3b82f6" },
            { label: "强制重排 reflow", value: 300, color: "#d29922" },
          ]}
        />
        <Prose>
          <p>
            浏览器为 <code>setTimeout</code> 设了 4ms 下限嵌套防饿死；而一次强制 reflow
            的代价可能抵得上数万次微任务调度——事件循环把渲染夹在中间，本质是在
            「及时响应」与「别频繁打断」之间做调度平衡。
          </p>
        </Prose>
      </Section>

      <Section title="交互模拟器">
        <p className="mb-2 text-sm text-muted">点击播放，观察三个队列如何随步骤流转：</p>
        <EventLoopSimulator />
      </Section>

      <Section title="事件循环全景图">
        <EventLoopFlow />
      </Section>

      <Section title="经典追问链">
        <p className="mb-2 text-sm text-muted">
          模拟一场真实面试的连环追问：从热身开始逐层深入，每一问标注面试官的考察意图与加分回答。
        </p>
        <QAChain
          items={[
            {
              q: "浏览器里 JS 是单线程的吗？为什么要这样设计？",
              depth: 1,
              intent: "热身题，确认你理解单线程的存在原因，而不是背一句'JS是单线程的'。",
              a: "是。设计动机是 DOM 操作：如果两个线程同时改同一个节点，就需要锁机制，语言复杂度陡增。所以 UI 线程与 JS 线程合一，用事件循环做异步调度来弥补'单线程不能并行'的短板。",
              bonus:
                "补充 Worker：CPU 密集任务可以用 Web Worker 开独立线程，但 Worker 不能操作 DOM，与主线程靠消息通信——单线程指的是主执行线程。",
            },
            {
              q: "说说一段脚本从执行到结束，事件循环是怎么走的？",
              depth: 2,
              intent: "考察你对整体流程是否有清晰的心智模型，能否讲出'清空微任务'这个关键步骤。",
              a: "先执行全局同步代码（调用栈）；栈清空后立即清空整个微任务队列；然后浏览器检查是否需要渲染（rAF 回调在渲染前执行）；最后取一个宏任务执行，回到开头循环。",
              bonus:
                "强调'每轮只取一个宏任务'与'微任务全部清空'的不对称性，并点出这正是渲染不被饿死的机制。",
            },
            {
              q: "await 下面的代码和 Promise.then 的回调，谁先执行？",
              depth: 3,
              intent: "区分背题者与理解者：await 是否被当成'特殊的东西'对待。",
              a: "没有区别，两者都是微任务。await 右侧表达式同步求值，函数在 await 处挂起，剩余代码被包装成微任务，等价于 .then 的回调，严格按入队顺序执行。",
              bonus:
                "能进一步指出 await 的实现是 generator/promise 的语法糖（V8 层面已优化为直接挂起），并说明 await 链每层都会引入一次微任务开销。",
            },
            {
              q: "setTimeout(fn, 0) 和 requestAnimationFrame 谁先执行？",
              depth: 4,
              intent:
                "很多人背了'宏任务→渲染'就以为 setTimeout 永远先跑。考察你是否真正理解渲染时机的不确定性。",
              a: "不一定。rAF 在'渲染前'执行，但渲染只发生在浏览器认为需要的帧。如果本轮事件循环没有渲染机会（如页面在后台标签、或两个宏任务间隔过短），rAF 会推迟到下一次渲染前，此时 setTimeout 先跑。",
              bonus:
                "能画出'宏任务 → 微任务 → 渲染检查 → 下一轮'的时序，并说明 rAF 的执行频率与显示器刷新率（如 60Hz/120Hz）挂钩。",
            },
            {
              q: "微任务里无限递归地产生微任务，会发生什么？怎么避免？",
              depth: 5,
              intent: "区分知识广度与工程深度：是否踩过坑、是否有系统层面的思考。",
              a: "事件循环被卡死在微任务阶段：渲染永远不会发生，宏任务全部饿死，页面表现为无响应但不崩溃（没有栈溢出错误，因为每次微任务执行完栈是空的）。经典事故是 queueMicrotask 里不断 queueMicrotask，或 Promise 链互相 resolve。规避手段：大批量任务改用宏任务切片（setTimeout/messageChannel 分批），或用 rAF 对齐渲染节奏。",
              bonus:
                "提到这是'活锁'而非'死锁'；能对比 Node.js 端 process.nextTick 的同类问题（nextTick 队列优先级更高，饿死后果更严重，Node 设有 nextTickQueue 上限警戒）。",
            },
          ]}
        />
      </Section>
    </NoteShell>
  );
}

function EventLoopFlow() {
  return (
    <FlowChart
      label="事件循环全景 / event loop"
      height={380}
      data={{
        direction: "TB",
        nodes: [
          { id: "sync", label: "执行同步代码（厨师做菜）", color: "#f59e0b" },
          { id: "micro", label: "清空微任务队列（处理补话）", color: "#8b5cf6" },
          { id: "render", label: "渲染检查（可选）rAF", color: "#10b981" },
          { id: "macro", label: "取 1 个宏任务（拿下一张单）", color: "#3b82f6" },
        ],
        edges: [
          { source: "sync", target: "micro", label: "栈清空" },
          { source: "micro", target: "render", label: "微任务清空" },
          { source: "render", target: "macro", label: "本轮无渲染则跳过", dashed: true },
          { source: "macro", target: "sync", label: "下一轮循环", dashed: true },
        ],
      }}
    />
  );
}
