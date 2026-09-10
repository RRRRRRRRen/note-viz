import { useRef, useState } from "react";
import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock, DemoButton, LogPanel, ResetButton } from "@/components/demo";
import { DoDont, MemoryCard, OutputTimeline, Prerequisite, CrossRef } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Prerequisite
        notes={[
          {
            title: "事件循环是怎么调度的：从调用栈到微任务",
            to: "/note/frontend/javascript/event-loop/event-loop-basics",
          },
        ]}
      >
        流的读写全是异步回调：理解事件循环如何调度宏任务，才能理解 drain
        为什么在「之后某个时刻」触发。
      </Prerequisite>

      <Conclusion>
        <code>write() === false</code> 不是错误——数据已经照常进入内部缓冲，它只是一句提醒：
        <strong>缓冲已达 highWaterMark，消费跟不上了</strong>
        。无视它程序不会崩，但缓冲会随生产无限膨胀， 直到 OOM。正确反应是三步：
        <strong>暂停生产 → 监听 drain（缓冲被消费清空时触发）→ 恢复写入</strong>。
        这套循环手写容易漏，<code>pipe</code>/<code>pipeline</code> 已把它自动化——所以生产代码永远用{" "}
        <code>pipeline</code>：背压传导、错误传播、资源清理三件事一起接管。
      </Conclusion>

      <Heading level={2} title="两种模式：流动与暂停" />
      <Paragraph>
        Readable 有两种把数据交给你的方式。<strong>流动模式</strong>：监听 <code>data</code>{" "}
        事件或调用 <code>resume()</code>{" "}
        后，数据被持续自动推过来，你必须立刻接住每一块，没人问你要不要；
        <strong>暂停模式</strong>：流停在内部缓冲区里，等你显式调用 <code>read()</code>{" "}
        才拉取。两种模式随时切换：挂上 <code>data</code> 监听进入流动，<code>pause()</code>{" "}
        或移除监听退回暂停。
      </Paragraph>
      <Paragraph>
        为什么非要一个「暂停」模式？因为背压需要物理基础：下游必须有能力让上游停下来，缓冲才不会失控。
        暂停模式就是上游的刹车，流动模式是松开刹车滑行。一个事实要先接受：Readable
        不会因为「你还没读」就停止生产——它只会在缓冲超过水位线后停下来等你。下游的所有控制手段，最终都落在
        pause/resume 这对原语上，<code>pipe</code> 的全部工作也只是在正确时机踩刹车。
      </Paragraph>

      <Heading level={2} title="highWaterMark：水位线，不是上限" />
      <Paragraph>
        可读流和可写流内部都有缓冲区，<code>highWaterMark</code> 是它的<strong>阈值</strong>。
        语义必须精确：超过阈值<strong>不报错、不丢数据、也不阻止写入</strong>——它只改变两件事：
        <code>write()</code> 的返回值变成 <code>false</code>，以及流开始向外发出「该缓一缓」的信号。
        它是水位线不是容量上限：水位线之上的缓冲照单全收，内存最终涨多高，完全取决于你是否尊重那个返回值。
      </Paragraph>
      <Paragraph>
        数值上有一个常见误区要修正——「默认 64KB」只对字节流成立，且 objectMode
        下水位线的计量单位会整个换掉。以下是本机 Node v22.17.0 的实测值：
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`import * as fs from "node:fs";
import { Readable, Writable } from "node:stream";

new Readable().readableHighWaterMark;                      // 65536（64KiB）
new Writable().writableHighWaterMark;                      // 65536（64KiB）
new Readable({ objectMode: true }).readableHighWaterMark;  // 16（16 个对象，不是字节）
fs.createReadStream("big.log").readableHighWaterMark;      // 65536
fs.createWriteStream("out.log").writableHighWaterMark;     // 65536`}
      />
      <MemoryCard keyword="水位线是信号阈值，不是容量上限" color="#1677ff">
        字节流默认 <strong>64KiB</strong>，objectMode 默认 <strong>16 个对象</strong>
        。越过它只有两个后果：
        <code>write()</code> 返回 <code>false</code>、内部 needDrain
        置位——不抛错、不拦截、不丢数据。
      </MemoryCard>

      <Heading level={2} title="write() 返回 false 与 drain 的精确时机" />
      <Paragraph>
        <code>write(chunk)</code> 把数据排进缓冲区后<strong>立刻返回</strong>
        ——「写」永远是异步完成的，返回值描述的是排队后的缓冲状态：<code>true</code>{" "}
        表示还没到水位线，可以继续；<code>false</code> 表示这条写入让 <code>writableLength</code>{" "}
        达到了 <code>highWaterMark</code>，内部 needDrain 随之置位（<code>writableNeedDrain</code>{" "}
        可读）。此时正确的动作是停止生产，等 <code>drain</code> 事件。
      </Paragraph>
      <Paragraph>
        drain 的时机有精确答案：<strong>缓冲被底层消费到清空时</strong>。每块数据真正写完（write
        回调被调用）缓冲就少一块，清空那一刻若 needDrain 置位，drain 触发。用一段可复现的代码验证：
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`import { Buffer } from "node:buffer";
import { Writable } from "node:stream";

const ws = new Writable({
  highWaterMark: 16 * 1024,                 // 16KiB 水位线，方便演示
  write(chunk, enc, cb) { setTimeout(cb, 40); }, // 模拟慢消费：40ms 才写完一块
});

console.log("write #1 ->", ws.write(Buffer.alloc(8 * 1024)));
console.log("write #2 ->", ws.write(Buffer.alloc(8 * 1024)));
ws.on("drain", () =>
  console.log("drain, writableLength =", ws.writableLength),
);
// write #1 -> true
// write #2 -> false
// drain, writableLength = 0        （约 80ms 后）`}
      />
      <OutputTimeline
        label="输出解读 / drain timing"
        steps={[
          {
            output: "write #1 -> true",
            phase: "同步",
            why: "写入后 writableLength = 8192，未达 16384 水位线，缓冲有余量，立刻返回 true。",
          },
          {
            output: "write #2 -> false",
            phase: "同步",
            why: "这条写入让 writableLength 达到 16384、正好触及水位线——返回 false，内部 needDrain 置位，但数据照常入队，没有任何失败。",
          },
          {
            output: "drain, writableLength = 0",
            phase: "宏任务",
            why: "两条 chunk 的 write 回调（各 40ms）先后完成，缓冲被消费清空的那一刻触发 drain——此刻才适合恢复写入。",
          },
        ]}
      />
      <Paragraph>
        注意一个不对称：<code>drain</code> <strong>只会在收到过 false 之后发出</strong>
        ——没收到过 false，缓冲再怎么被消费也不会有 drain。恢复写入后若再次越过水位线，needDrain
        再次置位，要再次等待。「write → false → 等 drain →
        恢复」是一个可以循环任意次的状态机，不是一次性开关。
      </Paragraph>

      <Heading level={2} title="pipe 与 pipeline 如何传导背压" />
      <Paragraph>
        手写传导就是那三步：data 回调里 <code>write()</code> 返回 false 时对源调{" "}
        <code>pause()</code>；收到 <code>drain</code> 后 <code>resume()</code>。<code>pipe</code>{" "}
        内部做的正是这件事，可以用两个事件把它看穿——下游消费慢时，readable 反复被 pause，
        每消费完一块才被 resume，生产速度被强行拉平到消费速度（Node v22.17.0 实测日志）：
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`import { Buffer } from "node:buffer";
import { Readable, Writable } from "node:stream";

const src = Readable.from(
  (function* () {
    for (let i = 0; i < 6; i++) yield Buffer.alloc(16 * 1024, i);
  })(),
  { highWaterMark: 16 * 1024 },
);
const sink = new Writable({
  highWaterMark: 16 * 1024,
  write(c, e, cb) { setTimeout(() => { console.log("消费", c[0]); cb(); }, 60); },
});

src.on("pause", () => console.log(">> readable 被 pause（背压传导）"));
src.on("resume", () => console.log(">> readable resume"));
src.pipe(sink);

// 日志（节选，实测）：resume 与 pause 反复交替——
// >> readable resume
// >> readable 被 pause（背压传导）
// 消费 0
// >> readable resume
// >> readable 被 pause（背压传导）
// 消费 1 …`}
      />
      <Paragraph>
        <code>pipeline</code> 在 pipe 的传导之上补齐了另外两件事：<strong>错误传播</strong>与{" "}
        <strong>资源清理</strong>。pipe 不监听上游错误，任一段出错其余段不知情；pipeline
        把整条链当一个整体——任一段出错，Promise 以该错误 reject，所有段（包括中间的
        Transform）被逐个 destroy，不会留下悬挂句柄。下面的实测里 transform 中途抛错，异常被抛给
        await，源流被销毁：
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const src = Readable.from([1, 2, 3]);
try {
  await pipeline(
    src,
    async function* (chunks) {
      for await (const c of chunks) {
        if (c === 2) throw new Error("transform 炸了");
        yield c;
      }
    },
    async (chunks) => { for await (const c of chunks) { /* 消费 */ } },
  );
} catch (e) {
  console.log("捕获:", (e as Error).message);      // 捕获: transform 炸了
  console.log("src.destroyed:", src.destroyed);    // src.destroyed: true
}`}
      />
      <Paragraph>
        Node 17+ 推荐 <code>node:stream/promises</code> 的 <code>pipeline</code>
        ：返回 Promise 可进 async 流程，还支持传 <code>AbortSignal</code> 中断整条链。 手写{" "}
        <code>on("data")</code>{" "}
        循环的时代，这三件事（背压、错误、清理）每一件都要自己写对——遗漏任何一件都不会在写代码时报错，只在生产环境报内存或句柄问题。
      </Paragraph>

      <Heading level={2} title="交互演示" />
      <BackpressureDemo />

      <Heading level={2} title="边界与陷阱" />
      <DoDont
        label="背压响应 / respect false"
        dont={{
          code: `readable.on("data", (chunk) => {
  ws.write(chunk); // 返回值被丢弃
});`,
          note: "返回 false 后照写不误，缓冲无限膨胀——文件多大内存涨多快，这是手写流代码 OOM 的头号成因。",
        }}
        do={{
          code: `readable.on("data", (chunk) => {
  if (!ws.write(chunk)) {
    readable.pause();                          // 暂停生产
    ws.once("drain", () => readable.resume()); // 缓冲清空再恢复
  }
});`,
          note: "检查返回值 → 暂停 → drain 恢复，三步就是背压的全部——也是 pipe 内部做的事。",
        }}
      />
      <DoDont
        label="错误传播 / pipe vs pipeline"
        dont={{
          code: `fs.createReadStream("big.log")
  .pipe(gzip)
  .pipe(fs.createWriteStream("big.log.gz"));
// 任一段出错：无通知、不销毁、句柄悬挂`,
          note: "pipe 零错误处理：源或目标出错后其余段毫不知情，fd 不释放，进程可能挂而不退。",
        }}
        do={{
          code: `await pipeline(
  fs.createReadStream("big.log"),
  gzip,
  fs.createWriteStream("big.log.gz"),
); // 任一段出错：Promise reject + 全链 destroy`,
          note: "pipeline 把错误传播与逐段销毁收进一个函数，node:stream/promises 一行接管。",
        }}
      />
      <DoDont
        label="error 与 destroy / resource cleanup"
        dont={{
          code: `ws.on("drain", doWrite); // 只关心恢复写入
// 没监听 error；出错后也没人调 destroy`,
          note: "流上没有 error 监听器时，错误会以 unhandled error event 直接击穿进程；不 destroy 则 fd/Socket 不释放。",
        }}
        do={{
          code: `ws.on("error", (err) => {
  console.error(err);
  ws.destroy(); // 显式释放底层资源
});`,
          note: "或者干脆交给 pipeline：error 监听与 destroy 都是它的内置动作，不需要逐流手写。",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "write() 返回 false 之后继续 write，会报错或丢数据吗？",
            intent:
              "考返回值语义的精确理解——不少人把 false 当「写入失败」去处理，方向从一开始就错了。",
            depth: 3,
            a: "都不会。false 不是错误：数据照单全收排进内部缓冲，返回值只是「缓冲已达水位线，消费跟不上了」的建议信号。继续写完全合法，后果只有一个——writableLength 持续增长、内存膨胀。所以背压是性能与稳定性问题（内存、延迟），不是正确性问题：程序不会崩，只会被内存一点点压死。",
            bonus:
              "排查手段：writableLength 看积压字节数，writableNeedDrain 看是否正处于「等 drain」状态——内存曲线陡增时先看这两个值。",
          },
          {
            q: "drain 到底什么时候触发？缓冲降到水位线以下就会触发吗？",
            intent:
              "「返回 false 就等 drain」人人会背，但 drain 的精确时机大多数人答不出——这题区分背下来的和真懂的。",
            depth: 3,
            a: "不是。drain 的前提是先收到过 false（needDrain 置位）；触发时机是缓冲被底层消费到清空——实测 Node v22.17.0：16KiB 水位线连写两条 8KiB，第二条返回 false，约 80ms 后 drain 触发，此刻 writableLength === 0。恢复写入后若再次越过水位线，要再次等 drain——它是可循环的状态机，不是一次性开关。",
            bonus:
              '恢复写入的惯用写法是 ws.once("drain", resume 生产循环)——用 on 反复注册是典型泄漏源。',
          },
          {
            q: "objectMode 下 highWaterMark 的语义有什么不同？会埋什么坑？",
            intent:
              "考「水位线 = 字节数」这个默认心智在对象流下的失效——逐行解析、数据库游标都是 objectMode 重灾区。",
            depth: 4,
            a: "计数单位从字节换成「对象个数」，默认 16 个。坑在量纲错觉：64KiB 字节水位线对应确定的内存上界，而 16 个对象可能是 16 个 10 字节的小 JSON，也可能是 16 张 50MB 的图片——水位线不再对应任何内存上界。所以 objectMode 流的 highWaterMark 要按「单对象平均大小 × 可接受积压数」重新估算，宁可调小。",
            bonus:
              "字节流同样是估计而非承诺：write 一个 10MB 的 Buffer 一次就能越过 64KiB 水位线——水位线约束的是缓冲总量，不是单次写入大小。",
          },
          {
            q: "pipe 和 pipeline 在错误处理上到底差在哪？",
            intent:
              "高频对比题——答出「pipeline 会传播错误」只是及格线，面试官想听的是出错之后每段流各自处于什么状态。",
            depth: 4,
            a: "核心差异是「出错后谁负责善后」。readable.pipe(writable) 不监听上游错误：任一段出错，其余段不会被通知也不会被销毁——可写流里已缓冲的数据悬挂、fd 不释放，进程可能既不退出也不干活。pipeline 把整条链当一个整体：任一段出错，Promise 以该错误 reject，且所有段（包括中间 Transform）被逐个 destroy，资源确定释放。",
            bonus:
              "cleanup 细节：pipe 时代要自己给每段挂 error 监听、把错误转发给下一段、必要时 unpipe 并 destroy 中间流——n 段管道要连 n×(n-1) 条错误线；pipeline 把连线和销毁顺序全部收进一个函数，这才是「永远 pipeline」的完整理由。",
          },
          {
            q: "为什么 write() 设计成永不失败，背压用返回值加事件表达，而不是阻塞或抛错？",
            intent:
              "压轴题，从 API 细节跳到设计取舍——考是否理解 Node 异步模型的根约束：事件循环不能被阻塞。",
            depth: 5,
            a: "因为流跑在单线程事件循环上。write 若同步阻塞到数据真正落盘或发出，一个慢消费者就能冻结整个进程；若把「下游变慢」设计成抛错，又把正常波动误报成故障。所以 Node 把「写」建模为入队后立即返回，用返回值和 drain 事件表达下游承载力——代价是把尊重背压的责任交给每个调用者，写错的代码不报错、只吃内存。后续 API 的演进一直在收回这个责任：pipe 自动传导，pipeline 自动清理与传播，for await...of 让消费端根本碰不到 write——抽象层级越高，越难写错。",
            bonus:
              "同一约束在 Web Streams 里换了表达：ReadableStream 用 desiredSize 暴露水位、用 pull 让下游反向拉取——背压是所有流抽象的必修课，区别只是信号的形状。",
          },
        ]}
      />

      <Heading level={2} title="写在最后" />
      <Paragraph>
        背压的本质只有一句话：<strong>让生产速率服从消费能力</strong>。流的世界用 write 返回值与
        drain
        事件表达它；没有流的世界里，同一个问题以「并发数失控」的面目出现——下一站可以看看无流场景下的同一道题：
        怎么把并发请求数限制在 N 以内。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "怎么把并发请求数限制在 N 以内？",
            to: "/note/frontend/javascript/patterns/concurrency-pool",
            description:
              "背压的孪生问题：没有流时可用的生产节流手段——并发池，同样是让生产服从承载能力。",
          },
        ]}
      />
    </NoteShell>
  );
}

const HIGH_WATER_MARK = 64; // 水位线 64KB
const CHUNK = 32; // 每周期生产 32KB
const CONSUME = 16; // 每周期消费 16KB（消费慢于生产：背压出现的前提）
const TICKS = 24; // 「等待 drain」模式的演示周期数
const CAP = 512; // 无视背压模式的封顶（定格为「OOM」）

function BackpressureDemo() {
  const [buffer, setBuffer] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const appendLog = (msg: string) => setLogs((l) => [...l.slice(-4), msg]);

  const stop = (timer: ReturnType<typeof setInterval>) => {
    clearInterval(timer);
    timerRef.current = null;
    setRunning(false);
  };

  const start = (ignoreBackpressure: boolean) => {
    setRunning(true);
    let b = 0;
    let ticks = 0;
    let paused = false;
    const timer = setInterval(() => {
      ticks += 1;
      // 生产侧：write()
      if (ignoreBackpressure || !paused) {
        b += CHUNK;
        if (!ignoreBackpressure && b > HIGH_WATER_MARK) {
          paused = true;
          appendLog(`缓冲 ${b}KB ≥ highWaterMark → write() 返回 false，暂停写入等 drain`);
        }
      } else if (paused && ticks === 5) {
        appendLog(`已暂停（缓冲 ${b}KB ≥ ${HIGH_WATER_MARK}KB），等待 drain`);
      }
      // 消费侧：底层每周期消费 16KB
      b = Math.max(0, b - CONSUME);
      // drain：缓冲被消费清空，恢复写入
      if (!ignoreBackpressure && paused && b === 0) {
        paused = false;
        appendLog("drain 触发（缓冲区清空）→ 恢复写入");
      }
      setBuffer(b);
      // 无视背压：缓冲持续膨胀，封顶定格演示 OOM
      if (ignoreBackpressure) {
        if (b > HIGH_WATER_MARK && b % 128 === 0) {
          appendLog(`write() 返回 false 仍继续写 → 缓冲区 ${b}KB 持续膨胀`);
        }
        if (b >= CAP) {
          setBuffer(CAP);
          appendLog(`缓冲区 ${CAP}KB 封顶定格 → 真实场景内存继续膨胀直至 OOM`);
          stop(timer);
          return;
        }
      }
      // 「等待 drain」模式：演示固定周期后收尾
      if (!ignoreBackpressure && ticks >= TICKS) {
        appendLog(`${TICKS} 个周期过去，缓冲区始终在水位线附近震荡——这就是背压在兜底`);
        stop(timer);
      }
    }, 150);
    timerRef.current = timer;
  };

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setLogs([]);
    setBuffer(0);
    setRunning(false);
  };

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-surface px-4 py-2 text-xs font-medium text-muted">
        背压模拟器：对比遵守与忽略 highWaterMark 的缓冲表现
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
            className={`h-full rounded-full transition-all duration-150 ${
              buffer > HIGH_WATER_MARK ? "bg-danger" : "bg-accent"
            }`}
            style={{ width: `${Math.min(buffer / 5.12, 100)}%` }}
          />
        </div>
        <div className="mb-1 flex justify-between text-[10px] text-muted meta-mono">
          <span>
            缓冲区 {buffer}KB / highWaterMark {HIGH_WATER_MARK}KB
          </span>
          <span>{buffer > HIGH_WATER_MARK ? "已超水位线" : "正常"}</span>
        </div>
        <LogPanel logs={logs} placeholder="// 选择一种模式开始模拟" className="min-h-16" />
      </div>
    </div>
  );
}
