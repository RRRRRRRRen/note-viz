import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock } from "@/components/demo";
import {
  Callout,
  CrossRef,
  DoDont,
  MemoryCard,
  OutputTimeline,
  Prerequisite,
} from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        闭包的工程价值收敛在一个母题：<strong>封装状态</strong>——把变量藏进函数作用域，
        只暴露操作入口。私有变量、计数器、模块模式是同一手法的三种规模；判断状态份数的口诀是 「
        <strong>工厂被调用几次 = 几份状态</strong>
        」：工厂函数多次调用产生多份独立环境（每实例隔离）， IIFE
        只调用一次（单例共享）。闭包捕获的是变量绑定本身，所以返回的函数读写的是同一个活着的变量。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "闭包到底是什么：词法环境的快照",
            to: "/note/frontend/javascript/closure/closure-basics",
          },
        ]}
      >
        本篇不解释闭包的形成机制（[[Environment]] 与环境记录的存活），只谈工程化用法——先把地基打牢。
      </Prerequisite>

      <Heading level={2} title="你已经天天在用：事件回调里的闭包" />
      <Paragraph>
        先把概念落地：闭包不是面试专用词，是每个前端项目的日常。初始化代码里注册了一个{" "}
        <code>addEventListener</code>
        ，回调引用了当时的配置对象；之后哪怕注册回调的那段代码早已执行完毕，
        事件触发时回调依然能读到那份配置——被捕获的变量跟着回调走，生命周期不再由原作用域决定，
        而由「是否还有引用」决定。
      </Paragraph>
      <Paragraph>
        这一条已经包含了本篇所有模式的原材料：
        <strong>回调（返回的函数）+ 原作用域变量 = 可持久的私有状态</strong>。
        差别只在组织方式——把「配置对象」换成计数器、把监听器换成返回值，就成了下面要拆的模式。
        识别自己代码里的闭包，从找「谁在原作用域结束后还握着这些变量」开始。
      </Paragraph>

      <Heading level={2} title="一个母题：闭包封装状态" />
      <Paragraph>
        把经典三模式（私有变量、独立计数器、模块模式）并排放开，会发现它们是同一个动作在不同规模上的重复：
        <strong>
          把状态变量登记在一个不会被外部触达的作用域里，返回（或暴露）一组操作它的函数
        </strong>
        。 状态拿不到引用就改不干净——这是比命名约定（<code>_count</code>
        ）强得多的封装，因为它是作用域规则保证的， 不是君子协定。ES2022 的 <code>#</code>
        私有字段出现之前，这就是 JS 唯一的真封装；今天它仍是 「不引入 class
        就要私有状态」时的默认解。
      </Paragraph>
      <Paragraph>
        模式之间真正的分野是<strong>状态份数</strong>：工厂函数（<code>createXxx</code>
        ）每次调用都执行一遍函数体， 每次都产生全新的环境记录——调用 N 次就有 N 份互不相干的状态；而
        IIFE 模块模式本质是
        「只调用一次的工厂」，私有成员全模块共享一份，天然单例。写代码前先回答「这里需要几份状态」，
        就不会再选错组织形式——这也是本篇最重要的一个判断。
      </Paragraph>

      <MemoryCard keyword="状态份数 = 工厂调用次数" color={PALETTE.blue}>
        <code>createCounter()</code> 调用两次 = 两份 count；<code>{"(function(){…})()"}</code>{" "}
        只调用一次 = 单例。选模式前先答「需要几份状态」，形式跟着答案走。
      </MemoryCard>

      <Heading level={2} title="私有变量与计数器：工厂函数的独立状态" />
      <Paragraph>
        私有变量是母题的最小形态：外部拿不到 <code>_name</code> 的引用，唯一入口是闭包暴露的{" "}
        <code>getName/setName</code>——接口面积被压到最小，任何状态变更都必须经过你定义的操作，
        校验、日志、联动因此有了唯一的拦截点。
      </Paragraph>
      <CodeBlock
        code={`function createPerson(name) {
  var _name = name; // 外部拿不到引用

  return {
    getName: function () {
      return _name;
    },
    setName: function (newName) {
      _name = newName;
    },
  };
}

var person = createPerson('Alice');
console.log(person.getName()); // 'Alice'
person.setName('Bob');
console.log(person.getName()); // 'Bob'
console.log(person._name);     // undefined - 外部拿不到引用`}
      />
      <Paragraph>
        计数器在同一形态上多了一个关键观察点：<strong>两个实例的两份状态</strong>。 每次调用{" "}
        <code>createCounter()</code> 都新建一条环境记录，<code>counter1</code> 与{" "}
        <code>counter2</code> 的方法各自闭包引用各自的 <code>count</code>——调用多少次互不串账。
        对照下面的输出顺序走一遍（Node v22.17.0 实测）：
      </Paragraph>
      <CodeBlock
        code={`function createCounter() {
  var count = 0;
  return {
    increment: function () {
      return ++count;
    },
    getCount: function () {
      return count;
    },
  };
}

var counter1 = createCounter();
var counter2 = createCounter();

console.log(counter1.increment()); // 1
console.log(counter1.increment()); // 2
console.log(counter2.increment()); // 1 - 独立闭包，互不影响
console.log(counter1.getCount());  // 2`}
      />
      <OutputTimeline
        label="输出解读 / two counters"
        steps={[
          {
            output: "1",
            phase: "同步",
            why: "counter1 的 increment 读写的是第一条环境记录里的 count：0 → 1。",
          },
          {
            output: "2",
            phase: "同步",
            why: "同一个闭包环境，读改写同一条记录：1 → 2——「捕获引用」让跨调用累加成为可能。",
          },
          {
            output: "1",
            phase: "同步",
            why: "counter2 是第二次 createCounter() 调用的产物，全新的环境记录，count 从 0 重新开始——实例隔离的本质是环境隔离。",
          },
          {
            output: "2",
            phase: "同步",
            why: "回到 counter1 的 getCount：读到的仍是它自己那条记录的 count——两个闭包互相不可见，谁也污染不了谁。",
          },
        ]}
      />

      <Heading level={2} title="模块模式：只调用一次的工厂" />
      <Paragraph>
        模块模式把「工厂 + 闭包私有」组织到模块粒度：IIFE 创建一个立即执行、只执行一次的函数作用域，
        私有变量和私有函数登记在其中，返回对象的方法闭包引用它们。这是 ES Module 普及之前
        主流库（jQuery 时代的插件、各类 SDK）的标准模块化方案——读懂大量存量库源码的前提。
      </Paragraph>
      <Paragraph>
        现代代码里它的角色已被取代，对应关系值得记住：模块作用域（<code>import/export</code>{" "}
        的顶层）本身就是「只执行一次的作用域」，私有性由「不导出就不可见」天然保证，静态可分析的模块图还带来了
        tree-shaking——模块模式是这套语法糖的运行时手工作坊。字段级私有则有了 <code>#</code>
        私有字段。理解对应关系比背历史有用：什么时候还需要手写模块模式？——
        <strong>需要带参初始化的运行时封装</strong>（ES Module
        是静态结构，做不到「调用时传入配置再成型」）， 以及没有模块系统的宿主环境。
      </Paragraph>

      <CodeBlock
        code={`var Module = (function () {
  var privateVar = 'I am private';

  function privateMethod() {
    console.log(privateVar);
  }

  return {
    publicMethod: function () {
      privateMethod();
    },
  };
})();

Module.publicMethod();    // 'I am private'
console.log(Module.privateVar); // undefined`}
      />
      <Paragraph>
        单例不是缺陷，是 IIFE 的语义——但要<strong>有意识地选择它</strong>：全局唯一的状态
        （配置中心、连接池、日志器）适合单例；「每个调用方一份」的状态写成了 IIFE，就会变成
        隐形共享。下面这个坑在真实项目里以「测试互相污染」「多实例串数据」的形式反复出现：
      </Paragraph>
      <DoDont
        label="单例还是多实例 / singleton vs factory"
        dont={{
          code: `// 购物车逻辑写成了 IIFE 单例
const cart = (function () {
  let items = [];
  return {
    add: (x) => items.push(x),
    size: () => items.length,
  };
})();

// 第二个「购物车」是幻觉：
cart.add('a');
cart.add('b'); // 和上面的同一份 items！`,
          note: "IIFE 只调用一次：所有 import/引用方共享同一份私有状态——「以为每处用的是一个新实例」是错觉",
        }}
        do={{
          code: `// 需要多份状态就保留工厂，别急着执行
function createCart() {
  let items = [];
  return {
    add: (x) => items.push(x),
    size: () => items.length,
  };
}

const cartA = createCart(); // 独立
const cartB = createCart(); // 独立`,
          note: "状态份数由「工厂调用几次」决定：单例需求才用 IIFE，多实例需求必须保留可调用的工厂函数",
        }}
      />

      <Heading level={2} title="边界陷阱" />
      <Paragraph>
        除了单例误用，本域还有一类高频事故：<strong>循环中捕获循环变量</strong>。它的机制在
        「闭包基础」篇已完整拆解（共享绑定 vs 每轮独立绑定），工程里值得再强调的是它的变体形态：
        不止 <code>for(var)</code>，把回调存进数组、注册进事件表、挂到对象上——只要执行晚于循环结束，
        <code>var</code> 循环变量的共享绑定就会迟到爆雷。
      </Paragraph>
      <DoDont
        label="循环捕获循环变量 / loop capture"
        dont={{
          code: `const handlers = [];
for (var i = 0; i < 3; i++) {
  handlers.push(() => send(i));
}
// 循环结束后才执行：
handlers.forEach((h) => h());
// 3 3 3 —— 共享同一个 var i`,
          note: "回调被存进数组/事件表时执行必然晚于循环——var 的共享绑定此刻已是最终值",
        }}
        do={{
          code: `const handlers = [];
for (let i = 0; i < 3; i++) {
  handlers.push(() => send(i));
}
handlers.forEach((h) => h());
// 0 1 2 —— let 每轮独立绑定

// forEach 本身也安全：参数 i
// 是每轮独立的函数参数`,
          note: "let 声明或 forEach 的参数作用域都能给出每轮独立绑定——把「延迟执行」和「声明方式」一起检查",
        }}
      />
      <Paragraph>
        还有一类静态陷阱值得点名：
        <strong>
          用 <code>eval</code> 或 <code>with</code> 动态改写作用域
        </strong>
        。
        它们让作用域链在运行时变得不可静态分析，引擎的绑定优化（内联缓存）全部失效，严格模式更是直接禁掉了{" "}
        <code>with</code>。工程结论一句话：需要动态性就用显式的数据结构（Map、对象字典）+ 闭包，
        别让作用域本身变成可变状态。
      </Paragraph>
      <Callout kind="warning" title="闭包状态的测试隔离">
        单例闭包状态在单测里是隐形雷：模块加载即初始化、进程内全程共享，测试用例之间互相污染。
        需要可测性时把单例改成工厂（<code>createStore(config)</code>），由调用方决定生命周期与注入。
      </Callout>

      <Heading level={2} title="防抖与节流：闭包视角一句话" />
      <Paragraph>
        防抖/节流是「闭包记住状态、返回待触发函数」的代表性应用：<code>timer</code>、
        <code>lastTime</code> 这类必须跨调用存活的变量，全部活在返回函数的闭包里——放进返回函数内部
        则每次触发都是新变量，重置逻辑直接失效。完整实现（immediate/leading+trailing/cancel）、
        节奏语义、React 实例稳定性陷阱与可运行的游乐场，见站内专篇。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "防抖和节流到底差在哪？",
            to: "/note/frontend/javascript/patterns/debounce-throttle",
            description: "节奏语义、实现三题眼与 React 陷阱的完整专篇。",
          },
        ]}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "IIFE 单例和工厂函数，状态为什么一个共享一个独立？",
            intent:
              "热身题，考「状态份数」的心智模型——答案不在闭包语法里，在「函数被调用几次」里。",
            depth: 2,
            a: "状态份数 = 工厂被调用的次数。IIFE 是「定义即调用一次」的工厂，函数体只执行一遍，私有变量只有一份，所有引用方共享；createXxx 留作可重复调用的工厂，每调用一次就新建一条环境记录，状态天然隔离。两种写法的闭包机制完全相同，差别只是调用次数。",
            bonus:
              "推论：把 IIFE 赋给变量的写法可以让它「看起来像类」却拥有单例语义——评审代码时看到 const X = (function(){…})() 就该立刻问一句：这里真的只需要一份吗？",
          },
          {
            q: "模块模式和 ES Module 的本质区别是什么？",
            intent:
              "考两条模块化路线的分界——答「一个旧一个新」只是年代，答不出静态/运行时之别说明没理解模块系统。",
            depth: 3,
            a: "模块模式是运行时手法：IIFE 创建一次性闭包，私有性靠作用域，成员关系在执行后才确定，还支持带参初始化。ES Module 是语法级静态结构：import/export 在解析期确定模块依赖图，私有性由「不导出就不可见」保证，静态化带来 tree-shaking、循环依赖的活绑定（live binding）与更早的错误检查。功能上现代项目一律用 ES Module，模块模式退守两个场景：无模块系统的宿主、需要运行时带参组装的封装。",
            bonus:
              "活绑定是 ES Module 独有的语义：导出的是绑定的实时引用，导入方读到的值跟随导出方更新；IIFE 返回对象的属性只是导出那一刻的快照——这个差异在写状态模块时最容易被忽略。",
          },
          {
            q: "柯里化也是闭包吗？",
            intent:
              "考模式识别的迁移力——能不能从「参数收集」这个陌生场景里认出「闭包记住状态」的母题。",
            depth: 4,
            a: "是。curry 返回的函数把已收集的参数存进闭包里的 args，每层调用把新参数 concat 进去，攒够参数个数才调用原函数——参数的持久化与递进收集全靠闭包持有同一个 args 绑定。它和计数器是同一道题：把「count」换成「已收集的参数列表」。",
            bonus:
              "防抖（timer）、节流（lastTime）、柯里化（args）、记忆化（cache）可以合并成一句话记：高阶函数家族 = 闭包记住一种跨调用的状态。判断标准：函数返回函数、且内层引用外层绑定。",
          },
          {
            q: "闭包捕获的是变量还是值？防抖里的 timer 说明了什么？",
            intent:
              "压轴题，回到机制本源——「捕获引用」若是背出来的，就解释不了 timer 为什么能被覆盖重写。",
            depth: 5,
            a: "捕获的是变量绑定（对环境记录的引用）而非值的拷贝。timer 能在下一次触发时被 clearTimeout 读到、能被新一轮 setTimeout 覆盖重写，恰恰证明闭包读写的是同一个变量——如果是值拷贝，重置逻辑根本碰不到旧的定时器句柄。所有「跨调用累积/重置」类模式，都建立在这个语义上。",
            bonus:
              "实现粒度补充：V8 按变量装箱——外层作用域里只有被内层函数引用的变量才进堆上的 Context，「闭包捕获整个作用域」是模型简化。所以闭包的成本与「你引用了多大的变量」直接相关，大对象捕获前先收敛。",
          },
        ]}
      />

      <Paragraph>
        闭包封装状态还有两个工程化的下一站：把「多对多的状态通知」封装起来是发布订阅；
        而闭包持有的状态何时该放手，是内存管理的边界问题：
      </Paragraph>
      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "发布订阅是怎么实现的：手写事件总线",
            to: "/note/frontend/javascript/patterns/event-emitter",
            description: "订阅表本身就是「闭包封装状态」的进阶形态：多对多通知的组织方式。",
          },
          {
            title: "JS 是怎么释放内存的：GC 与泄漏排查",
            to: "/note/frontend/javascript/memory/gc-and-leaks",
            description: "闭包持有的状态什么时候会被回收、什么时候变成泄漏。",
          },
        ]}
      />
    </NoteShell>
  );
}
