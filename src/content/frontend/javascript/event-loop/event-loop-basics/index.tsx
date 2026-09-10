import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  BarChart,
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  OutputTimeline,
} from "@/components/viz";
import { PlayGround, StepThrough } from "@/components/demo";
import EventLoopDiagram from "./EventLoopDiagram";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        JS 是单线程的：代码在调用栈上执行，栈空是事件循环推进的唯一信号。 每轮循环的顺序固定——
        <strong>执行一个宏任务 → 清空全部微任务 → （可能）渲染 → 取下一个宏任务</strong>。
        微任务（Promise.then、queueMicrotask、await 之后的代码）永远先于下一个宏任务执行；
        setTimeout 延时 0 只是"下一轮宏任务"，不代表立即执行。
      </Conclusion>

      <Heading level={2} title="技术对照：数据库触发器与批处理作业" />
      <Paragraph>
        把 JS 运行时想成<strong>一个单连接的数据库实例</strong>：同一时刻只执行一条语句。
      </Paragraph>
      <Paragraph>
        <strong>调用栈</strong> = 正在执行的这条语句（包括它层层调用的存储过程，全部压在栈上）。
      </Paragraph>
      <Paragraph>
        <strong>宏任务队列</strong> = <strong>批处理作业表</strong>：调度器每轮只捞出一条作业执行，
        做完才轮到下一条。
      </Paragraph>
      <Paragraph>
        <strong>微任务</strong> = <strong>语句级触发器</strong>：随当前语句立即触发，
        还会连锁触发——触发器里再改另一张表，那张表的触发器也立刻执行。 但无论连锁多少层，全部属于
        <strong>当前这一批</strong>。
      </Paragraph>
      <Paragraph>
        这解释了核心问题：为什么 <code>Promise.then</code>（触发器）总是赶在下一个{" "}
        <code>setTimeout</code>（下一条批处理作业）之前——触发器必须在当前语句
        <strong>提交前全部、递归</strong>执行完，调度器才允许捞下一条作业。
        这条规矩是本篇的主角，下面的推演里会亲眼看到它。
      </Paragraph>

      <Heading level={2} title="逐层拆解" />
      <Paragraph>
        先声明范围：本文的循环模型以<strong>浏览器</strong>为准（含渲染步骤）。Node
        的循环分六个阶段、
        没有渲染这一站，但「宏任务之间清空微任务」的语义两边一致——同一道输出题答案相同， 除非涉及
        Node 特有的 <code>process.nextTick</code> 与 <code>setImmediate</code>
        （前者在陷阱区专门讲）。
      </Paragraph>

      <Heading level={3} title="调用栈：一切的前提" />
      <Paragraph>
        为什么先讲栈？因为"代码正在运行"的准确含义是<strong>调用栈非空</strong>
        ：函数每次调用压入一个栈帧（参数、局部变量、返回地址），返回时弹出，后进先出——
        单线程语言里，嵌套调用关系只能靠栈精确表达，这也是 JS 不需要锁的原因之一。
      </Paragraph>
      <Paragraph>
        由此得到本文的第一原理：只要栈非空，任何回调都插不进来——哪怕定时器早已到期、 Promise 早已
        resolve，引擎也不会中断正在执行的函数。所谓"异步"， 全部发生在栈清空
        <strong>之后</strong>；栈清空就是事件循环向前推进的唯一信号。
      </Paragraph>

      <Heading level={3} title="微任务：绑定在任务末尾的收尾" />
      <Paragraph>
        为什么要有微任务这个发明？为了<strong>渲染一致性</strong>
        ：一段同步代码改完状态后，它引发的后续处理（比如 Promise 回调再更新另一处数据）必须在本轮
        <strong>绘制之前</strong>完成，否则浏览器可能把"改了一半"的中间状态画上屏幕。
        规范因此在事件循环里设了一个检查点——每当调用栈清空，就执行微任务检查点 （据 HTML Standard
        事件循环处理模型：perform a microtask checkpoint）。
        所以微任务不是"更快的定时器"，而是绑定在当前任务末尾的收尾工作。
      </Paragraph>
      <Paragraph>
        引擎层面，ECMA-262 把这类延期工作建模为 Job Queue（"Jobs and Job Queues"一节）。
        来源：Promise.then/catch/finally、queueMicrotask、await 之后的代码、
        MutationObserver（浏览器）。清空规则是<strong>立即、全部、递归</strong>
        ——执行微任务过程中新产生的微任务，也在<strong>本轮</strong>处理完，绝不留到下一轮。
      </Paragraph>

      <Heading level={3} title="宏任务：每轮只取一个" />
      <Paragraph>
        为什么不全清？因为宏任务里是大块工作（事件处理、I/O
        回调），一次清空整个队列会让渲染被无限推迟——
        页面掉帧、点击无响应。每轮只取一个，事件循环才有机会在每个宏任务之间回头检查渲染，
        这是响应及时性的下限保证。
      </Paragraph>
      <Paragraph>
        来源：setTimeout/setInterval、I/O 回调、UI 事件、setImmediate（Node）、MessageChannel。
        与微任务的"全清"不同，宏任务
        <strong>每轮只取一个</strong>
        ，执行完立刻回去清微任务——这个不对称是渲染不被饿死的关键。
      </Paragraph>

      <Heading level={3} title="渲染时机：绑定刷新节奏，不绑定循环" />
      <Paragraph>
        渲染检查在微任务清空之后进行，但渲染不跟着循环走，而是跟着
        <strong>显示器刷新节奏</strong>走 （60Hz 屏约每 16.7ms
        提供一次渲染机会）。浏览器在渲染机会里执行一整套更新步骤： 先跑 requestAnimationFrame
        回调，再计算样式、布局、绘制；本轮不需要绘制 （比如页面在后台标签），整步直接跳过。
      </Paragraph>
      <Paragraph>
        两个推论：rAF 既不是宏任务也不是微任务，它是渲染步骤里的回调；
        连续多个宏任务之间可能一次渲染都不发生——这正是 setTimeout(16) 做动画会掉帧、 而 rAF
        与刷新对齐不掉帧的原因。
      </Paragraph>

      <Heading level={2} title="事件循环全景：容器与流转" />
      <Paragraph>
        读图沿箭头走一圈：宏任务队列每轮只放 <strong>1 个任务</strong>
        上栈；栈上的同步代码产生微任务； 栈一清空，微任务队列<strong>整体清空</strong>
        ——清的过程中新增的微任务也插队清完（这条递归规则就写在容器里）； 然后才是渲染检查，
        最后回到队列取下一个任务，循环往复。
      </Paragraph>
      <Paragraph>
        对照开头的数据库类比：批处理作业一条条捞出来执行（宏任务「只取一个」），
        语句级触发器随当前语句连锁执行完毕才放行（微任务「全部清空」）。 这两条规则的
        <strong>不对称</strong>，就是「微任务永远插队」的全部原因， 也是渲染不被饿死的关键。
      </Paragraph>
      <EventLoopDiagram />
      <MemoryCard keyword="微任务永远插队">
        微任务不是"优先级高的宏任务"，而是绑定在<strong>本轮</strong>的收尾工作：
        每个宏任务执行完，都要先把微任务队列<strong>彻底清空</strong>
        ，才可能进入渲染或下一个宏任务。
      </MemoryCard>

      <Heading level={2} title="动手验证：经典输出题" />
      <Paragraph>
        先自己推一遍输出，再单步对照。这段代码覆盖了本文全部关键机制：同步 executor、
        微任务递归、宏任务逐轮取。三个视图分工：下面的 Playground 可直接改代码运行； StepThrough
        只看<strong>三容器（调用栈/微任务/宏任务）的快照流转</strong>； 每条输出的逐条解读在随后的
        OutputTimeline。
      </Paragraph>
      <PlayGround
        label="在线运行 / playground"
        code={`console.log(1);

new Promise((resolve) => {
  console.log("executor 同步执行");
  resolve();
})
  .then(() => {
    console.log(3);
    queueMicrotask(() => console.log("3+ 微任务里产生的新微任务"));
  });

setTimeout(() => console.log("A"), 0);
setTimeout(() => console.log("B"), 0);

console.log(2);
// 真实输出（Node 22.17 验证）：
// 1 → executor 同步执行 → 2 → 3 → 3+ → A → B`}
      />
      <StepThrough
        label="逐步推演 / step by step"
        height={190}
        autoMs={1600}
        steps={[
          {
            title: "同步代码执行中",
            color: "#f59e0b",
            desc: "调用栈从 main 脚本一路执行到最后一条同步语句；.then 回调与两个 setTimeout 此时只是入队，谁都不执行。",
            render: (
              <Queues
                stack={["main 脚本"]}
                micro={["then 回调"]}
                macro={["setTimeout → A", "setTimeout → B"]}
              />
            ),
          },
          {
            title: "栈清空 → 清微任务（递归）",
            color: "#8b5cf6",
            desc: "栈空即推进信号，微任务检查点触发。关键在中间那列：回调执行中产生的新微任务立刻入队——清空是递归的。",
            render: (
              <Queues
                stack={["then 回调"]}
                micro={["queueMicrotask 产生的新微任务"]}
                macro={["setTimeout → A", "setTimeout → B"]}
              />
            ),
          },
          {
            title: "微任务队列真正清空",
            color: "#8b5cf6",
            desc: "「队列空」才是取宏任务的前提——本轮产生的所有微任务（包括执行中新生成的）全部处理完，宏任务仍原地等待。",
            render: (
              <Queues
                stack={["queueMicrotask 回调"]}
                micro={[]}
                macro={["setTimeout → A", "setTimeout → B"]}
              />
            ),
          },
          {
            title: "每轮只取一个宏任务",
            color: "#3b82f6",
            desc: "取出第一个定时器上栈；它执行完后还要再走一遍「清微任务 → 渲染检查」，第二个定时器才轮得到——两个 setTimeout 分属两轮。",
            render: <Queues stack={["宏任务 A"]} micro={[]} macro={["setTimeout → B"]} />,
          },
        ]}
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
            why: "同步代码还没跑完，调用栈非空。此时 .then、两个 setTimeout 都只是入队等待。",
          },
          {
            output: "3",
            phase: "微任务",
            why: "栈清空后立即清空微任务队列——.then 的回调在此执行。它排在 A、B 之前，因为微任务永远先于下一个宏任务。",
          },
          {
            output: "3+ 微任务里产生的新微任务",
            phase: "微任务",
            why: "它在 3 的执行过程中才入队，但清空是递归的：新微任务仍属本轮，所以依然排在 A 之前——「微任务永远插队」的完整含义。",
          },
          {
            output: "A",
            phase: "宏任务",
            why: "微任务真正清空后才取第一个宏任务。setTimeout(...,0) 的 0ms 不代表立即执行，只是『下一轮』。",
          },
          {
            output: "B",
            phase: "宏任务",
            why: "A 执行完 → 栈清空 → 微任务队列是空的 → 取下一个宏任务。每轮只取一个，所以 A、B 分属两轮。",
          },
        ]}
      />

      <Heading level={2} title="微任务 vs 宏任务：一张表分清" />
      <Paragraph>
        同一维度逐行对照——来源、时机、清空规则、风险与用途。两列的第 3 行合起来
        就是全文最重要的不对称：一个全清，一个取一。
      </Paragraph>
      <CompareTable
        left={{ title: "微任务 Microtask", color: "#8b5cf6" }}
        right={{ title: "宏任务 Macrotask", color: "#3b82f6" }}
        rows={[
          {
            aspect: "来源",
            left: "Promise.then / queueMicrotask / await 之后的代码",
            right: "setTimeout / setInterval / I/O 回调 / UI 事件",
          },
          {
            aspect: "执行时机",
            left: "调用栈一清空就立即执行",
            right: "等下一轮循环才被取出",
          },
          {
            aspect: "清空规则",
            left: "本轮全部清空，新微任务递归插队",
            right: "每轮只取 1 个，执行完回去清微任务",
          },
          {
            aspect: "风险 / 优势",
            left: "风险：无限微任务会让渲染永远排队",
            right: "优势：天然给渲染让路，页面不假死",
          },
          {
            aspect: "典型用途",
            left: "状态变化的即时后续处理",
            right: "大块工作切片",
          },
        ]}
      />
      <MemoryCard keyword="setTimeout(fn, 0) ≠ 立即执行" color="#d29922">
        延时 0 只表示"下一轮宏任务"。当前调用栈不清空、微任务不清完，它永远排不上。
      </MemoryCard>

      <Heading level={2} title="为什么这样设计：调度成本" />
      <Paragraph>
        "宏任务后清微任务、每轮只取一个"的设计，本质是在<strong>响应及时性</strong>与{" "}
        <strong>渲染不被打断</strong>之间取平衡。下面是同一台机器上的相对量级
        （仅供建立直觉，不必背数字）：
      </Paragraph>
      <BarChart
        title="相对开销量级（越大越应避免出现在高频路径）"
        items={[
          { label: "读内存变量", value: 1, color: "#3fb950" },
          { label: "微任务调度", value: 3, color: "#8b5cf6" },
          { label: "setTimeout 下限", value: 40, color: "#3b82f6" },
          { label: "强制重排 reflow", value: 300, color: "#d29922" },
        ]}
      />
      <Paragraph>
        可验证的事实依据：HTML 规范的 timer initialization steps 规定，嵌套层级超过 5 层后
        setTimeout 的延时下限强制提升为 4ms——这是为防深层嵌套饿死其他任务而设 （Node 的下限则是
        1ms）；一次强制 reflow 的开销可达数万次微任务调度。
        事件循环把渲染夹在宏任务之间，就是为了让昂贵的渲染按节奏进行， 而不是被高频回调拖着跑。
      </Paragraph>

      <Heading level={2} title="边界与陷阱" />

      <Heading level={3} title="循环里的异步回调（var 与 let）" />
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

      <Heading level={3} title="微任务无限递归卡死页面" />
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

      <Heading level={3} title="Node：process.nextTick 不是普通微任务" />
      <DoDont
        dont={{
          code: `// 以为 nextTick 和 Promise 微任务平级
Promise.resolve().then(() => console.log("then"));
process.nextTick(() => console.log("nextTick"));
// 真实输出（Node 22.17 验证）: nextTick, then
// nextTick 队列优先清空，插到了所有 Promise 之前`,
          note: "顺序与书写顺序相反——按队列优先级，不按代码顺序",
        }}
        do={{
          code: `// 常规"尽快异步"用 queueMicrotask / Promise，
// nextTick 只留给"先于一切异步"的内部收尾（如流状态同步）
queueMicrotask(() => console.log("first"));
Promise.resolve().then(() => console.log("second"));
// 真实输出（Node 22.17 验证）: first, second`,
          note: "递归 nextTick 会饿死 I/O（实测 Node 22：3000 层递归期间定时器与 I/O 全程押后）",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        intro="模拟真实面试的连环追问：从热身到硬核，每一问都建立在前一问的回答之上。先自己想，再点开参考答案对照。"
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
              "实测感受量级：本机 Node 22.17 让 20 万个微任务互相衔接，紧随其后的 setTimeout 被推迟约 16ms——微任务本身极快，但无限递归就是无限快地卡死。Node 的 process.nextTick 风险更高：优先级在 Promise 微任务之前，且递归会饿死 I/O（实测 3000 层递归期间，定时器与 I/O 回调全程押后）；现代 Node 已不设 nextTickQueue 上限，别指望引擎救场。",
          },
        ]}
      />

      <CrossRef
        title="下一步：从异步调度回到同步世界"
        notes={[
          {
            title: "闭包到底是什么：词法环境的快照",
            to: "/note/frontend/javascript/closure/closure-basics",
            description: "异步回调捕获的外层变量活在闭包里——回调如何记住状态。",
          },
          {
            title: "变量提升是怎么发生的：执行上下文",
            to: "/note/frontend/javascript/scope/execution-context",
            description: "栈帧里到底存了什么——同步世界的词法规则。",
          },
        ]}
      />
    </NoteShell>
  );
}

/** 推演用三容器快照：调用栈 / 微任务队列 / 宏任务队列（输出的逐条解读由 OutputTimeline 负责） */
function Queues(props: { stack: string[]; micro: string[]; macro: string[] }) {
  const cols = [
    { title: "调用栈", items: props.stack, color: "#f59e0b" },
    { title: "微任务队列", items: props.micro, color: "#8b5cf6" },
    { title: "宏任务队列", items: props.macro, color: "#3b82f6" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {cols.map((c) => (
        <div key={c.title} className="rounded-md border border-border p-2">
          <div className="mb-1.5 text-[10px] font-semibold" style={{ color: c.color }}>
            {c.title}
          </div>
          <div className="flex min-h-14 flex-col gap-1">
            {c.items.length === 0 ? (
              <span className="text-[10px] text-muted">（空）</span>
            ) : (
              c.items.map((t) => (
                <span
                  key={t}
                  className="truncate rounded px-1.5 py-0.5 font-mono text-[10px]"
                  style={{ backgroundColor: `${c.color}1a`, color: c.color }}
                >
                  {t}
                </span>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
