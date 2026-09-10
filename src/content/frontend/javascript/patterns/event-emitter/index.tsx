import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock } from "@/components/demo";
import { CrossRef, DoDont, Prerequisite } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        发布订阅的骨架是一张<strong>「事件名 → 回调集合」的映射</strong>
        ：on 注册（Map + Set）、emit 按注册顺序<strong>同步</strong>
        调用、off 删除、once 包装「执行前先解绑」。三个机制细节决定实现质量：once
        必须先解绑再执行（防回调内重入 emit 造成重复触发）并保留原引用（手动 off(fn)
        也能命中）；emit 是同步循环——某个回调抛错会中断后续订阅者；组件卸载忘 off
        就是闭包滞留式的内存泄漏。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "this 到底指向谁？",
            to: "/note/frontend/javascript/scope/this-binding",
          },
        ]}
      >
        手写事件总线的 on/emit 全靠 this 绑定回调上下文：this 规则是实现的第一个坑。
      </Prerequisite>

      <Heading level={2} title="数据结构选型：Map + Set 而不是对象 + 数组" />
      <Paragraph>
        骨架选型有两个决策点。事件名到回调的映射用 <code>Map</code> 而非普通对象：对象的原型链会引入{" "}
        <code>toString</code>、<code>constructor</code> 这类「天生的键」（订阅{" "}
        <code>on('constructor', fn)</code> 就可能撞上），Map
        以原生字符串之外的任意值作键也更安全。同一事件的回调集合用 <code>Set</code> 而非数组：Set
        天然去重（重复 on 同一个函数引用只生效一次）、
        <code>delete</code> 是 O(1)（数组要去遍历
        splice），语义「同一函数订阅多次等同一次」也恰好符合直觉。
      </Paragraph>
      <Paragraph>
        返回 <code>this</code> 支持链式调用是顺手补的边界。<code>emit</code> 时遍历 Set 调用——注意
        JS 的 Set 遍历顺序是<strong>插入顺序</strong>
        ，这保证了「同步、按注册顺序」的调用语义；Node 的 EventEmitter 同样承诺这个顺序（据 Node.js
        官方文档 events 模块）。还有一个规范级的边角：本轮 forEach
        期间新增的订阅也会被访问到——某个处理器里
        <code>on</code> 同一事件，新回调会在本轮 emit 中立刻执行（ECMA-262 对 Set
        迭代的明文行为）；实现调度中心时要显式决定「接受实时性」还是「遍历前快照」。
      </Paragraph>
      <CodeBlock
        lang="typescript"
        code={`class EventEmitter {
  events = new Map();

  on(name, fn) {
    if (!this.events.has(name)) this.events.set(name, new Set());
    this.events.get(name).add(fn);
    return this;
  }
  off(name, fn) {
    this.events.get(name)?.delete(fn);
    return this;
  }
  once(name, fn) {
    const wrap = (...args) => {
      this.off(name, wrap); // 执行前先解绑，防止回调里再 emit 造成重入
      fn.apply(this, args);
    };
    wrap.origin = fn;       // 保留原引用：once 后手动 off(fn) 也能命中
    this.on(name, wrap);
    return this;
  }
  emit(name, ...args) {
    this.events.get(name)?.forEach((fn) => fn.apply(this, args));
    return this;
  }
}`}
      />

      <Heading level={2} title="once 的两个坑：重入与引用" />
      <Paragraph>
        once 是整道题的难度顶点，两个坑各埋一半。第一个坑是<strong>重入</strong>
        ：如果先执行再解绑，回调内部再 emit 同一事件时 wrap
        还在集合里，会被再次调用——「一次性」失守；所以顺序必须是「先解绑、再执行」。第二个坑是
        <strong>引用替换</strong>
        ：wrap 替换了原函数注册，调用方若持有原函数引用调 <code>off(name, fn)</code>
        ，集合里躺着的是 wrap，删除落空——所以要在 wrap 上保留 <code>origin</code> 引用，off
        时同时尝试删除两者。Node 的 EventEmitter 用 newListener / removeListener
        内部事件维护了一套更完备的对账，手写版能说到 origin 这层就是满分。
      </Paragraph>
      <DoDont
        label="once 的顺序 / off before run"
        dont={{
          code: `once(name, fn) {
  const wrap = (...args) => {
    fn.apply(this, args);      // 先执行
    this.off(name, wrap);      // 再解绑
  };
  this.on(name, wrap);
}`,
          note: "回调里同步再 emit 同一事件时，wrap 还在集合里，会被本轮立即再次调用——「执行一次」被重入击穿",
        }}
        do={{
          code: `once(name, fn) {
  const wrap = (...args) => {
    this.off(name, wrap);      // 先解绑再执行
    fn.apply(this, args);
  };
  wrap.origin = fn;            // 保留原引用：手动 off(fn) 也能命中
  this.on(name, wrap);
}`,
          note: "wrap 在回调运行前就已出列，回调内无论怎么 emit 都不再命中自己；origin 让手动解绑不落空",
        }}
      />
      <Paragraph>
        另一个与 Node 实现的显著差异是<strong>错误通道</strong>
        ：Node 的 EventEmitter 对 <code>'error'</code>
        事件特殊处理——emit('error')
        而没有订阅者时直接抛出（进程级错误，不能静默吞掉）；手写版若不处理这条特殊规则，错误会被静默丢弃。浏览器场景里同样的角色由{" "}
        <code>unhandledrejection</code> 扮演——「错误不许走普通订阅通道」是两个世界的共识。
      </Paragraph>

      <Heading level={2} title="边界：同步执行、抛错断链与泄漏" />
      <Paragraph>
        emit 的同步循环模型带来两条工程边界。其一，<strong>抛错断链</strong>
        ：回调 A 抛错，Set.forEach 的循环中断，回调 B、C
        不再执行——发布者完全无辜地被订阅者拖垮。生产级实现要么在循环里 try/catch 隔离（Node 会触发
        uncaughtException 或 'error' 事件），要么约定回调全部异步化。其二，<strong>订阅泄漏</strong>
        ：回调是闭包，持有创建时的作用域；组件卸载时忘记
        off，事件总线就一直攥着这个闭包——它引用的整片内存（DOM 引用、大对象）都无法回收。这与「GC
        与内存泄漏」篇的泄漏模型同构：被别人攥着，就死不掉。
      </Paragraph>
      <DoDont
        label="抛错隔离 / error isolation"
        dont={{
          code: `emit(name, ...args) {
  // 回调 A 抛错 → forEach 循环中断
  // 订阅者 B、C 全部失约，错误沿同步调用栈炸回发布者
  this.events.get(name)?.forEach((fn) => fn.apply(this, args));
}`,
          note: "订阅者的故障被发布者无辜承担——一个坏回调拖垮整条通知链，且其他订阅者毫无感知地丢失了本次通知",
        }}
        do={{
          code: `emit(name, ...args) {
  this.events.get(name)?.forEach((fn) => {
    try {
      fn.apply(this, args);
    } catch (e) {
      this.emit("error", e); // 逐个隔离，导向专用错误通道
    }
  });
}`,
          note: "单个回调抛错不影响后续订阅者；错误走 'error' 专用通道，没有订阅者时按 Node 语义抛出——不许静默吞掉",
        }}
      />
      <DoDont
        label="订阅生命周期 / subscribe & cleanup"
        dont={{
          code: `// 组件挂载时订阅，卸载时忘了 off
useEffect(() => {
  bus.on('refresh', (data) => {
    setList(data);        // 闭包攥着已卸载组件的 setState
  });
  // 没有 return () => bus.off('refresh', handler)
}, []);`,
          note: "组件卸载后回调仍被总线持有：内存滞留 + 对已卸载组件 setState",
        }}
        do={{
          code: `useEffect(() => {
  const handler = (data) => setList(data);
  bus.on('refresh', handler);
  return () => bus.off('refresh', handler); // 原引用配对解绑
}, []);`,
          note: "订阅与解绑用同一个函数引用配对；箭头函数内联写法连解绑的机会都没有",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "once 的实现为什么要「先解绑再执行」？反过来写会出什么事？",
            intent: "热身题直插 once 的核心坑——答出「重入」场景的才是真推演过。",
            depth: 3,
            a: "反过来写（先执行再解绑），回调内部如果同步再 emit 同一事件，此时 wrap 还在回调集合里，会被立即再次调用——「执行一次」的语义被重入破坏。先解绑再执行，wrap 在回调运行前就已出列，回调内无论怎么 emit 都不会再命中它。代价是「回调执行期间它已不是订阅者」——回调里查询订阅列表会看不到自己，这是刻意的取舍。",
            bonus:
              "Node 的 once 用的是另一套机制（internal listener 标记 + 状态位），但「先摘除再触发」的顺序约束完全一致。",
          },
          {
            q: "为什么用 Map + Set，而不是普通对象 + 数组？",
            intent: "考数据结构选型的理由——「都行」式的回答暴露没有推演过边界。",
            depth: 3,
            a: "对象作事件映射有两个真实风险：原型链键污染（on('toString') 这类订阅会撞上继承属性，需要 Object.create(null) 兜底）、键只能是字符串/Symbol。Map 的键是纯净的命名空间。回调集合用 Set 的理由更硬：同一函数引用重复 on 自动去重、delete 是 O(1)（数组要 indexOf + splice）、Set 的遍历按插入序——正好满足「按注册顺序同步调用」的语义。数组只有在「故意允许重复订阅叠加次数」的语义下才值得选。",
            bonus:
              "高频 emit 的极端场景还可以上「事件名 → 环形数组/链表」做 O(1) 追加与遍历中删除——但 99% 的场景 Set 已是最优解。",
          },
          {
            q: "emit 是同步的：回调 A 抛错，B 和 C 还会执行吗？生产级怎么处理？",
            intent: "考同步循环的故障传播——能区分「语言行为」与「工程策略」两层才是完整回答。",
            depth: 4,
            a: "不会。Set.forEach 的循环被 A 抛出的异常直接打断，B、C 全部失约——这是同步循环的语言行为。工程策略分三档：① 循环内 try/catch 隔离每个回调，错误收集后统一上报（隔离但吞错位置）；② 沿用 Node 语义——把错误导向专用 'error' 通道，没有订阅者则抛出（错误不能静默）；③ 回调约定异步化，错误进入各自的 Promise 链。关键是显式选一档，而不是默认「祈祷没人抛错」。",
            bonus:
              "Vue 的事件总线在 Vue 3 被移出核心，官方推荐 mitt——它的核心改进正是 emit 的隔离策略与 off 批量清理。",
          },
          {
            q: "发布订阅模式和观察者模式是一回事吗？EventEmitter 属于哪种？",
            intent: "辨析题，两个模式常被混用——分界线在「调度中心」是否存在。",
            depth: 3,
            a: "不是一回事。观察者模式是「目标直接维护观察者列表并逐个通知」——Subject 与 Observer 互相认识，耦合是点对点的；发布订阅在两者之间多了一个<strong>调度中心（事件总线）</strong>——发布方与订阅方互相看不见，只认识事件名。EventEmitter 是典型的发布订阅：emit 的发起者不知道也不关心谁在听。分界的工程意义在解耦层级：观察者解耦「一对多的依赖方向」，发布订阅解耦「双方的时空」（双方可以不同时在线、跨模块甚至跨进程）。",
            bonus:
              "跨进程的发布订阅就是消息队列——Kafka/RabbitMQ 是同一个模式在分布式尺度的重演，broker 即调度中心。",
          },
          {
            q: "全局事件总线上「卸载时忘 off」为什么是内存泄漏？和引用计数的死锁有什么相似？",
            intent: "压轴题，把手写题接到内存模型上——能跨笔记连线的是体系化理解。",
            depth: 4,
            a: "回调是闭包，闭包攥着创建时的作用域（组件 setState、DOM 引用、大数组）；总线是全局长命对象，它的 Map 攥着回调——只要不 off，这条引用链就一直活着，整片作用域都无法回收。它与「引用计数循环引用」的相似点在于：都不是「没人用了」，而是「互相或单方面还攥着」——可达性分析判定它活着，GC 无能为力。根治靠生命周期配对（on/off 成对）；DOM 侧 EventTarget 的配套清理机制是 AbortSignal——addEventListener 时传入 signal，一次 abort 批量移除。注意别把 passive 选项当成弱引用通道：它只影响能否 preventDefault，不改变监听器被引用的强度。",
            bonus:
              "Node 给 EventEmitter 配了 setMaxListeners 与告警——默认同一事件上限 10 个监听器，添加第 11 个时打印警告，就是给这类泄漏装烟雾报警器。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "事件循环是怎么调度的：从调用栈到微任务",
            to: "/note/frontend/javascript/event-loop/event-loop-basics",
            description: "emit 的「同步」与宏任务/微任务的关系：回调排队模型的全景。",
          },
          {
            title: "JS 是怎么释放内存的：GC 与泄漏排查",
            to: "/note/frontend/javascript/memory/gc-and-leaks",
            description: "忘 off 的回调为什么死不掉：可达性与四种经典泄漏场景。",
          },
        ]}
      />
    </NoteShell>
  );
}
