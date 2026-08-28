import { useState } from "react";
import { Conclusion, NoteShell, Prose, QAChain, Section } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";
import { DemoButton, LogPanel, ResetButton } from "@/components/demo/LogPanel";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        setState 不是"改值"，而是<strong>发起一次重新渲染的请求</strong>。 React 18+
        自动批处理所有更新（包括 setTimeout/Promise 里），一次事件处理中改 10 次状态也只渲染一次。
      </Conclusion>

      <Section title="渲染流水线">
        <Prose>
          <p>
            <strong>1. Render 阶段</strong>
            ：调用组件函数，计算新的元素树。这一阶段可被中断、可重放，必须保持纯函数。
          </p>
          <p>
            <strong>2. Commit 阶段</strong>
            ：把 diff 结果一次性写入 DOM，执行 layoutEffect。
          </p>
          <p>
            <strong>3. 浏览器绘制</strong>：之后才轮到 useEffect（异步）、rAF 等。
          </p>
        </Prose>
      </Section>

      <Section title="面试最爱：连续 setState">
        <CodeBlock
          lang="typescript"
          code={`function handle() {
  setCount(count + 1);   // 依赖本次渲染的 count = 0 → 1
  setCount(count + 1);   // 还是 0 → 1（count 是闭包里的旧值！）
  setCount(count + 1);   // 还是 1
  // 结果：只 +1

  setCount(c => c + 1);  // 函数式更新，基于最新队列状态
  setCount(c => c + 1);  // +1
  setCount(c => c + 1);  // +1
  // 结果：+3
}`}
        />
      </Section>

      <Section title="交互演示">
        <BatchDemo />
      </Section>

      <Section title="经典追问链">
        <QAChain
          items={[
            {
              q: "React 18 之前 setTimeout 里的 setState 会批处理吗？",
              a: "不会，每次 setState 都触发一次渲染。18 的 createRoot 之后所有更新默认批处理，除非放在 flushSync 里。",
            },
            {
              q: "为什么 setState 后立刻读 state 还是旧值？",
              a: "本次渲染的 state 是不可变快照。更新请求进入队列后，要等下一次渲染组件函数重新执行，才有新值。",
            },
            {
              q: "useEffect 和 useLayoutEffect 的执行时机？",
              a: "layoutEffect 在 DOM 变更后、浏览器绘制前同步执行（会阻塞绘制）；useEffect 在绘制后异步执行。测量 DOM 尺寸并立刻调整用后者。",
            },
            {
              q: "Hooks 闭包陷阱怎么解？",
              a: "useRef 保存最新值、函数式更新、或依赖数组里声明清楚。核心认知：每次渲染是独立的一次函数调用，各自有自己的闭包。",
            },
          ]}
        />
      </Section>
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
    setLogs((l) => [...l, "直接 set ×3：count 期望 +3，实际只 +1（闭包旧值）"]);
    setRenderCount((r) => r + 1);
  };
  const addRight = () => {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setLogs((l) => [...l, "函数式 set ×3：基于最新状态累加，count +3"]);
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
        批处理演示：两种写法各点一次，对比结果
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
        <LogPanel logs={logs} placeholder="// 点击按钮观察 count 与渲染次数" />
      </div>
    </div>
  );
}
