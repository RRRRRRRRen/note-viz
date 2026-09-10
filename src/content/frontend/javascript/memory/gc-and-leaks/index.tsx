import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock } from "@/components/demo";
import {
  BarChart,
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
} from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        现代 JS 引擎用<strong>标记清除</strong>
        ：从根（全局对象、当前调用栈、宿主注册的引用）出发标记所有可达对象， 清除不可达者——
        <strong>「能否从根访问到」决定生死</strong>，而不是引用数。 泄漏的本质是
        <strong>对象已经没用、但仍然被一条从根出发的引用链挂着</strong>：
        意外全局变量、被遗忘的定时器、脱离 DOM
        的引用、闭包的多余捕获——四类事故的共性都是「引用链没断」。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "闭包到底是什么：词法环境的快照",
            to: "/note/frontend/javascript/closure/closure-basics",
          },
        ]}
      >
        闭包捕获的变量活在词法环境里——「泄漏是引用链没断」这件事，从闭包的视角最容易看懂。
      </Prerequisite>

      <Heading level={2} title="技术对照：JVM 的可达性分析" />
      <Paragraph>
        V8 的标记清除与 <strong>JVM / .NET 的可达性分析</strong>
        同源，理解一个就理解了全部：GC 从<strong>根集合</strong>
        （全局对象、当前调用栈上各帧的局部变量、宿主注册的原生引用）出发，顺着引用链遍历——能摸到的对象打上「存活」标记；
        遍历结束后仍没被摸到的，整块回收。判断依据是「是否从根顺着摸得到」，而不是「还有几个人引用它」。
      </Paragraph>
      <Paragraph>
        这套模型回收循环引用轻而易举：两个对象互相持有引用，但只要从根摸不到它们，双双标记为垃圾。对照之下，
        早期的<strong>引用计数</strong>（COM 的 AddRef/Release、Python
        底层策略之一）给每个对象维护「被引用数」，
        归零立即释放——听起来更及时，却在循环引用上致命：互相引用的对象计数永远 ≥ 1，谁也到不了零。
      </Paragraph>

      <Heading level={2} title="标记清除 vs 引用计数" />
      <Paragraph>
        标记清除的代价是「批量」：回收发生在 GC
        调度决定的那一刻，对象不可达后要等下一轮回收周期才真正释放， 全量标记阶段还需要
        stop-the-world。引用计数的优势恰好是「即时」：计数归零的瞬间就释放，
        延迟最低——但它为每次引用赋值都付出维护计数的开销，而且如前所述<strong>处理不了环</strong>。
        IE 6/7 时代的著名泄漏正源于此：JS 对象与 DOM 对象分属两套引用计数体系，
        互相引用时双方的计数都下不来，页面关掉才释放——这也是现代引擎全面转向标记清除的历史动因。
      </Paragraph>
      <CompareTable
        label="回收算法对比 / mark-sweep vs refcount"
        left={{ title: "标记清除（主流）", color: "#1677ff" }}
        right={{ title: "引用计数（已淘汰）", color: "#f85149" }}
        rows={[
          {
            aspect: "原理",
            left: "从根集合出发遍历引用链：可达打标，遍历结束清掉未标记者",
            right: "每个对象维护被引用计数：引用建立 +1、断开 −1",
          },
          {
            aspect: "循环引用",
            left: "正确回收——判断依据是可达性，互指但从根不可达照样清",
            right: "致命弱点：互指双方计数恒 ≥ 1，永不归零，双双泄漏",
          },
          {
            aspect: "实现方",
            left: "现代 JS 引擎全部采用（V8 / JavaScriptCore / SpiderMonkey）",
            right: "IE 时代的 BOM/DOM（COM 计数）；Python 与 COM 至今仍用、需配辅助环收集器",
          },
          {
            aspect: "释放时机",
            left: "批量：由 GC 调度决定，不可达后延迟到下一轮回收周期",
            right: "即时：计数归零立刻释放，延迟最低，但每次赋值都有维护开销",
          },
        ]}
      />
      <MemoryCard keyword="泄漏的定义">
        GC 管「不可达」的对象，<strong>管不了「可达但没用」的对象</strong>
        ——只要还挂着一条从根出发的引用链，再大的对象也不会被回收。排查泄漏 = 找出这条链。
      </MemoryCard>

      <Heading level={2} title="四种经典泄漏场景" />
      <Paragraph>
        以下场景均为浏览器环境行为（Chrome
        最新稳定版验证），每个场景都值得用「引用链」的语言复述一遍—— 这是把「知道 leak」升级为「能修
        leak」的分界线。
      </Paragraph>

      <Heading level={3} title="1. 意外的全局变量" />
      <Paragraph>
        非严格模式下给未声明变量赋值，引擎会<strong>顺手在全局对象上创建属性</strong>
        ：函数里写 <code>name = 'Global leak'</code>，name 就挂到了 <code>globalThis</code>{" "}
        上。引用链层面，全局对象本身就是 GC 的根——根直接可达意味着这个属性<strong>永远存活</strong>
        ， 与「还有没有用」无关，函数返回后也不会消失。
      </Paragraph>
      <Paragraph>
        防御在语言层就给好了：<code>'use strict'</code> 让这行直接抛 ReferenceError， ESM
        模块代码默认运行在严格模式；ESLint 的 no-undef 规则能在提交前拦住。
        变体同样要警惕——非严格模式的普通函数里 <code>this</code> 指向全局对象， 给{" "}
        <code>this.xxx</code> 赋值是同一种事故的隐写法。
      </Paragraph>
      <CodeBlock
        lang="javascript"
        code={`function leak() {
  name = "Global leak"; // 非严格模式：漏写声明 → 挂到 globalThis
}
leak();
// 严格模式（ESM 默认开启）下这行直接抛 ReferenceError`}
      />

      <Heading level={3} title="2. 被遗忘的定时器" />
      <Paragraph>
        场景：模块里用 <code>setInterval</code> 周期刷新状态，闭包引用了大数组 data； 后来节点从 DOM
        移除、页面也不再需要刷新，但定时器从未清除。引用链层面： 宿主环境维护着一张
        <strong>定时器表</strong>——表项持有回调函数，回调闭包引用词法环境， 词法环境里躺着
        data。这条链从「宿主注册的引用」这个根出发，全程强引用： 只要表项还在，data
        与回调就都不可达判定为「存活」。
      </Paragraph>
      <Paragraph>
        容易误判的是「节点都移除了，定时器应该自己停了吧」——不会。 DOM
        子树的移除只断开节点与文档的关联，<strong>定时器链路完全不动</strong>； 回调里的{" "}
        <code>document.getElementById</code> 拿到 null 只是不再更新文本，data 照常被持有。
        收尾动作只有一种：<code>clearInterval(timer)</code>——把表项删掉，链条才断。
      </Paragraph>
      <CodeBlock
        lang="javascript"
        code={`const data = new Array(1_000_000).fill("x");

const timer = setInterval(() => {
  const node = document.getElementById("status");
  if (node) node.textContent = String(data.length);
}, 1000);

// 节点移除后定时器仍在跑：定时器表 → 回调闭包 → data
// 收尾：clearInterval(timer)`}
      />

      <Heading level={3} title="3. 脱离 DOM 的引用（游离节点）" />
      <Paragraph>
        场景：把某个按钮的引用缓存在 JS 对象里，之后用 <code>removeChild</code> 把它从文档移除。
        树里已经没有这个节点了，但 JS 变量仍然持有它——这就是
        <strong>游离（detached）DOM 节点</strong>： 从 DOM 树的视角它已经删除，从 GC
        的视角它依然从根可达。
      </Paragraph>
      <Paragraph>
        引用链层面的代价常被低估：一个 DOM 节点持有的是<strong>整棵子树</strong>——
        子元素、监听器、关联的样式全算在内，实际占用远超「一个节点」的直觉。 在 Memory
        面板的堆快照里搜 Detached，能直接看到这些树外存活的节点； 它们的 Retained Size
        往往大得惊人。收尾：缓存用完置 <code>null</code>， 或者从一开始就用 WeakMap 存「节点 →
        元数据」的关联。
      </Paragraph>
      <CodeBlock
        lang="javascript"
        code={`const cache = { button: document.getElementById("submit") };

document.body.removeChild(document.getElementById("submit"));
// DOM 树里已无此节点，但 cache.button 仍整棵持有它

cache.button = null; // 用完置空，链条才断`}
      />

      <Heading level={3} title="4. 闭包的多余捕获" />
      <Paragraph>
        场景：回调只需要一个 <code>id</code> 字符串，却顺手引用了外层的 <code>element</code>——
        于是整个 DOM 节点被挂进了回调的可存活集。引用链层面：闭包捕获的是
        <strong>整个词法环境</strong>
        （实现上，同一作用域的内嵌函数共享同一个环境记录），而不是「用到的那个变量」——
        环境里任何一个变量被引用，环境里所有绑定都跟着延长寿命。
      </Paragraph>
      <Paragraph>
        两种改法。旧写法的解法是把不再需要的引用<strong>置空</strong>（<code>element = null</code>
        ），手动切断链条；更稳的现代写法是<strong>先提取、再闭包</strong>
        ：进入回调之前把需要的字段取到新局部变量，
        让大对象根本不进入回调的词法环境——链条从源头就不存在，无需事后清理。
      </Paragraph>
      <CodeBlock
        lang="javascript"
        code={`function assignHandler() {
  const element = document.getElementById("big-panel");
  const id = element.id;

  element.onclick = () => {
    console.log(id); // 只用 id，闭包却把 element 带进了存活集
  };

  element = null; // 改进：切断不必要的引用链
  // 更稳：先提取字段再创建闭包，让大对象不进词法环境
}`}
      />

      <Heading level={2} title="边界与陷阱：持有与清理对照" />
      <Paragraph>
        四组最常见的「错误持有 vs 正确清理」，全部是同一条原理的变体：
        <strong>你注册出去的每一条引用，都要设计好它的断开时机</strong>。
      </Paragraph>
      <DoDont
        label="定时器未清理 / timer cleanup"
        dont={{
          code: `useEffect(() => {
  setInterval(pollStatus, 5000);
  // 组件卸载后回调仍每 5 秒触发，
  // 闭包持有的 props/state 全部常驻
}, []);`,
          note: "定时器不会随组件卸载自动消失——表项不删，引用链就在",
        }}
        do={{
          code: `useEffect(() => {
  const id = setInterval(pollStatus, 5000);
  return () => clearInterval(id); // 卸载即断链
}, []);`,
          note: "注册与清理成对出现：把清理函数交给卸载流程",
        }}
      />
      <DoDont
        label="事件监听未解绑 / listener cleanup"
        dont={{
          code: `function mount(el) {
  el.addEventListener("resize", onResize);
  // 没有 removeEventListener 的对偶调用：
  // 监听器由目标节点持有，el 活多久它跟多久
}`,
          note: "监听器是节点对回调的强引用——回调闭包里的状态跟着节点寿命走",
        }}
        do={{
          code: `function mount(el) {
  const ac = new AbortController();
  el.addEventListener("resize", onResize, {
    signal: ac.signal,
  });
  return () => ac.abort(); // 一次解绑该信号上的全部监听
}`,
          note: "AbortSignal 让「成组解绑」变成一行，比逐个 remove 稳",
        }}
      />
      <DoDont
        label="闭包持有大对象 / closure holds big object"
        dont={{
          code: `function track(buffer) {          // 数十 MB 的 buffer
  window.addEventListener("quit", () => {
    report(buffer.byteLength);     // 只用一个小字段
  });
}`,
          note: "词法环境整体被捕获：大对象为一个 byteLength 陪葬",
        }}
        do={{
          code: `function track(buffer) {
  const size = buffer.byteLength;  // 先提取到局部变量
  window.addEventListener("quit", () => {
    report(size);                  // 大对象不进词法环境
  });
}`,
          note: "从源头不建立引用链，比事后置空更稳",
        }}
      />
      <DoDont
        label="游离 DOM 节点 / detached node"
        dont={{
          code: `const nodes = [];
function detach(el) {
  nodes.push(el);  // 强引用数组缓存了节点
  el.remove();     // 树里移除，但整棵子树被持有
}`,
          note: "「树外还挂着」的缓存用强引用数组就是泄漏",
        }}
        do={{
          code: `const meta = new WeakMap(); // 弱引用不阻止回收
function detach(el) {
  meta.set(el, { detachedAt: Date.now() });
  el.remove();
  // 其他引用断掉后，节点可被正常 GC
}`,
          note: "给对象附加元数据 → WeakMap；数组缓存 → 用完置空或改弱引用",
        }}
      />

      <Heading level={2} title="GC 暂停的量级与工程边界" />
      <Paragraph>
        标记清除需要 stop-the-world 的阶段是<strong>全量标记</strong>
        ——标记时对象图不能被并发修改出歧义。V8 的 Orinoco
        项目把这个停顿拆碎了：增量标记把标记切成小片穿插在脚本执行之间，
        并发标记交给后台线程、清除与整理部分并行——单次主线程停顿压到毫秒级。
        停顿时长强依赖堆大小与存活对象数，下图只用于建立直觉，不是基准数据：
      </Paragraph>
      <BarChart
        label="量级对比 / scale"
        title="GC 暂停耗时量级（随堆大小与存活对象变化，仅供直觉）"
        items={[
          { label: "次要 GC（新生代）", value: 1, suffix: "ms 量级", color: "#3fb950" },
          { label: "增量标记单片", value: 2, suffix: "ms 内", color: "#8b5cf6" },
          { label: "并发回收主线程切片", value: 5, suffix: "ms 量级", color: "#1677ff" },
          { label: "全量标记-清除（大堆/旧式）", value: 50, suffix: "ms 量级", color: "#f85149" },
        ]}
      />
      <Paragraph>
        对写代码的要求由量级反推：次要 GC 频繁但便宜，
        <strong>真正伤页面的是把对象养进老生代</strong>
        ——一次性分配巨量对象、缓存只增不减，都会触发昂贵的全量回收。 减压三板斧：数组清空用{" "}
        <code>arr.length = 0</code> 复用对象；大对象用完置 <code>null</code>{" "}
        解除引用；定时器/监听器注册与清理严格成对。
        高频创建大对象的热路径（动画、游戏循环）再考虑对象池复用。
      </Paragraph>

      <Heading level={2} title="经典追问链" />
      <QAChain
        intro="从概念到现场排查：每一问都建立在前一答之上。先自己想，再展开对照。"
        items={[
          {
            q: "标记清除的「根」具体指什么？",
            intent:
              "考可达性分析的起点认知——「根」说不全，泄漏分析就是瞎猜；这道题筛掉只背过『从全局对象开始找』的人。",
            depth: 2,
            a: "三处：① 全局对象（浏览器的 window/globalThis、Node 的 globalThis）；② 当前调用栈上所有帧的局部变量；③ 宿主环境注册的引用（DOM 节点上的事件处理器、定时器表里的回调等）。从这些起点沿引用链能摸到的对象都算存活。泄漏排查的第一步永远是问：是哪条从根出发的链挂住了它？",
            bonus:
              "引擎实现角度：V8 分新生代/老生代，次要回收（Scavenger）只扫新生代，跨代引用靠「记忆集」记录——不必每次回收都遍历全堆，这是停顿能压低的结构基础。",
          },
          {
            q: "setInterval 的回调到底被谁持有？不清除为什么会泄漏？",
            intent:
              "把「定时器泄漏」落到引用链上——答「定时器自己持有」太含糊，说得出宿主定时器表的才是懂机制的。",
            depth: 3,
            a: "宿主环境维护一张定时器表：setInterval 注册后，表项持有回调函数，回调闭包引用词法环境，词法环境里躺着 data 等大对象——这条链从「宿主注册的引用」这个根出发，全程强引用。clearInterval 把表项移除，链条才断。组件卸载或节点移除不会自动清定时器，这正是定时器泄漏高发的原因。",
            bonus:
              "setTimeout 未触发的回调同理持有闭包；防抖/节流实例在组件卸载时不清 cancel，是同一条引用链在工程层的变体。",
          },
          {
            q: "GC 运行时会卡住页面吗？",
            intent: "考 stop-the-world 与引擎演进——只答「会」说明没跟过现代回收器的增量/并发设计。",
            depth: 3,
            a: "会，但已不是全量长停顿：全量标记阶段必须 stop-the-world（标记时对象图不能被并发修改出歧义），而 V8 的 Orinoco 方案把一次长停顿拆碎——增量标记切成小片穿插在脚本之间、并发标记交给后台线程、清除与整理部分并行，单次主线程停顿压到毫秒级。对代码的要求不变：避免一次性分配巨量对象、避免内存持续涨进老生代频繁触发全量回收。",
            bonus:
              "感知手段：Performance 面板主线程轨上的锯齿状短停顿就是 GC 事件；Node 侧加 --trace-gc 能看到每次回收的耗时、原因（scavenge/mark-compact）与前后堆大小。",
          },
          {
            q: "Chrome DevTools 里怎么定位一个真实泄漏？",
            intent: "考工具链的实操深度——说得出三快照对比与 Retained Size 的，才是排查过现场的人。",
            depth: 4,
            a: "标准流程：① Performance 面板录一段操作，看内存曲线锯齿是否只涨不跌——涨说明分配速率长期大于回收；② Memory 面板拍堆快照（Heap Snapshot），用 Comparison 视图对比两次快照中持续增长的对象；③ 按 Retained Size 排序找持有者——Retained Size 是「这个对象被回收后能连带释放的总内存」，比 Shallow Size 更接近泄漏的体感。",
            bonus:
              "进阶：Allocation instrumentation on timeline 能记录每次分配的调用栈，直接定位高频分配点；游离节点在快照里搜 Detached 关键字——detached 却有 Retained Size 的节点就是树外存活的铁证。",
          },
          {
            q: "WeakMap/WeakSet 和内存泄漏什么关系？什么场景该用？",
            intent: "考弱引用语义——「不参与可达性计算」这一句要能展开到使用场景，否则只是背名词。",
            depth: 3,
            a: "WeakMap 的键是弱引用：不参与 GC 的可达性判断——对象的其他引用都断掉后就会被正常回收，WeakMap 里的表项随之消失。适合「给对象附加元数据但不延长寿命」：DOM 节点的附加数据、组件实例的私有状态。用 Map 做同样的事就是经典泄漏：Map 活多久，键就被强引用多久。",
            bonus:
              "配套 API：WeakRef 持弱引用、FinalizationRegistry 在对象回收后收通知——但官方文档明确提醒不应依赖它们的清理时机做资源管理逻辑（回收时机不确定），清理动作请放在代码路径里主动做。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "防抖和节流到底差在哪？",
            to: "/note/frontend/javascript/patterns/debounce-throttle",
            description: "定时器泄漏的工程变体：防抖/节流实例的定时器生命周期与 cancel 时机。",
          },
          {
            title: "闭包在工程里怎么用：私有状态与模块模式",
            to: "/note/frontend/javascript/closure/closure-patterns",
            description: "闭包「记住状态」的另一面——谁在持有谁：引用链责任的设计取舍。",
          },
        ]}
      />
    </NoteShell>
  );
}
