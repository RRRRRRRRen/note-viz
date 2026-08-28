import CodeBlock from "@/components/demo/CodeBlock";

export default function Note() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border-l-4 border-accent bg-accent/5 p-4">
        <h2 className="mb-1 font-semibold">结论先行</h2>
        <p className="text-sm leading-relaxed">
          闭包 = <strong>函数 + 它定义时所处词法环境的引用</strong>。
          函数无论被传到哪里，都能访问定义处的变量——因为它的环境记录还被人引用着，不会被回收。
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">逐段拆解</h2>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            <strong>1. 词法作用域</strong>
            ：作用域在写代码时就确定了，跟函数在哪调用无关。内层函数可以访问外层函数的变量。
          </p>
          <p>
            <strong>2. 捕获的是引用不是值</strong>
            ：闭包保存对外层变量环境的引用，外部变量后续被修改，闭包读到的是最新值。
          </p>
          <p>
            <strong>3. 生命周期</strong>
            ：只要闭包可达，被捕获的变量就不会被
            GC。这正是闭包能"记住"状态的原因，也是内存泄漏的根源。
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">经典输出题</h2>
        <CodeBlock
          code={`for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i));
}
// 3 3 3 —— var 是函数作用域，三个闭包共享同一个 i

for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i));
}
// 0 1 2 —— let 每轮迭代创建新的绑定`}
        />
        <p className="text-sm text-muted-foreground">
          修复 var 版本的老办法：用 IIFE 制造独立作用域{" "}
          <code className="rounded bg-muted px-1">
            {"(function(j){ setTimeout(()=>console.log(j)) })(i)"}
          </code>
          。
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">闭包计数器（单步验证）</h2>
        <ClosureCounter />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">经典追问链</h2>
        <div className="space-y-3 text-sm leading-relaxed">
          <QA
            q="闭包一定造成内存泄漏吗？"
            a="不一定。泄漏指「不再需要却无法回收」。闭包是有意持有状态；只有当闭包本身已无用但被意外引用（如遗忘的事件监听器、定时器）时才是泄漏。"
          />
          <QA
            q="闭包和 class 怎么选？"
            a="需要私有状态且逻辑简单时闭包更轻；状态多、有继承需求、需要 instanceof 判断时用 class（或 #私有字段）。"
          />
          <QA
            q="循环里 await 闭包变量会怎样？"
            a="let 声明的迭代变量每轮独立，await 后再读也是当轮的值；var 则会读到循环结束后的最终值——异步回调经典事故。"
          />
          <QA
            q="React Hooks 和闭包什么关系？"
            a="每次渲染都是一个独立的闭包快照。Hooks 的「闭包陷阱」就是因为回调捕获了旧渲染的 state——这正是下一章 React 部分要展开的。"
          />
        </div>
      </section>
    </div>
  );
}

function QA({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-1 font-medium">Q：{q}</div>
      <div className="text-muted-foreground">A：{a}</div>
    </div>
  );
}

import { useState } from "react";

function ClosureCounter() {
  const [logs, setLogs] = useState<string[]>([]);
  const [count, setCount] = useState(0);

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
        闭包状态演示：函数执行结束后变量依然存活
      </div>
      <div className="p-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setCount(count + 1);
              setLogs((l) => [...l, `makeCounter() 第 ${count + 1} 次调用 → 返回 ${count + 1}`]);
            }}
            className="rounded bg-accent px-3 py-1.5 text-xs text-accent-foreground"
          >
            counter()
          </button>
          <button
            type="button"
            onClick={() => {
              setLogs([]);
              setCount(0);
            }}
            className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            重置
          </button>
        </div>
        <div className="mt-3 min-h-16 rounded bg-[#0d1117] p-2 font-mono text-xs text-green-400">
          {logs.length === 0 ? (
            <span className="text-gray-500">// 每次点击都在访问闭包捕获的私有变量</span>
          ) : (
            logs.map((l, i) => <div key={i}>{l}</div>)
          )}
        </div>
      </div>
    </div>
  );
}
