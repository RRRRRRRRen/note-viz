import { useState } from "react";
import { Conclusion, NoteShell, Prose, QAChain, Section } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";
import { DemoButton, LogPanel, ResetButton } from "@/components/demo/LogPanel";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        生产速度 &gt; 消费速度时，数据会在内存里无限堆积。
        <strong>背压（backpressure）</strong>
        就是下游告诉上游"先别写了"的机制——Node 流通过 <code>write() === false</code> 与{" "}
        <code>drain</code> 事件实现。
      </Conclusion>

      <Section title="逐段拆解">
        <Prose>
          <p>
            <strong>1. 两种模式</strong>
            ：暂停模式下要主动 <code>read()</code> 拉数据；流动模式下数据自动推过来。{" "}
            <code>pipe</code>/<code>pipeline</code> 会自动管理。
          </p>
          <p>
            <strong>2. highWaterMark</strong>
            ：内部缓冲区阈值（默认 64KB）。超过它 <code>write()</code> 返回 false——
            这不是报错，只是"缓冲区满了，请等 drain"。
          </p>
          <p>
            <strong>3. 正确姿势</strong>
            ：永远用 <code>pipeline</code> 而不是手写 <code>on('data')</code>
            ——它自动处理背压、错误传播和资源清理。
          </p>
        </Prose>
        <CodeBlock
          code={`// 错误：无视背压，文件多大内存涨多快
readable.on('data', chunk => writable.write(chunk));

// 正确：pipeline 全托管
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

await pipeline(
  fs.createReadStream('big.log'),
  createGzip(),
  fs.createWriteStream('big.log.gz'),
);`}
        />
      </Section>

      <Section title="交互演示">
        <BackpressureDemo />
      </Section>

      <Section title="经典追问链">
        <QAChain
          items={[
            {
              q: "write() 返回 false 后继续 write 会怎样？",
              a: "不会报错，数据继续进缓冲区并撑大内存——这正是很多手写流代码 OOM 的原因。返回 false 后应暂停生产，等 drain。",
            },
            {
              q: "pipe 和 pipeline 的区别？",
              a: "pipe 不传播上游错误、出错后不销毁流、不清理中间流，容易留下悬挂句柄。pipeline 一次性解决错误传播与清理，推荐永远用它。",
            },
            {
              q: "objectMode 是什么？",
              a: "让流以 JS 对象为数据单元而不是 Buffer，highWaterMark 的含义从字节变成对象个数。适合逐行解析、数据库游标等场景。",
            },
            {
              q: "Web 流（ReadableStream）和 Node 流怎么互转？",
              a: "Node 17+ 提供 Readable.fromWeb() / Readable.toWeb()。fetch 的 body 就是 Web 流，可用 Readable.fromWeb(res.body) 无缝接入 pipeline。",
            },
          ]}
        />
      </Section>
    </NoteShell>
  );
}

const HIGH_WATER_MARK = 64;

function BackpressureDemo() {
  const [buffer, setBuffer] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const start = (ignoreBackpressure: boolean) => {
    setRunning(true);
    let b = 0;
    const timer = setInterval(() => {
      b += 16;
      if (!ignoreBackpressure && b > HIGH_WATER_MARK) {
        // 遵守背压：暂停写入，等 drain 消费到阈值以下再继续
        setLogs((l) => [...l.slice(-4), `达到 highWaterMark，暂停写入，等待 drain`]);
        b -= 24;
        if (b < 0) b = 0;
        setBuffer(b);
        if (b === 0) {
          setLogs((l) => [...l.slice(-4), "drain 触发，恢复写入"]);
        }
      } else {
        if (ignoreBackpressure && b > HIGH_WATER_MARK) {
          setLogs((l) => [...l.slice(-4), `write() 返回 false 仍继续写 → 缓冲区 ${b}KB 持续膨胀`]);
        }
        setBuffer(b);
        b -= 8;
      }
      if (b <= 0 && (!ignoreBackpressure || b <= 0)) {
        clearInterval(timer);
        setBuffer(0);
        setRunning(false);
        setLogs((l) => [...l.slice(-4), "消费完毕"]);
      }
    }, 300);
  };

  const reset = () => {
    setLogs([]);
    setBuffer(0);
    setRunning(false);
  };

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-surface px-4 py-2 text-xs font-medium text-muted">
        背压模拟器：对比遵守与忽略 highWaterMark 的内存表现
      </div>
      <div className="p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <DemoButton onClick={() => start(false)} disabled={running}>
            正确：等待 drain
          </DemoButton>
          <DemoButton onClick={() => start(true)} variant="danger" disabled={running}>
            错误：无视返回值
          </DemoButton>
          <ResetButton onClick={reset} />
        </div>
        <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              buffer > HIGH_WATER_MARK ? "bg-danger" : "bg-accent"
            }`}
            style={{ width: `${Math.min(buffer / 1.28, 100)}%` }}
          />
        </div>
        <div className="mb-1 flex justify-between text-[10px] text-muted meta-mono">
          <span>
            缓冲区 {buffer}KB / highWaterMark {HIGH_WATER_MARK}KB
          </span>
          <span>{buffer > HIGH_WATER_MARK ? "已超阈值" : "正常"}</span>
        </div>
        <LogPanel logs={logs} placeholder="// 选择一种模式开始模拟" className="min-h-16" />
      </div>
    </div>
  );
}
