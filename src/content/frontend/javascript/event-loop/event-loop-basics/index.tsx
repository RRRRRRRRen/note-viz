import { motion } from "framer-motion";
import { PanZoomCanvas } from "@/components/demo/PanZoomCanvas";
import { Conclusion, NoteShell, Prose, QAChain, Section, Subsection } from "@/components/note";
import { BarChart, CompareTable, MemoryCard, Timeline } from "@/components/viz";
import CodeBlock from "@/components/demo/CodeBlock";
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
          先自己推一遍输出顺序，再打开浏览器控制台实际运行对照——所有结论都应来自真实运行结果，而不是背答案：
        </p>
        <CodeBlock
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
        <p className="mb-1 text-sm text-muted">输出顺序的时间线视图：</p>
        <Timeline
          steps={[
            { label: "1", sub: "同步", color: "#f59e0b" },
            { label: "executor", sub: "同步", color: "#f59e0b" },
            { label: "2", sub: "同步", color: "#f59e0b" },
            { label: "3", sub: "微任务", color: "#8b5cf6" },
            { label: "A", sub: "宏任务①", color: "#3b82f6" },
            { label: "B", sub: "宏任务②", color: "#3b82f6" },
          ]}
        />
        <p className="text-sm text-muted">
          关键点：Promise 的 executor 是同步的；setTimeout(...,0)
          不代表立即执行，只是"下一轮宏任务"。
        </p>
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
        <QAChain
          items={[
            {
              q: "Promise.then 和 queueMicrotask 谁先？",
              a: "同为微任务，严格按入队顺序（FIFO）执行，没有谁更优先。",
            },
            {
              q: "await 下面的代码在什么时候执行？",
              a: "await 右侧表达式同步求值，之后函数挂起，剩余代码被包装成微任务。等价于 then 回调。",
            },
            {
              q: "setTimeout(fn, 0) 和 requestAnimationFrame 谁先？",
              a: "不一定。rAF 在「渲染前」执行，而渲染发生在宏任务之后；如果本轮没有渲染机会，rAF 会推迟，setTimeout 可能先跑。",
            },
            {
              q: "process.nextTick 呢？",
              a: "Node.js 特有，优先级高于 Promise 微任务——每个宏任务后先清 nextTick 队列再清 Promise 队列。",
            },
            {
              q: "微任务无限递归会怎样？",
              a: "事件循环被卡死在微任务阶段，页面无法渲染、宏任务永远无法执行（如 queueMicrotask 里不断 queueMicrotask）。",
            },
          ]}
        />
      </Section>
    </NoteShell>
  );
}

function EventLoopFlow() {
  const nodes = [
    { id: "sync", label: "执行同步代码（厨师做菜）", x: 160, y: 34, color: "#f59e0b" },
    { id: "micro", label: "清空微任务队列（处理补话）", x: 160, y: 116, color: "#8b5cf6" },
    { id: "render", label: "渲染检查（可选）rAF", x: 50, y: 198, color: "#10b981" },
    { id: "macro", label: "取 1 个宏任务（拿下一张单）", x: 270, y: 198, color: "#3b82f6" },
  ];
  return (
    <PanZoomCanvas>
      <svg viewBox="0 0 380 252" width={684} height={454} className="block">
        {nodes.map((n) => (
          <g key={n.id}>
            <motion.rect
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              x={n.x - 105}
              y={n.y - 18}
              width={210}
              height={36}
              rx={8}
              fill={`${n.color}1a`}
              stroke={n.color}
            />
            <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} fill={n.color}>
              {n.label}
            </text>
          </g>
        ))}
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke="#888" strokeWidth={1.2} />
          </marker>
        </defs>
        <line
          x1={160}
          y1={52}
          x2={160}
          y2={94}
          stroke="#888"
          strokeWidth={1.2}
          markerEnd="url(#arrow)"
        />
        <line
          x1={105}
          y1={134}
          x2={70}
          y2={176}
          stroke="#888"
          strokeWidth={1.2}
          markerEnd="url(#arrow)"
        />
        <line
          x1={215}
          y1={134}
          x2={250}
          y2={176}
          stroke="#888"
          strokeWidth={1.2}
          markerEnd="url(#arrow)"
        />
        <path
          d="M 50 216 C 50 244, 340 244, 292 212"
          fill="none"
          stroke="#888"
          strokeWidth={1.2}
          strokeDasharray="4 3"
          markerEnd="url(#arrow)"
        />
        <text x={160} y={240} fontSize={10} fill="#888">
          循环
        </text>
      </svg>
    </PanZoomCanvas>
  );
}
