import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CrossRef, DoDont, Prerequisite } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        因为在 ECMA-262 里{" "}
        <strong>
          [[Construct]]（new）的 this 由引擎创建的新对象决定，优先级天然高于 bind 的 [[BoundThis]]
        </strong>
        ——bind 创建的绑定函数被 new 调用时，规范明确「绑定的 this 被忽略」。手写版用{" "}
        <code>this instanceof bound</code> 判断「我是不是被 new 调用的」，再用{" "}
        <code>bound.prototype = Object.create(fn.prototype)</code> 接上原型链，让 instanceof
        校验通过。两行缺一不可：前者管 this，后者管构造能力。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "属性是怎么被继承的：原型链查找",
            to: "/note/frontend/javascript/prototype/prototype-chain",
          },
        ]}
      >
        new 与 instanceof
        的全部行为都发生在原型链上——先知道查找规则，再来看两个函数怎么「合作」与「对抗」。
      </Prerequisite>

      <Heading level={2} title="优先级：不是约定，是规范条文" />
      <Paragraph>
        「new 优先级高于 bind」听起来像实现细节，实际是 ECMA-262 的明文规定。bind 返回的是
        <strong>绑定函数（Bound Function Exotic Object）</strong>
        ，内部槽 <code>[[BoundTargetFunction]] / [[BoundThis]] / [[BoundArguments]]</code>{" "}
        记录三件套；被调用时按 <code>BoundFunctionCreate</code> 的语义以 [[BoundThis]] 为 this
        执行目标函数。但当它被 <strong>new</strong> 调用时，走的是
        [[Construct]]：引擎创建一个新对象、以新对象为 this 执行目标函数——[[BoundThis]]
        在这条路径上根本没有出场机会。MDN 的表述是「new 时绑定的 this 被忽略」（据 MDN
        Function.prototype.bind）。
      </Paragraph>
      <Paragraph>
        真正的原生实现靠内部槽完成这一切，手写版拿不到内部槽，只能<strong>行为级模拟</strong>
        ：在 bound 函数体里问一句「我是被 new 调的吗？」——<code>this instanceof bound</code>
        。new 调用时 this 是新实例，实例的原型链上有 bound.prototype，判定成立；普通调用时 this 是
        ctx 或 undefined，判定失败。一行 instanceof，补的是「识别调用方式」的能力缺口。
      </Paragraph>
      <DoDont
        label="手写 bind / bind & new"
        dont={{
          code: `Function.prototype.myBind = function (ctx, ...pre) {
  const fn = this;
  return (...args) => fn.call(ctx, ...pre);
};
// new (fn.myBind(obj))() → this 是 obj
// 而不是新实例：constructor 场景翻车`,
          note: "箭头函数版丢掉了 new 语义，也没有 prototype——当构造函数用直接崩",
        }}
        do={{
          code: `Function.prototype.myBind = function (ctx, ...pre) {
  const fn = this;
  function bound(...args) {
    // new 调用时 this 是新实例 → 忽略绑定的 ctx
    return fn.apply(
      this instanceof bound ? this : ctx,
      pre.concat(args)
    );
  }
  bound.prototype = Object.create(fn.prototype);
  return bound;
};`,
          note: "instanceof 校验处理 new 优先级；接上 prototype 链保住构造能力",
        }}
      />

      <Heading level={2} title="prototype 那行：new 的另一半" />
      <Paragraph>
        只有 instanceof 判断还不够。new 的四步语义是：创建对象并挂上构造函数的 prototype →
        以新对象为 this 执行构造函数 → 决定返回值 → 交出实例。模拟 bind 里被 new 调用后，
        <code>fn.apply(this, ...)</code> 以新实例为 this
        执行了目标函数——但这个「新实例」是谁创建的？是调用方 <code>new bound(...)</code>
        创建的，它的原型挂在 <strong>bound.prototype</strong> 上。如果不把 bound.prototype
        接到原函数的原型链上，实例就拿不到原函数的原型方法，且 <code>instanceof Fn</code> 为
        false——构造语义断裂。
      </Paragraph>
      <Paragraph>
        <code>bound.prototype = Object.create(fn.prototype)</code>{" "}
        一行同时修复两件事：实例能沿「bound.prototype → fn.prototype」找到原型方法；instanceof
        校验（内部沿原型链找 fn.prototype）也能通过。另一处容易漏的细节是<strong>返回值决策</strong>
        ：构造函数返回对象/函数时 new 的结果就是那个返回值——原生 bind
        保留这一语义，手写版因为直接借用 new 的行为，天然免费获得。
      </Paragraph>
      <Paragraph>
        至于 <code>myNew</code> 与 <code>myInstanceof</code>{" "}
        这两个「配套手写题」：实现只有寥寥数行，且与本篇问句（bind 与 new
        的优先级）正交——前者的完整实现与逐行依据收进下方追问链 Q2，后者的原型链遍历模型在 Q4 的跨
        realm 讨论里，正文不再展开，把篇幅留给 bind 本身。
      </Paragraph>
      <DoDont
        label="bind + new 的行为 / bound as constructor"
        dont={{
          code: `const AdminUser = User.bind({ role: "admin" });
const u = new AdminUser("张三");
// 期望 u 内部 this.role === "admin"
// 实际：new 时绑定的 this 被规范忽略，role 丢失`,
          note: "想借 bind 给构造出来的实例塞默认状态是徒劳的——[[Construct]] 路径下 [[BoundThis]] 根本不出场",
        }}
        do={{
          code: `// bind + new 的正确用法是预设参数，不是绑 this
const VipUser = User.bind(null, "vip");
const u = new VipUser("张三");
// new 忽略绑定的 this，但 [[BoundArguments]] 照常生效：
// "vip" 预设在前，"张三" 传给第二个参数`,
          note: "new 只忽略绑定的 this，不忽略预设参数——这才是 bind 与 new 配合的工程价值（偏函数式工厂）",
        }}
      />
      <DoDont
        label="绑定副本的属性 / function props"
        dont={{
          code: `function rate(limit) { /* ... */ }
rate.cache = new Map();          // 挂在原函数上的状态
const bound = rate.bind(api);
bound.cache;                     // → undefined
// bind 返回全新函数，自有属性不会跟过来`,
          note: "依赖函数属性的代码（缓存、重试计数、特性标记）在绑定副本上全部落空，且没有任何报错",
        }}
        do={{
          code: `const bound = rate.bind(api);
bound.cache = rate.cache;        // 显式转移属性
// 或者不产生副本：直接 rate.call(api, ...)
// 或把方法挂在宿主对象上用 obj.rate() 调用`,
          note: "需要函数属性时显式转移，或改用 call/方法调用这类不复制函数的方式",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "手写 bind 里的 this instanceof bound 是在判断什么？prototype 那行删了会怎样？",
            intent: "考 new 与 bind 的优先级交互——这是 bind 实现的题眼，答不出说明只背了模板。",
            depth: 3,
            a: "在判断「bound 是不是被 new 调用的」：new 会把 this 指向新实例，此时应忽略绑定的 ctx、把 this 交给原函数——这就是「new 优先级高于 bind」。prototype 那行把 bound 的原型接到原函数的原型链上，删掉后 new bound() 创建的实例拿不到原函数的原型方法，instanceof 校验也会失败——两行配合才完整保留构造语义。",
            bonus:
              "原生 bind 的行为与此一致：MDN 明确「new boundFunc() 时 this 绑定被忽略」；真正的原生实现用内部槽，手写版是行为级模拟。",
          },
          {
            q: "myNew 的返回值决策为什么「对象/函数采纳、原始值忽略」？依据在哪？",
            intent: "考 new 四步语义的收尾规则——大多数人的答案停在「返回 this」，说不出规范依据。",
            depth: 3,
            a: "ECMA-262 规定 [[Construct]] 的收尾：构造函数若返回一个对象（含函数），new 表达式的结果就是该对象——构造函数可以完全接管实例的生产；返回原始值（number/string 等）则被忽略，仍交出内部创建的实例。据此完整 myNew 收束成三步核心：Object.create(Ctor.prototype) 挂原型链建实例、Ctor.apply(obj, args) 以实例为 this 执行、收尾 result !== null && (typeof result === 'object' || typeof result === 'function') ? result : obj 做返回值决策。设计动机是允许「对象池、单例、代理壳」这类模式：工厂想给什么就给什么；原始值没有引用语义，交出去反而破坏「拿到的是实例」的契约。",
            bonus:
              "推论：class 构造函数 return 非对象值会被直接无视，return 对象则整个 new 的结果就是它——class 与普通函数在这条规则上完全一致。",
          },
          {
            q: "箭头函数为什么不能被 new？bind 也绑不动它的 this，两件事是同一个原因吗？",
            intent: "考内部方法层面——能答出 [[Call]] 与 [[Construct]] 之分，说明机制模型到位了。",
            depth: 4,
            a: "是同一个原因：箭头函数压根没有 [[Construct]] 内部方法，new 会直接抛 TypeError——不是「绑不动」而是「不可构造」。它的 this 也不是「绑定后不可改」，而是「根本没有自己的 this 绑定」：引用的是外层词法作用域的 this，bind 对 this 部分天然无效（但 bind 仍能给箭头函数补预设参数）。所以「箭头函数当 constructor 用」和「箭头函数被 bind 改 this」失败于同一条设计：箭头函数是「词法 this 的表达式」，不是对象工厂。",
            bonus:
              "prototype 属性同理缺失：箭头函数没有 prototype 属性——它永远不会站在「构造函数」的位置上，这是设计的一致性而非功能缺失。",
          },
          {
            q: "instanceof 在跨 iframe（跨 realm）场景为什么会失效？怎么补？",
            intent:
              "考 instanceof 的实现边界——「每个 realm 一套内建原型」是 JS 宿主环境的高频暗坑。",
            depth: 4,
            a: "instanceof 沿 left 的原型链找 right.prototype 这个具体对象引用；iframe 有自己独立的全局对象与一套独立的 Array.prototype/Object.prototype——父页面的数组在子 iframe 里 instanceof Array 为 false，因为原型链上挂的是父 realm 的 Array.prototype。补法有三层：Array.isArray（ES 规范定义的跨 realm 判定，内部按 brand 判定不比对原型引用）；Object.prototype.toString.call（读内部 [[Class]]/brand 标记）；或 duck typing。框架源码普遍用前两者替代 instanceof 做类型判定。",
            bonus:
              "brand 判定跨 realm（iframe / vm 沙箱）仍成立：Array.isArray 按内部 brand 判定、不比对任何 realm 的原型引用——「问它是什么牌子」比「问它亲戚是谁」稳定。",
          },
          {
            q: "bind 过的函数再 bind 一次会怎样？链式 bind 的 this 以哪次为准？",
            intent: "收尾辨析题，检验对「绑定函数也是函数」的理解——很多人以为会形成绑定链。",
            depth: 4,
            a: "以第一次为准，后续 bind 全部无效。第一次 bind 产出绑定函数，它的 this 已经被 [[BoundThis]] 锁死；再对它 bind，只是把「一个绑定函数」当作新的目标函数包一层，内层函数执行时引擎仍然按绑定语义用第一个 [[BoundThis]]——外层的 ctx 从未生效。参数则是累加的：两次 bind 的预设参数按调用顺序拼接。这解释了为什么「bind 链」在工程里没有意义，也解释了 Partial Application 场景下 bind 的正确用法是一次性给足。",
            bonus:
              "直接给结论：最内层（第一次）绑定生效，参数累加——后续 bind 只是把「已绑定的函数」再包一层，真正执行的是最内层那个锁死 [[BoundThis]] 的绑定函数，外层 ctx 全程没有出场机会。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "this 到底指向谁？",
            to: "/note/frontend/javascript/scope/this-binding",
            description: "四条绑定规则的完整体系：bind 只是其中一条，调用位置说了算。",
          },
          {
            title: "发布订阅是怎么实现的：手写事件总线",
            to: "/note/frontend/javascript/patterns/event-emitter",
            description: "同类「行为级模拟」手写题：闭包与数据结构选型的实现思维。",
          },
        ]}
      />
    </NoteShell>
  );
}
