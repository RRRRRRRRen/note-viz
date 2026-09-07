import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CompareTable, DoDont, MemoryCard, Timeline } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        this 不在定义时确定，也不是函数自己的属性——它是<strong>被调用时由调用方式注入</strong>
        的。四条绑定规则按优先级：
        <strong>new &gt; 显式（call/apply/bind）&gt; 隐式（obj.fn()）&gt; 默认（独立调用）</strong>
        ；箭头函数是唯一例外，词法捕获定义处的 this，call/bind
        都改不动。三大丢失现场：方法当回调传出、链式赋值、setTimeout——修法一致：包箭头函数或提前
        bind。
      </Conclusion>

      <Heading level={2} title="this 是什么：调用位置说了算" />
      <Paragraph>
        理解 this 最重要的一步，是把「作用域」和「this」分开：作用域是<strong>词法的</strong>
        （写代码时就定了），this 是<strong>动态的</strong>
        （运行时由调用方式注入）。同一个函数对象，<code>obj.fn()</code> 里 this 是 obj、
        <code>fn()</code> 里是 undefined（严格模式）、<code>new fn()</code>{" "}
        里是新实例——函数不变，调用方式变，this 就变。
      </Paragraph>
      <Paragraph>
        四条绑定规则覆盖所有情况：<strong>① new 调用</strong>——绑定到新创建的对象（new
        四步的第二步就是「把 this 指向新对象」）；<strong>② 显式绑定</strong>
        ——call/apply 立即执行并指定 this，bind 返回绑死 this 的新函数；
        <strong>③ 隐式绑定</strong>——调用位置有没有 <code>xxx.</code> 前缀，有就绑到那个对象（只看
        <strong>最近一层</strong>，<code>obj.a.fn()</code> 绑到 a 不是 obj）；
        <strong>④ 默认绑定</strong>——以上都不沾，非严格模式挂 window/globalThis，严格模式是
        undefined。
      </Paragraph>

      <Timeline
        label="this 判定顺序 / decision"
        steps={[
          { label: "有 new？", sub: "绑定新实例", color: "#3fb950" },
          { label: "call/apply/bind？", sub: "绑定指定对象", color: "#1677ff" },
          { label: "有 obj. 前缀？", sub: "绑定最近一层对象", color: "#8b5cf6" },
          { label: "默认绑定", sub: "window / undefined", color: "#f59e0b" },
        ]}
      />
      <MemoryCard keyword="this 优先级" color="#1677ff">
        <strong>new &gt; 显式 &gt; 隐式 &gt; 默认</strong>
        。箭头函数跳过所有规则，直接看外层。判断 this 只需回答一个问题：
        <strong>这个函数是被谁、以什么形式调用的？</strong>
      </MemoryCard>

      <Heading level={2} title="箭头函数：唯一的例外" />
      <Paragraph>
        箭头函数<strong>没有自己的 this</strong>
        ——它不创建 this 绑定，在函数体内引用 this 时走词法作用域，找到<strong>定义处</strong>
        外层函数的 this。所以 call/apply/bind 对它的 this 全部无效，传参照常、this
        装聋。同理它也没有 arguments（用 rest 参数替代）、没有 prototype、没有 [[Construct]]
        内部方法——
        <strong>不能被 new</strong>。
      </Paragraph>
      <Paragraph>
        选型经验：回调场景（事件处理、定时器、数组方法）用箭头函数省心，因为它「要的是外层 this」；
        <strong>对象方法和原型方法慎用箭头函数</strong>——方法要的恰恰是「调用者的 this」，
        写成箭头函数后 this 固定为定义处的值（模块顶层就是 undefined），
        <code>obj.method()</code> 反而拿不到 obj。class
        里定义箭头函数类字段是唯一合理例外（自动绑定实例，追问链第 5 问）。
      </Paragraph>

      <CompareTable
        label="对比 / compare"
        left={{
          title: "普通函数",
          color: "#8b5cf6",
          points: [
            "this 由调用方式决定（四条规则）",
            "有 arguments 对象与自身 prototype",
            "可以做构造函数（配 new）",
            "作回调传出后 this 丢失，需手动绑定",
          ],
        }}
        right={{
          title: "箭头函数",
          color: "#3b82f6",
          points: [
            "没有自己的 this，词法捕获外层作用域",
            "没有 arguments（可用 rest 参数替代）",
            "不能 new，也没有 prototype",
            "call/apply/bind 无法改变它的 this",
          ],
        }}
      />

      <Heading level={2} title="丢失 this 的三大现场" />
      <Paragraph>
        隐式绑定最脆弱——它只认「调用位置的点前缀」。三种最常见的丢 this 现场：①{" "}
        <strong>方法被抽出来当回调</strong>：<code>setTimeout(obj.say, 100)</code>{" "}
        传出去的是函数本体，定时器以普通函数形式调用它，点前缀没了，this 回落默认绑定；②{" "}
        <strong>链式赋值</strong>：<code>(a.b = a.b)()</code>{" "}
        赋值表达式返回函数本体再调用，同样脱离对象；③ <strong>解构取方法</strong>：
        <code>const {"{ say }"} = obj; say()</code>——本质同①。
      </Paragraph>
      <Paragraph>
        修复思路统一为「把动态绑定变词法/显式」：<strong>包一层箭头函数</strong>（{" "}
        <code>setTimeout(() =&gt; obj.say(), 100)</code>
        ），或 <strong>提前 bind</strong>（<code>this.say = this.say.bind(this)</code> ——React class
        组件时代的标准动作）。现代 class 语法给了第三种：箭头函数类字段，绑定在实例化时一次完成。
      </Paragraph>

      <DoDont
        label="回调丢 this / losing this"
        dont={{
          code: `class Timer {
  seconds = 0;
  tick() { this.seconds++; }

  start() {
    // this 是 undefined（严格模式）
    setInterval(this.tick, 1000);
  }
}`,
          note: "方法本体被传走，调用时没有点前缀 → 默认绑定 → this 不再是实例",
        }}
        do={{
          code: `class Timer {
  seconds = 0;
  tick = () => { this.seconds++; }; // 箭头类字段

  start() {
    setInterval(this.tick, 1000);   // this 恒为实例
  }
}
// 或 start() { setInterval(() => this.tick(), 1000); }`,
          note: "箭头函数类字段在实例化时词法捕获 this——一次绑定，处处安全",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "严格模式和非严格模式下，独立调用函数的 this 分别是什么？call(null) 呢？",
            intent:
              "热身题，考默认绑定的边界——严格模式与 null/undefined 传参这两个分支最容易被混成一谈。",
            depth: 2,
            a: "非严格模式独立调用 this 是 window/globalThis；严格模式是 undefined（访问 this.x 直接报错）。call/apply/bind 传入 null/undefined 时：非严格模式被替换为全局对象，严格模式原样使用（this 就是 null/undefined）。所以「用 call(null) 测试严格模式」是有效的调试技巧。",
            bonus:
              "ESM 模块代码默认运行在严格模式——模块顶层的独立调用 this 是 undefined，这改变了老代码的默认行为。",
          },
          {
            q: "call、apply、bind 的区别？bind 之后再用 call 改 this 会怎样？",
            intent:
              "考显式绑定的三件套细节——bind 的「一次绑定永久生效」与手写 bind 的 new 交互是常见追加点。",
            depth: 3,
            a: "call/apply 立即执行、只差传参形式（call 逐个列、apply 传数组，数组展开有参数上限与性能成本）；bind 不执行，返回永久绑定 this（并可预置参数）的新函数——且绑定不可覆盖：bind 之后再 call 另一个对象，this 仍是第一次绑定的。三者的手写版面试高频，bind 的完整版还要处理 new 调用优先级（见手写题篇）。",
            bonus:
              "性能视角：apply 展开 super 大数组可能触发引擎参数上限（V8 约 12 万）；固定参数场景 bind 预置比每次 call 传参更快。",
          },
          {
            q: "setTimeout(this.tick, 0) 里的 this 为什么不是实例？怎么让它是？",
            intent:
              "考默认绑定的触发路径——「异步不改变 this 规则，改变的是调用方式」这一层要讲透。",
            depth: 3,
            a: "定时器到点后，回调是被宿主以普通函数形式调用的——没有点前缀、没有 new、没有 call，命中默认绑定：非严格 window/globalThis、严格 undefined。异步机制本身不引入任何新 this 规则；变的是「谁在什么形式下调用它」。修复三选一：包箭头函数 () => this.tick()（推荐）、提前 bind、箭头函数类字段。",
            bonus:
              "同理适用于事件监听器 addEventListener(this.handler)——DOM 事件里原生写法 this 是 currentTarget，而传出去的函数引用已脱离该机制。",
          },
          {
            q: "new 的优先级为什么高于 bind？箭头函数为什么不能 new？",
            intent:
              "考绑定规则的引擎层依据——能说出内部方法（[[Construct]]/[[Call]]）的是懂规范的人。",
            depth: 4,
            a: "new 调用走函数的 [[Construct]] 内部方法：先创建新对象，再把 this 指向它执行——this 在进入函数体之前就已经被决定为实例，bind 的绑定只作用于 [[Call]] 路径。手写 bind 用 this instanceof bound 模拟这个优先级。箭头函数只有 [[Call]] 没有 [[Construct]] 内部方法，new 直接抛 TypeError——「没有 prototype」只是表象，「缺构造槽」才是根源。",
            bonus:
              "原生 bind 返回的异质函数对象：调用走 [[Call]]（用绑定的 this），new 走 [[Construct]]（忽略绑定、用新实例）——一条规范条款同时解释了两个现象。",
          },
          {
            q: "类字段箭头函数和构造函数里 bind，哪种更好？",
            intent:
              "工程向收尾题，把 this 绑定接到真实代码决策——答出「函数引用稳定性」直通 React 性能话题。",
            depth: 4,
            a: "语义上等价（都是实例级绑定），差异在函数引用的创建成本：构造函数里 this.handler = this.handler.bind(this) 整个生命周期只创建一次；类字段箭头函数同样每次实例化创建一次——单实例无差别。真正要警惕的是 JSX 内联写法 onClick={() => this.tick()}：每次渲染创建新函数，子组件若被 memo 包裹会因 props 引用变化而白白重渲染——把绑定提升到渲染之外才是正解。",
            bonus:
              "React 视角的完整链路：memo 靠 props 引用比较跳过渲染 → 内联箭头/每次 bind 破坏引用稳定 → 类字段箭头或 useCallback 稳定引用——this 绑定与渲染性能在此会合。",
          },
        ]}
      />

      <Heading level={2} title="写在最后" />
      <Paragraph>
        动态的 this 与词法的作用域是 JS
        的两套寻址系统——后者在站内「作用域链」篇完整展开，执行栈视角见「执行上下文与变量提升」。bind
        的满分手写（含 new 优先级处理）在「手写题精选」篇；this 绑定与 React
        渲染性能的会合点在「React 核心机制」篇。
      </Paragraph>
    </NoteShell>
  );
}
