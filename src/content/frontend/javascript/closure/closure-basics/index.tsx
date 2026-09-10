import { useState } from "react";
import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";
import { DemoButton, LogPanel, ResetButton } from "@/components/demo/LogPanel";
import {
  CrossRef,
  DoDont,
  MemoryCard,
  MemoryMap,
  OutputTimeline,
  Prerequisite,
  VizBlock,
} from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Prerequisite
        notes={[
          {
            title: "变量是怎么被找到的：作用域与作用域链",
            to: "/note/frontend/javascript/scope/scope-chain",
          },
        ]}
      >
        闭包是作用域链的延续：本篇假设你已知道「函数的环境记录通过 outer 指向定义处环境」。
      </Prerequisite>

      <Conclusion>
        闭包 = <strong>函数 + 它定义时所处词法环境的引用</strong>。函数创建的那一刻，
        <code>[[Environment]]</code> 内部槽就绑定了定义处的环境记录；之后无论被传到哪里调用，
        它读写变量的链永远从那里出发。函数在定义作用域之外被调用（或环境比调用更长寿）时，
        这个组合就是你看到的「闭包」。捕获的是<strong>变量绑定（引用）</strong>不是值的拷贝；
        只要函数可达，环境记录就不可回收——这是闭包能「记住」状态的原因，也是泄漏的根源。
      </Conclusion>

      <Heading level={2} title="闭包从哪来：词法作用域的必然产物" />
      <Paragraph>
        把两个既有事实放在一起，闭包不是新机制，是推论。事实一：<strong>函数是一等公民</strong>——
        可以被赋值、进数组、当参数、当返回值，函数会不可避免地离开它书写的位置。 事实二：
        <strong>作用域是词法的</strong>——函数能访问哪些变量由定义位置决定（见「作用域链」篇）。
        两者相加只有一个结论：函数离开定义处之后，定义处的环境必须还能被它访问到——
        否则词法作用域的承诺（「你定义在哪，就能看到哪」）在调用那一刻就违约了。
        闭包就是这个承诺的兑现方式：函数随身携带定义处环境的引用。
      </Paragraph>
      <Paragraph>
        反过来看更容易记住：
        <strong>
          只要函数没有离开定义处去执行（或环境与函数同生共死）， 你根本意识不到闭包存在
        </strong>
        。日常代码里「闭包」作为术语被点名，几乎都发生在两个场景：
        回调在原作用域结束后才执行（定时器、事件监听、异步返回），或工厂函数把内层函数返回到外部。
        离开定义处 + 环境还在——识别闭包问题先识别这两个条件。
      </Paragraph>

      <Heading level={2} title="捕获机制：[[Environment]] 与环境记录" />
      <Paragraph>
        规范层面的时序很精确：<strong>函数对象创建时</strong>
        （不是调用时），引擎把「当前正在使用的环境记录」 写进函数的 <code>
          [[Environment]]
        </code>{" "}
        内部槽——这一步不可省略，因为它就是「定义处」的内存表示。
        <strong>调用时</strong>，引擎为这次调用新建一个环境记录，其 outer 指向函数的{" "}
        <code>[[Environment]]</code>——变量查找的链条由此接回定义处。所谓「快照」，快照的是
        <strong>环境的引用</strong>而非变量值：外层变量后来被改了，闭包读到的是最新值；
        闭包自己改写变量，外层再读也拿得到——两边看的是同一条环境记录。
      </Paragraph>
      <Paragraph>
        V8 的实现把这套模型落到堆上：编译期分析哪些局部变量被内层函数引用，
        <strong>只有这些变量</strong> 被「装箱」进堆上的 Context
        对象（规范里环境记录的实体），其余变量仍留在栈帧里随调用结束消亡。 所以闭包的捕获粒度是
        <strong>按变量</strong>的，不是把整个作用域打包带走—— 但也要注意：只要一个变量进了
        Context，它就脱离了栈的快速回收通道，生命周期完全交给 GC。 下图是 <code>makeCounter</code>{" "}
        返回后的内存结构——栈帧没了，环境记录还在。
      </Paragraph>

      <MemoryMap
        label="闭包捕获的内存结构 / closure capture"
        regions={[
          {
            id: "stack",
            title: "调用栈",
            desc: "makeCounter 的帧早已弹出",
            layout: "column",
            color: "#f59e0b",
          },
          {
            id: "heap",
            title: "堆",
            desc: "闭包让这部分脱离栈回收通道",
            layout: "wrap",
            color: "#1677ff",
          },
        ]}
        objects={[
          {
            id: "globalFrame",
            region: "stack",
            label: "全局上下文（栈底）",
            color: "#f59e0b",
            fields: [{ name: "[[LexicalEnv]]", refTo: "globalEnv" }],
          },
          {
            id: "counterFn",
            region: "heap",
            label: "counter 函数对象",
            color: "#8b5cf6",
            fields: [{ name: "[[Environment]]", refTo: "counterEnv" }],
          },
          {
            id: "counterEnv",
            region: "heap",
            label: "makeCounter 的环境记录",
            color: "#8b5cf6",
            fields: [
              { name: "count", value: "2" },
              { name: "outer", refTo: "globalEnv" },
            ],
          },
          {
            id: "globalEnv",
            region: "heap",
            label: "全局环境记录",
            color: "#1677ff",
            fields: [
              { name: "makeCounter", value: "<function>" },
              { name: "counter", refTo: "counterFn" },
            ],
          },
        ]}
        note="根（全局变量 counter）→ 函数对象 → 环境记录：整条链可达，count 就一直活着。把 counter 置为 null 且无其他引用时，函数对象与环境记录一起变得不可达、一起被回收——闭包没有「泄漏开关」，可达性就是一切。"
      />

      <Heading level={2} title="为什么 JS 设计成词法作用域" />
      <Paragraph>
        词法作用域的核心收益是<strong>代码可以静态推理</strong>
        ：只看文本就能确定每个标识符的查找链，
        不用执行、不用知道谁会调用它。这个性质是整条工具链的地基——打包器的 tree-shaking、
        压缩器的变量重命名、TS 的类型检查、IDE 的跳转定义，全都建立在「作用域离屏可算」之上。
        若换成动态作用域（按调用栈决定可见性），函数行为随调用方变化，读代码的人必须在脑内模拟所有调用点，
        上述工具全部失效。JS 沿袭 Scheme 的一等函数 + 词法作用域传统，选的是可推理的那条路。
      </Paragraph>
      <Paragraph>
        引擎层面同样是这笔账：作用域链在创建时固定，查找路径静态可预测，V8
        的内联缓存才能把「沿链逐级查找」优化成带形状校验的缓存命中，热点路径近似常数时间。
        动态的作用域（随调用栈变化）天然无法做这类缓存。 不过 JS 也不是全然静态——<code>this</code>{" "}
        就是留给动态性的唯一口子，它由调用方式注入、 与作用域链无关（见「this
        绑定」篇）。理解「作用域词法、this 动态」的分工， 很多混淆会自动消失。
      </Paragraph>

      <MemoryCard keyword="捕获引用，不是拷贝" color="#1677ff">
        闭包保存的是<strong>环境记录的引用</strong>：读到的永远是变量当前值，写入对外层可见。
        判断闭包相关 bug 时先问一句——这几个函数读的是不是同一条环境记录？
      </MemoryCard>

      <Heading level={2} title="经典输出题：循环里的闭包" />
      <Paragraph>
        最经典的考点：<code>setTimeout</code> 的回调捕获的 <code>i</code> 到底是哪一个。
        两个循环只差一个声明关键字，输出完全不同——先自己推断，再看逐条解读（Node v22.17.0 实测）：
      </Paragraph>
      <CodeBlock
        code={`for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i));
}
// 3 3 3 —— var：整个循环只有一个 i，三个回调共享

for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i));
}
// 0 1 2 —— let：每轮迭代创建一个新的绑定`}
      />
      <OutputTimeline
        label="输出解读 / loop closure"
        steps={[
          {
            output: "3",
            phase: "宏任务",
            why: "同步循环在主线程跑完时 i 已经是 3；三个回调共享 var i 这一个绑定，任何一个开始执行时读到的都是最终值。",
          },
          {
            output: "3",
            phase: "宏任务",
            why: "三份回调读的是同一个变量，不是三份拷贝——「捕获引用」在循环场景的必然结果。",
          },
          {
            output: "3",
            phase: "宏任务",
            why: "定时器回调只能进宏任务队列，永远晚于同步代码——它们「看到的」必然是循环结束后的世界。",
          },
          {
            output: "0",
            phase: "宏任务",
            why: "let 触发循环的特判机制：每轮迭代创建新的环境记录，本轮回调捕获的是记录着 0 的那一条。",
          },
          {
            output: "1",
            phase: "宏任务",
            why: "第二轮的新绑定复制了上一轮的值再加一——回调各拿各的记录，互不干扰。",
          },
          {
            output: "2",
            phase: "宏任务",
            why: "六条输出全是宏任务阶段打印；顺序差异完全由「共享绑定 vs 独立绑定」决定，与定时器延时无关。",
          },
        ]}
      />
      <Paragraph>
        <code>let</code> 版本不是闭包机制变了，而是<strong>绑定数量变了</strong>——规范给{" "}
        <code>for</code> 头部的 <code>let</code> 加了每轮新建环境的特判。修复 <code>var</code>{" "}
        版本的老办法（ES5 时代没有 <code>let</code>）是用 IIFE 手动制造这层独立作用域：
        <code>{"(function(j){ setTimeout(() => console.log(j)) })(i)"}</code> ——把当轮的{" "}
        <code>i</code> 作为参数 <code>j</code> 重新登记进一个新环境， 每个回调拿到自己的{" "}
        <code>j</code>。今天直接用 <code>let</code> 即可，但 IIFE
        写法在存量代码和面试追问里仍然常见。
      </Paragraph>

      <Heading level={2} title="闭包计数器：函数返回后状态仍在" />
      <Paragraph>
        状态需要<strong>跨调用存活</strong>、又不想暴露成全局变量——闭包是这个需求的原始解：
        把变量登记在工厂函数的环境里，返回一个读写它的内层函数。外部没有任何路径直接触到{" "}
        <code>count</code>，能做的只有调用 <code>counter()</code>
        ——状态私有化是作用域规则的自然结果， 不需要任何语法开关。
      </Paragraph>
      <CodeBlock
        code={`function makeCounter() {
  let count = 0; // 被闭包捕获的私有状态
  return function counter() {
    count += 1;
    return count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2 —— makeCounter 早已返回，count 却还在涨`}
      />
      <Paragraph>
        <code>makeCounter()</code> 调用结束、栈帧弹出后，<code>count</code> 靠「返回的{" "}
        <code>counter</code> 函数持有 <code>[[Environment]]</code>」继续存活（内存结构见上面的
        MemoryMap）。每调用一次 <code>makeCounter()</code> 就产生一条全新的环境记录——
        两个计数器互不串账，这正是下一篇「闭包封装状态」各种工程模式的共同地基。单步验证：
      </Paragraph>
      <ClosureCounter />

      <Heading level={2} title="边界陷阱" />
      <Paragraph>
        闭包的坑几乎都是同一个根源的两种走向：<strong>持有得比预期久</strong>（该回收的回收不掉，
        内存被大对象拖住）或<strong>共享得比预期多</strong>（以为各拿一份，实际读写同一条记录）。
        前者的重灾区是定时器和事件监听——回调常驻，被它捕获的变量跟着常驻；后者的重灾区是循环与异步——
        回调共享同一个绑定。写代码时的自查口诀：这个回调被谁引用多久？它捕获的变量有多大？
      </Paragraph>
      <DoDont
        label="循环里捕获循环变量 / loop capture"
        dont={{
          code: `// 异步回调引用 var 循环变量
for (var i = 0; i < tasks.length; i++) {
  fetch(tasks[i]).then(() => {
    retry(i); // 循环跑完后才执行：
    // i 永远是 tasks.length
  });
}`,
          note: "所有回调共享同一个 var 绑定，执行时读到的是循环结束后的最终值——经典异步事故",
        }}
        do={{
          code: `for (let i = 0; i < tasks.length; i++) {
  fetch(tasks[i]).then(() => {
    retry(i); // let：每轮独立绑定
  });
}

// ES5 环境用 IIFE 手动造新作用域：
// (function(j){ ... })(i)`,
          note: "let 每轮新建绑定；拿不到 let 时用 IIFE 把当轮值登记进新环境——两者等价",
        }}
      />
      <DoDont
        label="闭包持有大对象 / closure retention"
        dont={{
          code: `function attach(el, bigData) {
  el.addEventListener("click", () => {
    render(bigData); // 闭包捕获整个大对象
  });
  // el 换页销毁时监听器没移除：
  // bigData 永远不可回收
}`,
          note: "监听器/定时器让闭包常驻，被捕获的变量跟着常驻——内存泄漏常以「忘了解绑」的形式出现",
        }}
        do={{
          code: `function attach(el, bigData) {
  const summary = summarize(bigData); // 只留需要的
  const onClick = () => render(summary);
  el.addEventListener("click", onClick);
  return () => el.removeEventListener("click", onClick);
}
// 组件卸载时调用返回的解绑函数`,
          note: "捕获前先把大对象收敛成小字段，并提供解绑路径——闭包持有成本 = 被捕获变量的大小 × 存活时长",
        }}
      />
      <Paragraph>
        工程上的防线因此有三条：<strong>显式清理</strong>（<code>clearInterval</code>、
        <code>removeEventListener</code>，现代浏览器还可以用 <code>AbortController</code>{" "}
        一组信号批量解除监听）；<strong>收敛捕获面</strong>（回调只引用它真正需要的字段，
        而不是顺手把整个大对象写进闭包）；<strong>限制存活时长</strong>
        （能随组件卸载/请求结束释放的，
        就不要登记到全局结构里）。三条都做到位，闭包本身并不比普通函数更容易泄漏——
        泄漏的从来不是机制，是缺失的生命周期管理。
      </Paragraph>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "闭包一定造成内存泄漏吗？",
            intent:
              "热身题，考「有意持有」与「意外滞留」的区分——把闭包等同于泄漏的人，会在代码里无谓地回避正常模式。",
            depth: 2,
            a: "不一定。泄漏的定义是「不再需要却无法回收」；闭包持有状态是有意设计——计数器的 count 就该活着。只有当闭包本身已无用、却仍被引用链拽着（遗忘的定时器、未解绑的监听器、塞进全局数组的一次性回调）时，它捕获的环境才构成泄漏。判断标准始终是可达性：还从根摸得到吗？还需要它吗？",
            bonus:
              "排查工具：Chrome DevTools 的 Memory 面板拍堆快照，按 retainer 链找「谁拽住了这个上下文」——多数闭包泄漏的元凶在监听器/定时器注册处，不在闭包本体。",
          },
          {
            q: "循环里 await 一个闭包变量，读到的是什么？",
            intent: "var/let 循环题的异步进阶版——把事件循环时序和绑定数量两个维度叠在一起考。",
            depth: 3,
            a: "let 声明的迭代变量每轮独立，await 恢复执行后读到的仍是当轮的值；var 则共享一个绑定，await 之后的代码执行时循环早已跑完，读到最终值。await 本身不改变绑定，它只是把「回调执行时」推迟到循环之后——shared binding 的延迟读取风险被 await 进一步放大。",
            bonus:
              "forEach + async 回调也有同样的坑：forEach 不等待 async 回调，回调里的循环变量共享问题与 for(var) 同构——并发收集结果请用 for...of + await 或 Promise.all。",
          },
          {
            q: "闭包和 class 怎么选？",
            intent:
              "工程选型题——考你知道两者是同一需求（封装状态）的两条实现路线，而不是把闭包当炫技。",
            depth: 4,
            a: "状态少、操作少、要每实例天然隔离时，闭包工厂更轻：没有 this 问题、没有继承包袱、状态真私有（外部连 undefined 都摸不到）。状态多、需要子类型多态、需要 instanceof 判断、调试时要看实例结构时，用 class——ES2022 的 #私有字段也补上了原生私有语义，选型的天平已向 class 倾斜，闭包工厂适合小而封闭的状态单元。",
            bonus:
              "内存模型不同：闭包工厂的状态住在每实例的环境记录里，方法每次工厂调用重新创建；class 的方法在原型上共享一份、字段每实例一份——大量实例时 class 的方法共享是实打实的内存优势。",
          },
          {
            q: "React Hooks 和闭包什么关系？",
            intent:
              "考闭包知识的迁移力——前端工程师最高频的闭包现场其实是框架，说不清这条说明理解还停在玩具例子。",
            depth: 4,
            a: "函数组件每次渲染就是一次函数调用，各自生成一份独立的闭包快照：当次渲染的 props、state、局部变量都登记在当次的环境记录里。「闭包陷阱」（useEffect 里读到旧 state）就是回调捕获了旧渲染的快照——机制与循环 var 题完全同构，只是共享/独立的判定对象从循环变量换成了渲染。对策也同构：让回调拿到最新值（依赖数组、函数式更新 setState(prev => …)、useRef 跨渲染共享）。站内「React Hooks」篇有完整展开。",
            bonus:
              "useEffect 返回的清理函数也是闭包——它捕获的同样是当次渲染的快照，清理时读到的 props/state 是「那一轮」的值，这对写「仅当依赖变化时才清理」的逻辑至关重要。",
          },
          {
            q: "闭包变量存在栈还是堆？V8 具体怎么实现？",
            intent:
              "压轴硬核题，从规范模型下沉到引擎实现——能答出「装箱」和按需捕获的，说明真读过 V8 相关材料。",
            depth: 5,
            a: "堆。V8 在编译期做变量级分析：只把被内层函数引用的变量装箱进堆上的 Context 对象（ScopeInfo 描述哪些变量需要装箱），函数的栈帧弹出后 Context 交给 GC 管理。未被引用的变量仍留在栈帧里随弹出消亡。所以闭包的内存成本是「按捕获变量付费」，且每次访问捕获变量多一次堆间接寻址——这是闭包相对局部变量唯一的常规开销。",
            bonus:
              "反向优化也存在：V8 的逃逸分析在「闭包不逃出当前调用」时可以不装箱、保持在栈上；热点代码里对 Context 字段的访问还有内联缓存加速——闭包不天然慢，但它确实改变了变量的内存布局与回收路径。",
          },
        ]}
      />

      <Paragraph>
        状态私有化的地基已经打好——下一篇把它工程化：私有变量、计数器、模块模式是同一手法的不同规模；
        而闭包持有的变量什么时候会被回收过头，通往内存管理：
      </Paragraph>
      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "闭包在工程里怎么用：私有状态与模块模式",
            to: "/note/frontend/javascript/closure/closure-patterns",
            description: "把「函数 + 环境」封装成工程模式：工厂函数、IIFE 单例与它们的坑。",
          },
          {
            title: "JS 是怎么释放内存的：GC 与泄漏排查",
            to: "/note/frontend/javascript/memory/gc-and-leaks",
            description: "环境记录的可达性由谁裁决、分代回收怎么处理这些堆上的闭包对象。",
          },
        ]}
      />
    </NoteShell>
  );
}

function ClosureCounter() {
  const [logs, setLogs] = useState<string[]>([]);
  const [count, setCount] = useState(0);

  const run = () => {
    const next = count + 1;
    setCount(next);
    setLogs((l) => [...l, `makeCounter() 第 ${next} 次调用 → 返回 ${next}`]);
  };
  const reset = () => {
    setLogs([]);
    setCount(0);
  };

  return (
    <VizBlock label="闭包计数器 / closure-counter" color="#1677ff">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <DemoButton onClick={run}>counter()</DemoButton>
          <ResetButton onClick={reset} />
        </div>
        <LogPanel logs={logs} placeholder="// 每次点击都在访问闭包捕获的私有变量" />
      </div>
    </VizBlock>
  );
}
