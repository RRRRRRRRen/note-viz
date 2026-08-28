import { Conclusion, NoteShell, Prose, QAChain, Section, Subsection } from "@/components/note";
import {
  BarChart,
  CompareTable,
  DoDont,
  MemoryCard,
  OutputTimeline,
  Timeline,
} from "@/components/viz";
import { FlowChart } from "@/components/demo/FlowChart";
import { PlayGround } from "@/components/demo/PlayGround";
import EventLoopSimulator from "./EventLoopSimulator";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        JS 是单线程的：代码在调用栈上执行，栈空是事件循环推进的唯一信号。 每轮循环的顺序固定——
        <strong>执行一个宏任务 → 清空全部微任务 → （可能）渲染 → 取下一个宏任务</strong>。
        微任务（Promise.then、queueMicrotask、await 之后的代码）永远先于下一个宏任务执行；
        setTimeout 延时 0 只是"下一轮宏任务"，不代表立即执行。
      </Conclusion>

      <Section title="一个生活化的类比">
        <Prose>
          <p>
            把 JS 引擎想成<strong>一个只有一位厨师的小餐馆</strong>：
          </p>
          <p>
            <strong>调用栈</strong> = 厨师手上正在做的菜，一次只能做一道，做完才腾手。
          </p>
          <p>
            <strong>宏任务队列</strong> = 前台接的单子（点单、催单、退单）。厨师的原则是：
            "单子先放着，我做完手上这道再看。"
          </p>
          <p>
            <strong>微任务队列</strong> = 客人对<strong>当前这道菜</strong>的补充要求："不要香菜！"
            ——厨师做完手上这道，必须<strong>立刻、全部</strong>
            处理完这些补充，才能去前台拿下一张单子。
          </p>
          <p>
            这解释了核心问题：为什么 <code>Promise.then</code>（补话）总是赶在下一个{" "}
            <code>setTimeout</code>（新单子）之前——补话不需要排队，新单子必须等下一轮。
          </p>
        </Prose>
      </Section>

      <Section title="逐层拆解">
        <Subsection title="调用栈：一切的前提">
          <Prose>
            <p>
              函数每次调用都会压入一个栈帧，返回时弹出，后进先出。嵌套调用栈会变深，同步代码
              <strong>只有栈真正清空</strong>，事件循环才有机会介入——这是理解一切输出题的前提。
            </p>
          </Prose>
        </Subsection>
        <Subsection title="微任务：本轮的收尾工作">
          <Prose>
            <p>
              来源：Promise.then/catch/finally、queueMicrotask、await 之后的代码、
              MutationObserver（浏览器）。清空规则是<strong>立即、全部、递归</strong>
              ——执行微任务过程中新产生的微任务，也在<strong>本轮</strong>处理完，绝不留到下一轮。
            </p>
          </Prose>
        </Subsection>
        <Subsection title="宏任务：每轮只取一个">
          <Prose>
            <p>
              来源：setTimeout/setInterval、I/O 回调、UI 事件、setImmediate（Node）。
              与微任务的"全清"不同，宏任务<strong>每轮只取一个</strong>
              ，执行完立刻回去清微任务——这个不对称是渲染不被饿死的关键。
            </p>
          </Prose>
        </Subsection>
        <Subsection title="渲染时机：不是每轮都渲染">
          <Prose>
            <p>
              渲染检查在微任务清空之后进行，浏览器根据刷新节奏决定本轮是否真的渲染；
              requestAnimationFrame 回调在渲染前执行。连续多个宏任务之间可能一次渲染都不发生。
            </p>
          </Prose>
        </Subsection>
      </Section>

      <Section title="一轮事件循环的完整时序">
        <Timeline
          steps={[
            { label: "执行宏任务", sub: "同步代码入栈出栈", color: "#f59e0b" },
            { label: "栈清空", sub: "推进信号", color: "#f59e0b" },
            { label: "清空微任务", sub: "全部·递归", color: "#8b5cf6" },
            { label: "渲染检查", sub: "可能跳过", color: "#10b981" },
            { label: "取下一个宏任务", sub: "只取一个", color: "#3b82f6" },
          ]}
        />
        <MemoryCard keyword="微任务永远插队">
          微任务不是"优先级高的宏任务"，而是绑定在<strong>本轮</strong>的收尾工作：
          每个宏任务执行完，都要先把微任务队列<strong>彻底清空</strong>
          ，才可能进入渲染或下一个宏任务。
        </MemoryCard>
      </Section>

      <Section title="动手验证：经典输出题">
        <Prose>
          <p>先自己推一遍输出，再运行对照。下面的代码可以直接修改做实验：</p>
        </Prose>
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
// 真实输出（Node 22 验证）：
// 1 → executor 同步执行 → 2 → 3 → A → B`}
        />
        <OutputTimeline
          steps={[
            {
              output: "1",
              phase: "同步",
              why: "脚本第一条语句，直接进调用栈执行，没有任何等待。",
            },
            {
              output: "executor 同步执行",
              phase: "同步",
              why: "new Promise(executor) 的 executor 是同步立即调用的——这是规范规定，很多人误以为它是异步的。",
            },
            {
              output: "2",
              phase: "同步",
              why: "同步代码还没跑完，调用栈非空。此时 .then 和两个 setTimeout 都只是入队等待。",
            },
            {
              output: "3",
              phase: "微任务",
              why: "栈清空后立即清空微任务队列——.then 的回调在此执行。它排在 A、B 之前，因为微任务永远先于下一个宏任务。",
            },
            {
              output: "A",
              phase: "宏任务",
              why: "微任务清空后才取第一个宏任务。setTimeout(...,0) 的 0ms 不代表立即执行，只是『下一轮』。",
            },
            {
              output: "B",
              phase: "宏任务",
              why: "A 执行完 → 栈清空 → 微任务队列是空的 → 取下一个宏任务。每轮只取一个，所以 A、B 分属两轮。",
            },
          ]}
        />
      </Section>

      <Section title="微任务 vs 宏任务：一张表分清">
        <CompareTable
          left={{
            title: "微任务 Microtask",
            color: "#8b5cf6",
            points: [
              "Promise.then / catch / finally",
              "queueMicrotask()、await 之后的代码",
              "MutationObserver（浏览器）",
              "本轮全部清空，递归处理新微任务",
              "典型场景：状态变化的即时后续处理",
            ],
          }}
          right={{
            title: "宏任务 Macrotask",
            color: "#3b82f6",
            points: [
              "setTimeout / setInterval",
              "I/O 回调、UI 事件",
              "setImmediate（Node）、MessageChannel",
              "每轮只取 1 个，执行完再清微任务",
              "典型场景：大块工作切片，给渲染让路",
            ],
          }}
        />
        <MemoryCard keyword="setTimeout(fn, 0) ≠ 立即执行" color="#d29922">
          延时 0 只表示"下一轮宏任务"。当前调用栈不清空、微任务不清完，它永远排不上。
        </MemoryCard>
      </Section>

      <Section title="为什么这样设计：调度成本">
        <Prose>
          <p>
            "宏任务后清微任务、每轮只取一个"的设计，本质是在<strong>响应及时性</strong>与{" "}
            <strong>渲染不被打断</strong>之间取平衡。下面是同一台机器上的相对量级
            （仅供建立直觉，不必背数字）：
          </p>
        </Prose>
        <BarChart
          title="相对开销量级（越大越应避免出现在高频路径）"
          items={[
            { label: "读内存变量", value: 1, color: "#3fb950" },
            { label: "微任务调度", value: 3, color: "#8b5cf6" },
            { label: "setTimeout ≥4ms", value: 40, color: "#3b82f6" },
            { label: "强制重排 reflow", value: 300, color: "#d29922" },
          ]}
        />
        <Prose>
          <p>
            两个可验证的事实支撑这张图：<code>setTimeout</code> 嵌套调用超过 5 层后被强制提升到 4ms
            下限（HTML 规范为防饿死而设）； 一次强制 reflow
            的开销可达数万次微任务调度。事件循环把渲染夹在宏任务之间，
            就是为了让昂贵的渲染按节奏进行，而不是被高频回调拖着跑。
          </p>
        </Prose>
      </Section>

      <Section title="交互模拟器">
        <Prose>
          <p>单步或播放，观察调用栈、微任务、宏任务三个队列如何随每一步流转：</p>
        </Prose>
        <EventLoopSimulator />
      </Section>

      <Section title="事件循环全景图">
        <EventLoopFlow />
      </Section>

      <Section title="边界与陷阱">
        <Subsection title="循环里的异步回调（var 与 let）">
          <DoDont
            dont={{
              code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// 输出: 3, 3, 3
// var 只有一个绑定，回调执行时循环已结束`,
              note: "三个回调共享同一个 i",
            }}
            do={{
              code: `for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// 输出: 0, 1, 2
// let 每轮迭代创建一个新绑定`,
              note: "每轮独立绑定，各自记住当轮的值",
            }}
          />
        </Subsection>
        <Subsection title="微任务无限递归卡死页面">
          <DoDont
            dont={{
              code: `function loop() {
  queueMicrotask(loop); // 微任务里无限产生微任务
}
loop();
// 结果: 渲染与宏任务永远无法执行，页面假死`,
              note: "没有栈溢出报错——每次微任务执行时栈是空的",
            }}
            do={{
              code: `function loop() {
  setTimeout(loop, 0); // 改用宏任务切片
}
loop();
// 结果: 每轮之间有机会渲染，页面保持可交互`,
              note: "宏任务每轮只取一个，渲染得以插入",
            }}
          />
        </Subsection>
        <Subsection title="在微任务里做重活阻塞渲染">
          <DoDont
            dont={{
              code: `// 把 10 万条数据处理塞进一个 .then
data.reduce((p, item) => p.then(() => heavy(item)),
  Promise.resolve());
// 全部算完才可能渲染一次`,
              note: "微任务递归期间渲染被持续推迟",
            }}
            do={{
              code: `// 分片：每处理一批就让出控制权
async function batch(items) {
  for (let i = 0; i < items.length; i += 100) {
    items.slice(i, i + 100).forEach(heavy);
    await new Promise(r => setTimeout(r)); // 让出给渲染
  }
}`,
              note: "每批之间插入宏任务边界，渲染可介入",
            }}
          />
        </Subsection>
      </Section>

      <Section title="经典追问链">
        <Prose>
          <p>模拟一场真实面试的连环追问——从热身到硬核，每一问都建立在前一问的回答之上：</p>
        </Prose>
        <QAChain
          items={[
            {
              q: "JS 为什么是单线程的？单线程岂不是浪费多核？",
              depth: 1,
              intent: "热身。确认你理解设计动机，而不是背一句'JS 是单线程的'就没了。",
              a: "最初的设计动机是 DOM：如果多个线程同时修改同一个节点，就必须引入锁机制，语言和引擎复杂度会陡增。所以 UI 线程与 JS 线程合一，用事件循环做异步调度来弥补单线程无法并行的短板（这也正是本篇事件循环存在的意义）。",
              bonus:
                "CPU 密集任务可以交给 Web Worker——它跑在独立线程，但不能操作 DOM，与主线程只通过消息通信。所以'单线程'准确说是指主执行线程。",
            },
            {
              q: "那一段脚本从执行到结束，事件循环具体怎么走？",
              depth: 2,
              intent:
                "考察整体心智模型是否清晰，能否主动说出'清空微任务'这个关键步骤，而不是被追问才想起来。",
              a: "四步循环：① 执行当前宏任务（脚本本身也是第一个宏任务）；② 调用栈清空后，立即清空整个微任务队列；③ 浏览器判断本轮是否渲染，需要则先执行 rAF 回调再绘制；④ 取下一个宏任务，回到第①步。微任务'全清'与宏任务'取一'的不对称，保证了渲染有机会插入。",
              bonus:
                "第②步和第③步之间还有 update-the-rendering 规范步骤（处理 resize/scroll 事件、执行 rAF、计算样式、布局、绘制），rAF 准确说是这一步里的回调而非宏任务。",
            },
            {
              q: "await 下面的代码和 .then 的回调，执行时机有区别吗？",
              depth: 3,
              intent:
                "区分背题者与理解者：await 常被当成'特殊的东西'，实际上它就是微任务机制的语法糖。",
              a: "没有本质区别。await 右侧的表达式会同步求值，随后函数在 await 处挂起，剩余代码被包装成微任务入队——语义上等价于 .then 的回调，严格按入队顺序执行。",
              bonus:
                "底层实现上，await 曾被编译为 generator + promise 链，V8 后来优化为直接挂起恢复（零 promise 分配）。工程上要知道：每多一层 await 就多一次微任务往返，循环里大量 await 会有可测的调度开销。",
            },
            {
              q: "setTimeout(fn, 0) 和 requestAnimationFrame(fn) 谁先执行？",
              depth: 4,
              intent:
                "大量候选人背了'宏任务 → 渲染'就断定 setTimeout 永远先跑。考察是否真正理解渲染时机的不确定性。",
              a: "不一定，无法保证固定顺序。rAF 在『渲染前』执行，但渲染只发生在浏览器认为需要的帧：页面在后台标签时根本不渲染，rAF 会一直推迟；反之若本轮恰有渲染计划，rAF 可能先于下一个 setTimeout。",
              bonus:
                "严谨的说法是 rAF 回调运行在 update-the-rendering 步骤中，与显示器刷新率对齐（60Hz 屏约每 16.7ms 一次机会）。这正是动画推荐用 rAF 而非 setTimeout(16) 的原因——后者既不与渲染同步，还会被 4ms 下限拖累。",
            },
            {
              q: "如果微任务里无限递归地产生新微任务，会发生什么？",
              depth: 5,
              intent:
                "区分知识广度与工程深度：是否理解事件循环被卡死的机理、生产环境是否踩过类似坑。",
              a: "事件循环被卡死在微任务阶段：渲染永远不会发生、宏任务全部饿死，页面表现为完全无响应——但不会有栈溢出报错，因为每次微任务执行时调用栈早已清空，内存也不会立刻爆。这是个'安静'的假死，比崩溃更难排查。规避方式是把大批量工作切成宏任务（setTimeout / MessageChannel），给渲染和宏任务留出执行窗口。",
              bonus:
                "实测感受量级：在 Node 22 里让 20 万个微任务互相衔接，紧随其后的 setTimeout 被推迟约 6ms——微任务本身极快，但无限递归就是无限快地卡死。另外 Node 的 process.nextTick 有同样的风险且优先级更高，Node 专门设了 nextTickQueue 上限（约千级）作为警戒线。",
            },
          ]}
        />
      </Section>

      <Section title="延伸阅读">
        <Prose>
          <p>
            微任务机制是理解 <code>await</code> 时序的基础——闭包如何捕获每次渲染/每次调用状态， 以及
            Node 流的背压控制，都建立在"谁先谁后"的调度直觉上。
            下一步建议阅读「闭包」与「作用域与上下文」知识面，把同步世界与异步世界串成完整链路。
          </p>
        </Prose>
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
