import { useState } from "react";
import CodeBlock from "@/components/demo/CodeBlock";

export default function Note() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border-l-4 border-accent bg-accent/5 p-4">
        <h2 className="mb-1 font-semibold">结论先行</h2>
        <p className="text-sm leading-relaxed">
          生产速度 &gt; 消费速度时，数据会在内存里无限堆积。
          <strong>背压（backpressure）</strong>就是下游告诉上游"先别写了"的机制—— Node 流通过{" "}
          <code>write() === false</code> 与 <code>drain</code> 事件实现。
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">逐段拆解</h2>
        <div className="space-y-4 text-sm leading-relaxed">
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
            ：永远用 <code>pipeline</code> 而不是手写 <code>on('data')</code>——
            它自动处理背压、错误传播和资源清理。
          </p>
        </div>
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
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">交互演示</h2>
        <BackpressureDemo />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">经典追问链</h2>
        <div className="space-y-3 text-sm leading-relaxed">
          <QA
            q="write() 返回 false 后继续 write 会怎样？"
            a="不会报错，数据继续进缓冲区并撑大内存——这正是很多手写流代码 OOM 的原因。返回 false 后应暂停生产，等 drain。"
          />
          <QA
            q="pipe 和 pipeline 的区别？"
            a="pipe 不传播上游错误、出错后不销毁流、不清理中间流，容易留下悬挂句柄。pipeline 一次性解决错误传播与清理，推荐永远用它。"
          />
          <QA
            q="objectMode 是什么？"
            a="让流以 JS 对象为数据单元而不是 Buffer，highWaterMark 的含义从字节变成对象个数。适合逐行解析、数据库游标等场景。"
          />
          <QA
            q="Web 流（ReadableStream）和 Node 流怎么互转？"
            a="Node 17+ 提供 Readable.fromWeb() / Readable.toWeb()。fetch 的 body 就是 Web 流，可用 Readable.fromWeb(res.body) 无缝接入 pipeline。"
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

function BackpressureDemo() {
  const [buffer, setBuffer] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const hwm = 64;
  const [running, setRunning] = useState(false);
  const [ignore, setIgnore] = useState(false);

  const start = () => {
    setRunning(true);
    let b = 0;
    const timer = setInterval(() => {
      b += 16;
      if (ignore || b <= hwm) {
        setBuffer(b);
        if (ignore && b > hwm) {
          setLogs((l) => [...l.slice(-4), `write() 返回 false 仍继续写 → 缓冲区 ${b}KB 持续膨胀`]);
        }
        if (!ignore && b > hwm) {
          setLogs((l) => [...l.slice(-4), `达到 highWaterMark(${hwm}KB)，暂停写入，等待 drain`]);
          b = hwm;
          setBuffer(b);
        }
      } else if (!ignore) {
        b -= 24;
        setBuffer(b);
        setLogs((l) => [...l.slice(-4), `drain 事件触发，恢复写入`]);
      } else {
        b -= 24;
        setBuffer(b);
      }
      if (b <= 0) {
        clearInterval(timer);
        setRunning(false);
        setLogs((l) => [...l.slice(-4), "消费完毕"]);
      }
    }, 300);
  };

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
        背压模拟器：对比遵守与忽略 highWaterMark 的内存表现
      </div>
      <div className="p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={running}
            onClick={() => {
              setIgnore(false);
              start();
            }}
            className="rounded bg-accent px-3 py-1.5 text-xs text-accent-foreground disabled:opacity-40"
          >
            正确：等待 drain
          </button>
          <button
            type="button"
            disabled={running}
            onClick={() => {
              setIgnore(true);
              start();
            }}
            className="rounded border border-danger px-3 py-1.5 text-xs text-danger disabled:opacity-40"
          >
            错误：无视返回值
          </button>
          <button
            type="button"
            onClick={() => {
              setLogs([]);
              setBuffer(0);
              setRunning(false);
            }}
            className="ml-auto rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            重置
          </button>
        </div>
        <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              buffer > hwm ? "bg-danger" : "bg-accent"
            }`}
            style={{ width: `${Math.min(buffer / 1.28, 100)}%` }}
          />
        </div>
        <div className="mb-3 flex justify-between text-[10px] text-muted meta-mono">
          <span>
            缓冲区 {buffer}KB / highWaterMark {hwm}KB
          </span>
          <span>{buffer > hwm ? "已超阈值" : "正常"}</span>
        </div>
        <div className="min-h-16 rounded bg-[#0d1117] p-2 font-mono text-xs text-green-400">
          {logs.length === 0 ? (
            <span className="text-gray-500">// 选择一种模式开始模拟</span>
          ) : (
            logs.map((l, i) => <div key={i}>{l}</div>)
          )}
        </div>
      </div>
    </div>
  );
}
