import { motion } from "framer-motion";
import { Conclusion, NoteShell, Prose, QAChain, Section } from "@/components/note";
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

      <Section title="逐段拆解">
        <Prose>
          <p>
            <strong>1. 调用栈（Call Stack）</strong>
            ：函数调用形成栈帧，后进先出。栈空是事件循环推进的唯一信号。
          </p>
          <p>
            <strong>2. 微任务（Microtask）</strong>
            ：Promise.then/catch/finally、queueMicrotask、await 之后的代码。当前宏任务结束后
            <strong>立即、全部、递归地</strong>清空——执行微任务过程中产生的新微任务也会在本轮处理。
          </p>
          <p>
            <strong>3. 宏任务（Macrotask）</strong>
            ：setTimeout/setInterval、I/O、UI 事件。每轮循环只取<strong>一个</strong>
            ，执行完再次清微任务。
          </p>
          <p>
            <strong>4. 渲染时机</strong>
            ：浏览器在每轮宏任务结束后、微任务清空后决定是否渲染（requestAnimationFrame
            在渲染前调用），并非每轮都渲染。
          </p>
        </Prose>
      </Section>

      <Section title="经典输出题">
        <CodeBlock
          code={`console.log(1);

new Promise((resolve) => {
  console.log("executor 同步执行");
  resolve();
}).then(() => console.log(3));

setTimeout(() => console.log("A"), 0);
setTimeout(() => console.log("B"), 0);

console.log(2);
// 输出：1 → executor 同步执行 → 2 → 3 → A → B`}
        />
        <p className="text-sm text-muted">
          关键点：Promise 的 executor 是同步的；setTimeout(...,0)
          不代表立即执行，只是"下一轮宏任务"。
        </p>
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
    { id: "sync", label: "执行同步代码", x: 130, y: 30, color: "#f59e0b" },
    { id: "micro", label: "清空微任务队列", x: 130, y: 110, color: "#8b5cf6" },
    { id: "render", label: "渲染（可选）rAF", x: 30, y: 190, color: "#10b981" },
    { id: "macro", label: "取 1 个宏任务", x: 230, y: 190, color: "#3b82f6" },
  ];
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-border bg-card p-4">
      <svg viewBox="0 0 360 240" className="mx-auto w-full max-w-md">
        {nodes.map((n) => (
          <g key={n.id}>
            <motion.rect
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              x={n.x - 85}
              y={n.y - 18}
              width={170}
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
          x1={130}
          y1={48}
          x2={130}
          y2={88}
          stroke="#888"
          strokeWidth={1.2}
          markerEnd="url(#arrow)"
        />
        <line
          x1={80}
          y1={128}
          x2={50}
          y2={168}
          stroke="#888"
          strokeWidth={1.2}
          markerEnd="url(#arrow)"
        />
        <line
          x1={180}
          y1={128}
          x2={215}
          y2={168}
          stroke="#888"
          strokeWidth={1.2}
          markerEnd="url(#arrow)"
        />
        <path
          d="M 30 208 C 30 235, 320 235, 255 200"
          fill="none"
          stroke="#888"
          strokeWidth={1.2}
          strokeDasharray="4 3"
          markerEnd="url(#arrow)"
        />
        <text x={140} y={232} fontSize={10} fill="#888">
          循环
        </text>
      </svg>
    </div>
  );
}
