import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart, PlayGround } from "@/components/demo";
import { CrossRef, DoDont, Prerequisite } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        正解是 <strong>worker 池</strong>：起 <code>min(maxNum, N)</code> 个 worker，每个 worker
        完成一个任务就立刻从游标领下一个（动态补位），而不是把任务切成固定分片排队（分片会让空位干等组内最慢者）。保序不靠排队，靠
        <strong>按原始索引落位</strong>：<code>results[i]</code> 的写入位置由任务携带的 i
        决定，与完成先后无关。单线程让游标 <code>next++</code> 天然无竞态——唯一的交接点是
        await，它把 worker 让出的时间片还给了事件循环。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "事件循环是怎么调度的：从调用栈到微任务",
            to: "/note/frontend/javascript/event-loop/event-loop-basics",
          },
        ]}
      >
        「并发」在 JS 里是调度的并发，不是执行的并发：worker 之间靠 await
        交出时间片——先有事件循环的心智模型，池子才看得懂。
      </Prerequisite>

      <Heading level={2} title="为什么 Promise.all 不够：分片的空转陷阱" />
      <Paragraph>
        直觉方案是「切成 N/maxNum 组，每组 Promise.all 串行跑」。它的结构性缺陷在
        <strong>组内对齐</strong>
        ：Promise.all
        要等同组最慢的请求完成才开下一组——组内先完成的请求，它的并发位就空转干等。极端例子：每组 3
        个请求里有一个 10 秒慢请求，另外两个 200ms 完成后，两个并发位闲置 9.6
        秒。总吞吐被「最慢的那个」按组扣税。
      </Paragraph>
      <Paragraph>
        worker 池把「组」这个静态结构拆掉了：任何 worker 完成任务，立刻从游标领下一个——
        <strong>并发位永远处于满负荷或任务耗尽两种状态之一</strong>
        ，不存在「等齐再走」。这就是它比分片快的全部来源：调度粒度从「组」细化到「单个任务」。
      </Paragraph>
      <FlowChart
        label="worker 池调度 / pool scheduling"
        height={300}
        data={{
          direction: "TB",
          nodes: [
            { id: "start", label: "启动 min(maxNum, N) 个 worker", color: PALETTE.blue },
            { id: "claim", label: "worker 从游标领任务 next++", color: PALETTE.orange },
            { id: "run", label: "执行请求（await 让出时间片）", color: PALETTE.purple },
            { id: "place", label: "结果写入 results[i]", color: PALETTE.green },
            { id: "done", label: "全部完成 → resolve", color: PALETTE.green },
          ],
          edges: [
            { source: "start", target: "claim" },
            { source: "claim", target: "run" },
            { source: "run", target: "place" },
            { source: "place", target: "claim", label: "循环补位", dashed: true },
            { source: "place", target: "done", label: "游标耗尽且全员归队" },
          ],
        }}
      />

      <Heading level={2} title="两个实现细节：游标的原子性与保序" />
      <Paragraph>
        单线程给了 JS 一个其他语言羡慕的性质：<code>const i = next++</code>{" "}
        不会竞态——同步代码块内不可能被别人插队。但别过度安心：真正的交接点是 <strong>await</strong>
        。worker 在 await 处让出控制权，事件循环去跑别的 worker 的同步段；回到本 worker
        时，它的局部变量（i、闭包状态）毫发无损。所以正确性问题从来不在「游标被抢」，而在「await
        之间共享的可变状态被别人改了」——用局部变量装每轮任务的上下文，是最省心的纪律。
      </Paragraph>
      <DoDont
        label="跨 await 的共享状态 / shared mutable state"
        dont={{
          code: `let cursor = { i: 0 };           // 共享可变对象
async function worker() {
  while (cursor.i < urls.length) {
    results[cursor.i] = await req(urls[cursor.i]);
    // ↑ await 让出期间，cursor.i 已被别的 worker 改掉
    cursor.i++;                    // 恢复后读写的是别人的号
  }
}`,
          note: "读取跨过了 await：恢复后 cursor.i 早已不是发起时的值——跳任务、重复任务、写错下位三种错全来",
        }}
        do={{
          code: `async function worker() {
  while (next < urls.length) {
    const i = next++;              // 同步段内取号，装进局部变量
    results[i] = await req(urls[i]); // await 之后只碰局部 i
  }
}`,
          note: "取号在同步段完成（单线程下不可分割），await 恢复后用的局部 i 不受任何人影响——共享的只剩游标和计数器",
        }}
      />
      <Paragraph>
        保序是另一件与调度完全解耦的事：请求按什么顺序完成不可控（网络抖动），但结果数组的写入位置由任务自带的原始下标
        i 决定——<code>results[i] = await request(urls[i])</code>
        。完成顺序与输出顺序从此无关，也就不需要「排队等前一个完成」这种伪保序。失败处理的默认语义是「占位不中断」：catch
        住把错误对象写进 results[i]，单点失败不拖垮整池。但要说明这是<strong>设计取舍</strong>
        而非唯一正解：Promise.all 式的快速失败——任一失败就整体 reject，同时用 AbortController
        掐掉其余在途请求——同样是合法选型。分界线在业务语义：「能拿多少拿多少」的聚合场景（批量查询）用占位，
        「一票否决」的一致性场景（事务前置校验）用快速失败。要不要重试（Promise.retry）、要不要中止（AbortController
        掐掉在途请求），是这道题的进阶分支。
      </Paragraph>
      <DoDont
        label="失败的默认语义 / failure policy"
        dont={{
          code: `async function worker() {
  while (next < urls.length) {
    const i = next++;
    results[i] = await req(urls[i]); // 不 catch：一次失败
    done++;                          // worker 直接 reject 退场
    if (done === total) resolve(results); // done 永远凑不齐
  }
}`,
          note: "未捕获的失败让 worker 带着未完成的号退场：resolve 永远等不到，调用方悬挂 + unhandled rejection——失败必须就地决策，不能靠「没人抛错」侥幸",
        }}
        do={{
          code: `try {
  results[i] = await req(urls[i]);
} catch (e) {
  results[i] = { url: urls[i], error: e }; // 错误也占一个结果位
}
done++;
if (done === total) resolve(results);      // 池子保证收尾`,
          note: "占位语义下池子一定收尾；要快速失败就显式 reject 整体 Promise 并 abort 其余在途请求——两条路都行，唯独不能悬挂",
        }}
      />
      <DoDont
        label="重试节奏 / retry backoff"
        dont={{
          code: `// 失败后立刻原样重试，间隔为 0
for (let k = 0; k < 3; k++) {
  try { return await fetch(url); } catch { /* 立即下一次 */ }
}`,
          note: "下游抖动时，N 个 worker × M 次重试在同一毫秒集体砸回去——雪崩式重试把「暂时故障」打成「持续宕机」",
        }}
        do={{
          code: `const delay = (ms) => new Promise((r) => setTimeout(r, ms));
for (let k = 0; k < 3; k++) {
  try { return await fetch(url); }
  catch {
    await delay(200 * 2 ** k + Math.random() * 100); // 指数退避 + 抖动
  }
}`,
          note: "指数退避拉开重试时间轴，随机抖动避免同一时刻对齐；重试前先审幂等性——非幂等请求「能重试」之前先问「敢不敢重试」",
        }}
      />
      <PlayGround
        label="游乐场 / concurrency pool"
        height={300}
        code={`function multiRequest(urls, maxNum) {
  return new Promise((resolve) => {
    const results = new Array(urls.length);
    let next = 0;  // 下一个待发任务（游标）
    let done = 0;  // 已完成数量
    async function worker(id) {
      while (next < urls.length) {
        const i = next++;
        console.log('发起 ' + urls[i] + '（worker ' + id + '）');
        try {
          results[i] = await fakeRequest(urls[i]);
        } catch (e) {
          results[i] = '失败: ' + e.message;
        }
        done++;
        if (done === urls.length) resolve(results);
        // 循环继续：完成一个立刻补一个
      }
    }
    for (let w = 0; w < Math.min(maxNum, urls.length); w++) {
      worker(w);
    }
  });
}

function fakeRequest(url) {
  return new Promise((resolve) => {
    const delay = 100 + Math.random() * 400;
    setTimeout(() => resolve(url), delay);
  });
}

const urls = ['/a', '/b', '/c', '/d', '/e', '/f', '/g'];
multiRequest(urls, 3).then((results) => {
  console.log('—— 全部完成，按原始顺序输出：');
  results.forEach((r, i) => console.log(i + 1, r));
});
// 观察日志：发起请求的 worker 固定为 0/1/2，谁完成谁补位
// 观察输出顺序：始终 a~g，与完成先后无关`}
      />

      <Heading level={2} title="整合视角：worker 池与信号量的同构" />
      <Paragraph>
        流行库 p-limit 的实现是另一套形状：信号量计数器 + 等待队列——超额调用返回挂起的 Promise
        进队，每完成一个出队放行一个。它与 worker 池在调度语义上完全等价：都是「N
        个许可，完成即释放，等待者补位」。差别在所有权模型：worker 池由
        <strong>固定数量的执行者</strong>
        主动拉任务（pull），信号量由<strong>任务自己</strong>
        排队等许可（push）。任务同质、数量已知时 worker
        池代码最少；任务动态产生、来源分散时信号量更顺手。
      </Paragraph>
      <Paragraph>
        最后一层工程化是<strong>可取消</strong>
        ：池子只管「同时最多 N 个」，不管「这批还要不要」。用户翻页后，旧页的在途请求应该被
        AbortController 掐掉——fetch 收到 abort 信号后以 AbortError reject，worker 的 catch
        分支接住，池子正常收尾。取消与限流是正交能力，工程里总是成对出现。
      </Paragraph>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "并发控制为什么不能把请求切成固定分片跑 Promise.all？顺序输出怎么保证？",
            intent:
              "热身题考调度模型——「分片等待」与「动态补位」的差异是这道题的第一层，顺序落位是第二层。",
            depth: 2,
            a: "分片方案把 N 个任务切成 N/maxNum 组串行执行：组内快的请求完成后，它的并发位要干等同组最慢的那个才能开始下一组——出现「空位等待」，吞吐量打折。worker 池是动态补位：每个 worker 完成一个立刻从游标领下一个，任何时刻在途数都是满的。顺序输出不靠发起顺序，靠按原始索引落位——results[i] 的写入位置由任务携带的 i 决定，与完成先后无关。",
            bonus:
              "更进一步：worker 数等于 maxNum 但任务数很大时，游标 next++ 的单线程递增在 JS 里天然原子（无并发修改问题）；如果用「Promise 完成后再 push 新 Promise 到 all」的写法，容易写出越界或漏发的 bug——worker 循环是边界最少的形式。",
          },
          {
            q: "游标 next++ 在多个 worker 之间真的没有竞态吗？await 交界处发生了什么？",
            intent:
              "考 JS 并发模型的精确理解——「单线程所以没问题」是半分答案，能画出 await 交界的执行图才是满分。",
            depth: 3,
            a: "没有竞态，但原因要讲准：next++ 是同步段里的操作，同步段在单线程里不可分割——worker A 执行 next++ 时，worker B 一定不在执行代码。真正的交接点是 await：A 在 await 处让出，事件循环调度 B 的同步段执行；A 恢复时带着自己的局部 i 继续，互不干扰。要出错的场景是「把共享可变状态跨 await 使用」——恢复后状态已被别人的同步段改掉。所以纪律是：每轮任务的上下文装在局部变量里，共享的只有受同步段保护的游标与计数器。",
            bonus:
              "对照 Rust/Java：那里的 next++ 需要锁或原子指令，因为线程抢占发生在任意指令间——JS 的抢占只发生在 await/返回边界，这是「协作式并发」的礼物。",
          },
          {
            q: "某个请求失败了，worker 池的默认行为应该是什么？重试怎么做才不雪崩？",
            intent:
              "考失败语义的设计——「占位继续跑」与「失败重试」是两层，能同时说清的是工程级回答。",
            depth: 4,
            a: "默认语义是占位不中断：catch 住把错误标记写进 results[i]，worker 继续领下一个任务——单点失败不拖垮整池（这是它优于裸 Promise.all「一损俱损」的地方）。重试在 worker 内部做局部处理：失败后按次数上限重新发起，而不是把任务塞回游标队列（那会打乱「每任务恰好处理一次」的游标语义）。防雪崩的关键是退避：间隔用指数退避加随机抖动（delay * 2^n + jitter），避免失败请求在同一时刻集体重试把服务端二次打挂。",
            bonus:
              "幂等性是重试的前置审查：GET 可以随便重试，非幂等的 POST 重试可能造成重复下单——「能重试」之前先问「敢不敢重试」。",
          },
          {
            q: "p-limit 的信号量模式和 worker 池在调度语义上等价吗？选型看什么？",
            intent: "考两个形状的等价性辨析——能把 pull 与 push 的所有权差异说清，说明真的都用过。",
            depth: 4,
            a: "调度语义等价：都是「N 个许可，完成即释放，等待者补位」，并发上限与吞吐特性一致。差别在所有权：worker 池是 pull——固定数量的执行者主动从队列拉任务，任务被动等待；信号量是 push——任务自己调用 limit(fn) 进入等待队列，许可释放时队头任务执行。选型看任务形态：任务列表已知且同质（批量上传、抓取分页），worker 池代码最短；任务动态产生、来源分散（用户操作触发的请求各自要限流），信号量把「等许可」内聚进任务自身，代码不打架。p-limit 内部就是计数器 + 队列，读完源码会发现它就是「退化的 worker 池」。",
            bonus:
              "AbortController 与两者都正交：取消要掐的是「在途请求」，池子/信号量只负责准入——工程里取消和限流总是成对设计。",
          },
          {
            q: "实现 Promise.retry：失败自动重试，超过次数才真正 reject，怎么做？",
            intent:
              "压轴题，考 Promise 与 async 的调度功底——while + await 与递归链两条路，能对比优劣的是高分回答。",
            depth: 5,
            a: "async 版最清晰：用 while 循环 try/catch，成功就 return，失败次数减一并 await 一个 sleep 延时后继续，用尽次数抛出最后一次的错误。递归 Promise 链版（fn().catch(() => times > 1 ? retry() : Promise.reject(err))）同样可行但错误传递绕；async 版的语义是平铺的，更好测。关键边界：重试要用同一参数重新调用 fn，而不是复用失败的 Promise 实例——它已经定格为 rejected，再 then 也不会重跑。",
            bonus:
              "工程加分项：间隔用指数退避（delay * 2^n + 随机抖动）避免雪崩式重试；每次重试 emit 进度事件让上层可观测——「能重试」和「重试得体面」差的是这两步。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "防抖和节流到底差在哪？",
            to: "/note/frontend/javascript/patterns/debounce-throttle",
            description: "同族「节奏控制」问题的低阶形态：控制事件频率而非请求并发。",
          },
          {
            title: "事件循环是怎么调度的：从调用栈到微任务",
            to: "/note/frontend/javascript/event-loop/event-loop-basics",
            description: "worker「并发」的本质：await 边界上的时间片交接。",
          },
        ]}
      />
    </NoteShell>
  );
}
