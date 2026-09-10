import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock } from "@/components/demo";
import {
  CrossRef,
  DoDont,
  MemoryMap,
  OutputTimeline,
  Prerequisite,
  StateFlow,
} from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        执行上下文是<strong>代码执行前的环境准备</strong>：绑定 this、登记所有声明、建立作用域链。
        全局上下文只有一个；函数每次调用都新建一个压入调用栈，执行完弹出。「变量提升」不是代码被移动，
        而是创建阶段先扫描登记的副产品——<code>var</code> 提升且初始化为 <code>undefined</code>，
        函数声明整体提升，<code>let/const</code> 提升但不初始化（TDZ）。上下文弹出后，
        堆上的环境记录是否回收只看<strong>还有没有闭包引用</strong>。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "事件循环是怎么调度的：从调用栈到微任务",
            to: "/note/frontend/javascript/event-loop/event-loop-basics",
          },
        ]}
      >
        本篇讨论「一段代码被执行时环境怎么准备」，与「回调排进哪个队列」互补——调用栈是事件循环图里的那条主轨道。
      </Prerequisite>

      <Heading level={2} title="技术对照：调试器里的 Call Stack 面板" />
      <Paragraph>
        执行上下文栈就是<strong>调试器里的 Call Stack 面板</strong>，永远只执行栈顶那一帧：
        程序启动时压入一个常驻的栈底帧（全局上下文）；每调用一个函数，就把新帧
        <strong>压</strong>到栈顶；函数返回帧弹出，露出下面的帧继续执行。 在 Chrome DevTools 的
        Sources 面板里打断点，右侧那个 Call Stack 列表就是它的实时快照——每一行对应一个待续的上下文。
      </Paragraph>
      <Paragraph>
        栈是有限资源：叠得越深（递归越深），离引擎上限（各实现约万层量级）越近，压爆了就是栈溢出。
        ECMA-262（ES2015
        起）曾把「正确的尾调用（PTC）」写进规范——尾位置的递归调用可以复用当前栈帧、深度恒定—— 但只有{" "}
        <strong>JavaScriptCore（Safari/WebKit）</strong>默认实现了它；V8 做过实验性实现（
        <code>--harmony-tailcalls</code>）后从未默认启用并最终移除，SpiderMonkey 也没有跟进。
        所以写跨引擎代码不能依赖 PTC：深递归请改写为循环，或用 trampoline 手动展平。
      </Paragraph>

      <Heading level={2} title="执行上下文的类型" />
      <Paragraph>
        <strong>全局上下文</strong>：程序启动时创建，唯一一个，浏览器中 <code>this</code> 指向{" "}
        <code>window</code>
        。唯一意味着它不需要「创建参数」——没有调用方，环境就是宿主给定的全局环境。
        <strong>函数上下文</strong>：每次调用创建一个，数量不限。每次调用都新建，才让递归成为可能——
        第 N 层递归的局部变量和第 N+1 层互不干扰，因为它们住在两个不同的上下文里。 （
        <code>eval</code> 也有自己的上下文，但不要用它。）
      </Paragraph>

      <CodeBlock
        code={`function first() {
  console.log('Inside first function');
  second();
  console.log('Again inside first function');
}

function second() {
  console.log('Inside second function');
}

first();
console.log('Inside global execution context');

// 真实输出（Node v22.17.0 实测）：
// Inside first function
// Inside second function
// Again inside first function
// Inside global execution context`}
      />
      <Paragraph>
        <strong>栈的变化</strong>：<code>[global]</code> → <code>[global, first]</code> →{" "}
        <code>[global, first, second]</code> → <code>[global, first]</code> → <code>[global]</code>
        。注意 first 的后半段要等 second 弹栈后才能继续——这就是"栈顶优先"：
        任何一个上下文在任意时刻只可能被挂起（因为调用了别人），绝不会被插队。
      </Paragraph>

      <StateFlow
        label="单个上下文的生命周期 / context lifecycle"
        direction="LR"
        states={[
          { id: "call", label: "函数被调用", kind: "start", color: PALETTE.orange },
          { id: "create", label: "创建阶段", desc: "绑定 this · 登记声明", color: PALETTE.blue },
          { id: "run", label: "执行阶段", desc: "逐行赋值与调用", color: PALETTE.orange },
          { id: "done", label: "出栈等待 GC", kind: "terminal", color: PALETTE.gray },
        ]}
        transitions={[
          { from: "call", to: "create", label: "新上下文压栈" },
          { from: "create", to: "run", label: "登记完毕" },
          { from: "run", to: "run", label: "调用新函数：本帧挂起" },
          { from: "run", to: "done", label: "return / 执行到底" },
        ]}
      />

      <Heading level={2} title="上下文的三个阶段" />
      <Heading level={3} title="创建阶段" />
      <Paragraph>
        为什么要有独立的创建阶段？因为
        <strong>「声明登记」和「执行赋值」被设计成两件无关的事</strong>
        ：引擎在执行任何一行代码之前，先静态扫描整个作用域，把所有声明一次性登记进环境。
        声明语句写在第 100 行还是第 1 行，登记结果完全相同——「提升」就是这个设计的副产品，
        而不是引擎搬运了你的代码。它换来的好处是：函数可以互相引用、先后书写不受限（函数声明互相调用很自由），
        引擎也不必在执行中途反复停下来处理「这里出现了一个新声明」。
      </Paragraph>
      <Paragraph>
        机制上，创建阶段做三件事：绑定 <code>this</code>；创建<strong>词法环境</strong>
        （环境记录存 <code>let/const</code> 声明 + 指向定义处外部环境的 <code>outer</code> 引用）；
        创建<strong>变量环境</strong>（专门存 <code>var</code> 声明，登记即初始化为
        <code>undefined</code>；函数声明在这里整体登记，声明加赋值一步到位）。
        <code>let/const</code> 存在词法环境里，登记但<strong>不初始化</strong>
        ——存放位置与初始化时机的差异， 就是提升行为差异的全部根源。下图是 <code>first()</code>{" "}
        执行时的内存布局。
      </Paragraph>

      <MemoryMap
        label="上下文的内存布局 / context layout"
        regions={[
          {
            id: "stack",
            title: "调用栈（栈帧）",
            desc: "上下文的壳，随调用压入弹出",
            layout: "column",
            color: PALETTE.orange,
          },
          {
            id: "heap",
            title: "堆（环境记录）",
            desc: "声明登记在这里；规范模型，对应 V8 堆上的 Context 对象",
            layout: "wrap",
            color: PALETTE.blue,
          },
        ]}
        objects={[
          {
            id: "firstCtx",
            region: "stack",
            label: "first() 上下文（栈顶）",
            color: PALETTE.orange,
            fields: [
              { name: "[[LexicalEnv]]", refTo: "firstEnv" },
              { name: "this", value: "undefined" },
            ],
          },
          {
            id: "globalCtx",
            region: "stack",
            label: "全局上下文（栈底）",
            color: PALETTE.orange,
            fields: [{ name: "[[LexicalEnv]]", refTo: "globalEnv" }],
          },
          {
            id: "firstEnv",
            region: "heap",
            label: "first 的环境记录",
            color: PALETTE.blue,
            fields: [
              { name: "outer", refTo: "globalEnv" },
              { name: "second", value: "<function>" },
            ],
          },
          {
            id: "globalEnv",
            region: "heap",
            label: "全局环境记录",
            color: PALETTE.blue,
            fields: [
              { name: "outer", value: "null" },
              { name: "first", value: "<function>" },
              { name: "second", value: "<function>" },
            ],
          },
        ]}
        note="first() 执行中的快照：栈帧只保存指向环境记录的引用，声明确实登记在堆上的记录里；outer 引用把记录串成作用域链（作用域链的物理载体）。first 弹栈后若没有闭包引用，firstEnv 不可达即被回收。"
      />

      <Heading level={3} title="执行阶段" />
      <Paragraph>
        创建阶段把舞台搭好，执行阶段才逐行推进。这个分离的语义后果值得细品：
        <strong>声明在哪一行完全不影响可用性，但赋值与调用严格按行序</strong>
        ——所以「提升后的 undefined」和「真正的值」有时间差，<code>console.log(a)</code>{" "}
        写在赋值前读到占位值、
        写在赋值后读到真值。理解了这一点，提升相关的所有面试题都变成同一道题：登记发生在创建阶段，读写发生在执行阶段。
      </Paragraph>
      <Paragraph>
        引擎层面，执行阶段由解释器（V8 的 Ignition）按字节码逐条推进：读变量沿环境记录的{" "}
        <code>outer</code> 链逐级查找；读 <code>let/const</code> 时附带 TDZ
        检查——绑定存在但未初始化， 直接抛 <code>ReferenceError</code>
        ；遇到函数调用则从头走一遍创建阶段、新上下文压栈，当前帧挂起等待。
        每次赋值都是对某个环境记录的一次写入——闭包之所以能「共享变量」，正因为两个函数读写的是同一条记录（见「闭包」篇）。
      </Paragraph>

      <Heading level={3} title="回收阶段" />
      <Paragraph>
        函数返回，栈帧弹出——但<strong>弹出销毁的只是栈帧这个壳</strong>
        ，堆上的环境记录并不随之消失。
        这是刻意的分层设计：栈管执行位置（快进快出），堆管数据存活（按可达性）。两套生命周期分开管理，
        闭包才有存在空间——函数可以把环境记录的引用带出去，让数据活得比调用更久。
      </Paragraph>
      <Paragraph>
        回收的裁决权在 GC
        手里，标准只有可达性：环境记录没有被任何存活对象（比如被返回的闭包、注册出去的回调）
        引用，就在下一次 GC 中被回收；有引用，则连同名变量一起常驻内存。V8 的做法是：
        编译期分析哪些局部变量被内层函数引用，把<strong>只有这些变量</strong>装箱进堆上的 Context
        对象，
        其余变量仍留在栈帧里随弹出消亡——闭包的内存成本因此是「按捕获变量付费」，不是整个作用域打包带走。
      </Paragraph>

      <Heading level={2} title="动手验证：变量提升的三种表现" />
      <Paragraph>
        三段代码各自独立运行（第三段抛错会终止脚本，实测 Node
        v22.17.0）。先自己推断输出，再看逐条解读：
      </Paragraph>
      <CodeBlock
        code={`console.log(a); // undefined（不是 ReferenceError）
var a = 10;

foo(); // 'Hello'（函数声明整体提升，可以先调用）
function foo() {
  console.log('Hello');
}

console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 20;`}
      />
      <OutputTimeline
        label="输出解读 / hoisting explained"
        steps={[
          {
            output: "undefined",
            phase: "同步",
            why: "var a 在创建阶段登记并初始化为 undefined，执行阶段读到的是这个占位值。提升给你的不是「还没声明」，而是「已声明未赋值」。",
          },
          {
            output: "Hello",
            phase: "同步",
            why: "函数声明的提升是整体提升：创建阶段就把函数对象赋给了 foo，调用语句写在声明之前完全合法。",
          },
          {
            output: "ReferenceError: Cannot access 'b' before initialization",
            phase: "同步",
            why: "let b 同样被登记了（所以报错不是 is not defined），但创建阶段不初始化——声明语句执行前处于暂时性死区（TDZ），读取触发引用错误。",
          },
        ]}
      />

      <DoDont
        label="TDZ 期访问 / tdz access"
        dont={{
          code: `// 以为提升 = 可以随便先访问
console.log(config);
// ReferenceError: Cannot access
// 'config' before initialization
let config = loadConfig();`,
          note: "let 提升但不初始化：声明语句执行前是 TDZ，访问直接抛错，且不会向外层同名变量「穿透」",
        }}
        do={{
          code: `let config = loadConfig();
console.log(config); // 先声明再访问

// 需要「未初始化」语义时，显式写出来
let cache; // undefined，语义自明`,
          note: "undefined 是「已登记且已初始化为空」的占位语义——要占位就显式 let cache;，别赌提升行为",
        }}
      />

      <Heading level={2} title="函数声明 vs 函数表达式" />
      <Paragraph>
        两者语法形似，提升路径却完全不同，因为它们在创建阶段走的是不同的登记手续： 函数声明走
        <strong>整体登记</strong>
        ——声明与赋值在创建阶段一步到位，执行阶段那行「声明」实际上已经无事可做； 函数表达式本质是
        <strong>一个 var 声明加一个赋值语句</strong>，被提升的只有 <code>var bar</code> 部分，
        函数值要等执行到那一行才诞生。
      </Paragraph>
      <Paragraph>
        报错信息的差异因此成为诊断线索：<code>TypeError: bar is not a function</code>{" "}
        说明变量已登记、 值不是函数（<code>undefined()</code> 的必然结果）；
        <code>Cannot access before initialization</code> 说明是 <code>let/const</code> 的
        TDZ；纯「未声明」则是第三种报错 <code>is not defined</code>。
        面试时能区分这三种报错对应的登记状态，是理解创建阶段的直接证据。
      </Paragraph>

      <DoDont
        label="两种函数写法 / function decl vs expr"
        dont={{
          code: `start();
// TypeError: start is not a function
var start = function () {
  console.log('started');
};`,
          note: "只有 var start 提升为 undefined，函数值留在原地——调用发生在赋值之前，等于调用 undefined",
        }}
        do={{
          code: `start(); // 正常执行
function start() {
  console.log('started');
}

// 必须用表达式时：先定义，后调用
const run = function () { /* ... */ };
run();`,
          note: "函数声明整体提升可以前置调用；表达式请保证调用在赋值之后——报错类型能直接帮你定位是哪种",
        }}
      />
      <Paragraph>
        把三个演示合并成一句总纲：
        <strong>创建阶段决定「登记成什么样」，执行阶段决定「读到什么值」</strong>。 var
        登记即初始化（undefined 等着被覆盖）、函数声明登记即赋值（函数对象先于一切代码存在）、
        let/const 登记不初始化（TDZ 看守到声明行）。所有提升相关的争议——先访问、同名冲突、
        报错类型——都可以还原为「这两个阶段各自做了什么」，不需要背任何口诀。
      </Paragraph>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "函数声明和变量声明同名，谁赢？",
            intent:
              "热身题，考创建阶段登记的优先级——很多人背了「函数优先」，却说不清后续赋值照样能覆盖。",
            depth: 2,
            a: "创建阶段函数声明优先登记：function foo 的登记会取代 var foo 的 undefined 占位，提升结束后 foo 是函数。但进入执行阶段后，代码里的赋值语句 foo = 'variable' 照常执行，foo 会被覆盖成字符串——「提升谁赢」决定初始值，「执行阶段赋值」依然有效，两者别混为一谈。",
            bonus:
              "同一作用域里 let 与 var 声明同名变量是 SyntaxError（重复声明），整个脚本都不执行——这条检查发生在任何代码运行之前，是最早暴露的一类错误。",
          },
          {
            q: "暂时性死区的范围怎么算？外层有同名变量能穿透吗？",
            intent:
              "考 TDZ 的作用域语义——「不穿透」这条反直觉，检验你是背了『声明前不能用』还是真懂块级环境记录。",
            depth: 3,
            a: "TDZ 从块级作用域开始到 let/const 声明语句执行完毕，且不穿透：块内的 let x 让这个块里所有对 x 的查找都绑定到块级环境记录，声明前访问一律抛 ReferenceError: Cannot access 'x' before initialization——即使外层有已初始化的同名 x 也一样（Node v22 实测）。作用域是词法的，遮蔽从登记那一刻就生效，与执行进度无关。",
            bonus:
              "typeof 也不豁免：TDZ 内 typeof x 同样抛 ReferenceError——「typeof 检查安全」只对未声明变量成立，对未初始化的 let/const 不成立。",
          },
          {
            q: "bar is not a function 和 Cannot access 'b' before initialization，两种报错怎么定位？",
            intent:
              "考你能否从报错信息反推登记状态——工程里 90% 的提升事故是先看到报错再回头看代码，报错类型就是最快的诊断入口。",
            depth: 4,
            a: "前者是 var 承载的函数表达式：名字已提升为 undefined，调用 undefined() 抛 TypeError——去查调用语句是否跑到了赋值前面。后者是 let/const 的 TDZ：绑定存在但未初始化，读取抛 ReferenceError——去查声明语句的位置。再叠加纯未声明变量的 is not defined，三种报错精确对应三种登记状态：已登记但值不对、已登记未初始化、从未登记。",
            bonus:
              "把报错差异用作代码评审信号：函数表达式 + 模块顶层互相调用时，var 写法会拖出运行时 TypeError，改函数声明或 const + 箭头函数能把错误提前到语法检查期。",
          },
          {
            q: "提升是代码被物理移动了吗？引擎到底在哪一步完成登记？",
            intent:
              "压轴题，区分「背口诀」与「懂流程」——答出解析阶段静态收集的，才真正理解为什么提升只在同一作用域内发生。",
            depth: 5,
            a: "不是移动。代码位置一字不变，登记发生在解析阶段：引擎在执行任何字节码之前先扫描整个作用域，收集所有声明并建好环境记录——V8 在解析期就生成作用域信息，字节码生成时据此确定每个变量的读写目标。这也直接解释了提升的边界：扫描不跨函数、不跨块，所以声明永远只在它所在的作用域内提升，跨作用域的「提升」从来就不存在。",
            bonus:
              "V8 对函数体还有惰性编译：外层解析时对内层函数只做预解析（查语法错误、记录声明占位），真正被调用时才全量编译——启动开销与执行解耦，也让「提升看起来发生在调用之前」有了实现层的注脚。",
          },
        ]}
      />

      <Paragraph>
        环境记录串成的 <code>outer</code>{" "}
        链就是作用域链——变量到底沿什么顺序被找到，是下一个该问的问题；
        而上下文弹出后环境记录凭什么还能活着，通往闭包：
      </Paragraph>
      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "变量是怎么被找到的：作用域与作用域链",
            to: "/note/frontend/javascript/scope/scope-chain",
            description: "outer 引用串起来的查找链怎么走、词法作用域为何在定义时定型。",
          },
          {
            title: "闭包到底是什么：词法环境的快照",
            to: "/note/frontend/javascript/closure/closure-basics",
            description: "上下文弹栈后环境记录为什么没被回收——[[Environment]] 的内存真相。",
          },
        ]}
      />
    </NoteShell>
  );
}
