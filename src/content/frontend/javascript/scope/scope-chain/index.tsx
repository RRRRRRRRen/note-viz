import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock } from "@/components/demo";
import { CompareTable, CrossRef, DoDont, OutputTimeline, Prerequisite } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Prerequisite
        notes={[
          {
            title: "变量提升是怎么发生的：执行上下文",
            to: "/note/frontend/javascript/scope/execution-context",
          },
        ]}
      >
        本篇的「作用域链」就是上一篇环境记录里的 <code>outer</code>{" "}
        引用串成的链——先有登记，才有查找。
      </Prerequisite>

      <Conclusion>
        作用域是<strong>变量的有效访问范围</strong>，JS 采用词法作用域——作用域在
        <strong>函数定义时</strong>就确定了，跟在哪里调用无关。
        查变量时沿作用域链由内向外逐级查找，命中即停，直到全局，找不到才抛{" "}
        <code>ReferenceError</code>
        。三个推论：内层能看外层、反之不行；同名内层变量遮蔽（shadow）外层；
        <code>var</code> 只有函数/全局作用域，<code>let/const</code> 才有块级作用域。
      </Conclusion>

      <Heading level={2} title="技术对照：DNS 逐级解析" />
      <Paragraph>
        作用域链的查找过程就是<strong>DNS 的逐级解析</strong>：
      </Paragraph>
      <Paragraph>
        你要解析一个域名（访问变量），先查本机缓存与 hosts（当前作用域）；没有，问
        <strong>本地 DNS 服务器</strong>（外层函数）；再没有，逐级上报到
        <strong>根域名服务器</strong>
        （全局作用域）；根上也没有，返回 NXDOMAIN（<code>ReferenceError</code>）。
      </Paragraph>
      <Paragraph>
        关键点：你的解析线路（作用域链）在<strong>配置生效时（函数定义时）</strong>
        就已经确定，之后无论从哪个网络发起查询（函数在哪里被调用），逐级向上问的顺序都不会变——这就是词法作用域。
        它和 DNS 一样是「配置静态、查询动态」：链路写死，查询按需。
      </Paragraph>

      <Heading level={2} title="作用域的三种类型" />
      <Heading level={3} title="全局作用域" />
      <Paragraph>
        页面打开时创建、关闭时销毁，是整条查找链的最后一站。它存在的意义是提供一个
        <strong> everyone 都能到达的兜底命名空间</strong>——任何函数一路向外查，终点都是它；
        反过来说，任何往里写的东西都是潜在的命名冲突源，这也是「少用全局变量」的机制依据：
        它不是风格洁癖，是链路终点的污染半径最大。
      </Paragraph>
      <Paragraph>
        机制上有个细节：浏览器的全局词法环境其实有<strong>两个登记处</strong>——对象记录（
        <code>var/function</code> 声明直接挂到 <code>window</code> 上，成为全局对象的属性）和
        声明式记录（<code>let/const/class</code> 只登记在记录里，不挂 <code>window</code>）。
        两者都在全局层、查找时都会被查到，所以 <code>window.globalLet</code> 是{" "}
        <code>undefined</code>，但裸读 <code>globalLet</code> 完全正常。Node 不同：顶层{" "}
        <code>var</code> 属于模块作用域，不挂 <code>globalThis</code>——同一条规则，宿主落地不同。
      </Paragraph>

      <CodeBlock
        code={`// 浏览器（Chrome 140）经典脚本中实测：
var globalVar = 'I am global';
console.log(window.globalVar); // 'I am global'——var 挂到全局对象

let globalLet = 'I am also global';
console.log(window.globalLet); // undefined——let 不挂
console.log(globalLet);        // 'I am also global'（全局可访问不受影响）`}
      />

      <Heading level={3} title="函数作用域" />
      <Paragraph>
        每次调用函数都会创建一个<strong>全新的、独立的</strong>作用域，这是函数级隔离的来源：
        同一函数递归调用一百次，就有一百份互不干扰的局部变量——没有这个设计，递归根本写不了。
        「内部可以访问外部，反之不行」是单向单向阀：外层看不见内层，内层沿链看得见所有外层。
      </Paragraph>
      <Paragraph>
        引擎层面，函数上下文创建时新建一个环境记录，它的 <code>outer</code> 指向
        <strong>函数定义处</strong>的环境（不是调用处）——这一条就是词法作用域的物理实现，
        也是下一篇闭包的全部基础。作用域的销毁跟着环境记录的可达性走：没有闭包引用，随调用结束回收；
        被闭包引用，则活得比调用更久。
      </Paragraph>

      <Heading level={3} title="块级作用域" />
      <Paragraph>
        ES6 引入，为的是修 <code>var</code> 的两个经典事故：循环变量被异步回调共享成同一个、
        块内声明泄漏出去覆盖外层同名变量。事故的根源都是 <code>var</code>{" "}
        「无视代码块」——代码块只是语法装饰，登记位置全在函数/全局层。
        <code>let/const</code> 把登记粒度降到块，代码块第一次成了真正的边界。
      </Paragraph>
      <Paragraph>
        机制上，进入块时压入一个新的块级环境记录，退出即弹出；TDZ 也是它的产物——
        声明语句执行前，绑定已在块记录里但未初始化。而 <code>var</code>{" "}
        的登记发生在所在函数/全局的变量环境里，块退出后依然活着，这就是"逃出"代码块的真相：
        不是它穿越了边界，是它压根没被边界登记过。
      </Paragraph>

      <CodeBlock
        code={`{
  let blockVar = 'I am in block';
}
console.log(blockVar);
// ReferenceError: blockVar is not defined

{
  var noBlockVar = 'I escape the block';
}
console.log(noBlockVar); // 'I escape the block'`}
      />
      <OutputTimeline
        label="输出解读 / block scope"
        steps={[
          {
            output: "ReferenceError: blockVar is not defined",
            phase: "同步",
            why: "let 登记在块级环境记录里，块退出记录销毁；外层查找沿链走完全程也没命中——是「未定义」而非 TDZ（TDZ 报错发生在块内声明之前）。",
          },
          {
            output: "'I escape the block'",
            phase: "同步",
            why: "var 不参与块级登记，直接登记在全局的变量环境里；块只是它的书写位置，不是它的管辖边界。",
          },
        ]}
      />

      <CompareTable
        label="对比 / var vs let"
        left={{ title: "var", color: PALETTE.purple }}
        right={{ title: "let / const", color: PALETTE.blue }}
        rows={[
          {
            aspect: "作用域层级",
            left: "函数级（块只是语法装饰）",
            right: "块级（每对花括号一个记录）",
          },
          {
            aspect: "提升初始化",
            left: "登记即初始化为 undefined",
            right: "登记但不初始化（TDZ）",
          },
          { aspect: "重复声明", left: "合法，后者覆盖前者", right: "SyntaxError，脚本不执行" },
          { aspect: "全局挂载", left: "浏览器中挂到 window", right: "不挂 window，仅声明式记录" },
          { aspect: "循环迭代绑定", left: "整个循环共享一个绑定", right: "每轮迭代创建一个新绑定" },
        ]}
      />

      <Heading level={2} title="动手验证：词法作用域" />
      <Paragraph>
        <span className="text-muted">先自己推断输出，再在控制台运行对照：</span>
      </Paragraph>
      <CodeBlock
        code={`var value = 1;

function foo() {
  console.log(value);
}

function bar() {
  var value = 2;
  foo();
}

bar();        // 输出: 1（不是 2!）
const obj = { value: 99, foo };
obj.foo();    // 输出: 1（方法调用也不走动态作用域）`}
      />
      <OutputTimeline
        label="输出解读 / lexical scope"
        steps={[
          {
            output: "1",
            phase: "同步",
            why: "foo 定义在全局，创建时 outer 已指向全局环境；在 bar 里被调用也只沿「foo → 全局」这条链找，永远不会路过 bar 的作用域。JS 若采用动态作用域（它没有）这里才会输出 2。",
          },
          {
            output: "1",
            phase: "同步",
            why: "obj.foo() 只改变 this，不改变作用域链——方法调用不会把 obj 的属性拉进查找路径。词法作用域由定义位置决定，this 是唯一的动态角色。",
          },
        ]}
      />
      <Paragraph>
        回扣开头的 DNS 对照：<code>foo</code> 的解析线路（<code>foo → 全局</code>
        ）在它被定义的那一刻就已配置完毕，
        <code>bar()</code> 的调用、<code>obj.foo()</code> 的方法调用都只是「换一个网络发起查询」，
        逐级向上问的顺序分毫不变。如果这份代码换成动态作用域语言，输出就会随调用方漂移—— 正因为 JS
        不是，这类代码才可以只读不跑地给出确定答案。
      </Paragraph>

      <Heading level={2} title="作用域链的查找顺序" />
      <CodeBlock
        code={`var globalVar = 'global';

function outer() {
  var outerVar = 'outer';

  function inner() {
    var innerVar = 'inner';
    console.log(innerVar);  // 'inner' - 当前作用域命中
    console.log(outerVar);  // 'outer' - 上一级命中
    console.log(globalVar); // 'global' - 全局命中
  }

  inner();
}

outer();`}
      />
      <Paragraph>
        查找链：<code>inner → outer → 全局</code>。命中即停，不会继续向外； 全部落空抛{" "}
        <code>ReferenceError</code>。这也解释了为什么
        <strong>内层变量会遮蔽（shadow）外层同名变量</strong>
        ——不是外层消失了，是查找在命中处提前返回。
        遮蔽是单向的：内层读不到外层被遮蔽的值，除非显式起不同的名字。
      </Paragraph>
      <Paragraph>
        工程含义接着机制来：既然没有「向上穿透查找」的语法，需要访问被遮蔽的外层变量时，
        唯一的正路是<strong>在遮蔽发生之前把它提取到别名</strong>（或改掉内层命名）。
        反过来，遮蔽也可以当特性用：函数内部临时变量故意与外层同名以声明「这里我说了算」，
        前提是读者能一眼看出层级——命名相同而层级不同的代码，永远是排查时的噪音源。
      </Paragraph>

      <Heading level={2} title="边界陷阱" />
      <Paragraph>
        <code>var</code> 与块级作用域的组合最容易出事，坑的共同点是：
        <strong>声明生效的范围比你以为的代码块大一号</strong>。第一个坑是块内 <code>var</code>{" "}
        泄漏——写在块里，登记却在函数/全局层：条件块里的 <code>var</code>{" "}
        声明在块外照常可读（没执行到时是静默的 <code>undefined</code>，逻辑错误被掩盖）；
        若外层已有同名 <code>let</code>，则升级为 <code>SyntaxError</code>，整个脚本拒绝执行。
        排查这类问题时盯着块看会一无所获，因为声明压根没被块登记过。
      </Paragraph>
      <DoDont
        label="块内声明的管辖边界 / var leakage"
        dont={{
          code: `function handler(needInit) {
  if (needInit) {
    var config = load(); // 本想块内私有
  }
  return config;
  // needInit 为 false：返回 undefined
  // 不抛错——var 泄漏到函数级，
  // 「漏初始化」被静默掩盖
}
handler(false); // undefined`,
          note: "var 无视块边界：登记在函数级，块退出后照常存活——边界错误被静默的 undefined 掩盖",
        }}
        do={{
          code: `function handler(needInit) {
  if (needInit) {
    let config = load(); // 真正的块内私有
  }
  return config;
  // ReferenceError:
  // config is not defined
}
// 需要跨块共享时，把声明提到块外，
// 让共享成为显式决定`,
          note: "let 把管辖范围收窄到块：误用当场抛 ReferenceError 而不是返回 undefined——把作用域当最小权限来用",
        }}
      />
      <Paragraph>
        第二个坑更隐蔽：<strong>块内函数声明的行为跨引擎不一致</strong>
        。规范正文里块内函数声明属于块级， 但为了兼容存量网页，ECMA-262 又以附录 B（Annex
        B）标准化了一套「宽松语义」：非严格模式下，
        块内的函数声明会把一个绑定泄漏到外层函数/全局作用域。实测 Node v22：非严格函数内{" "}
        <code>typeof f</code> 得到 <code>"function"</code>（泄漏成功），ES Module（严格）里得到{" "}
        <code>"undefined"</code>（块级，未泄漏）。同一行代码换一个环境结论就反转——这种代码不该写。
      </Paragraph>
      <DoDont
        label="块内函数声明 / fn decl in block"
        dont={{
          code: `function test() {
  {
    function f() { return 'in-block'; }
  }
  return typeof f;
  // 非严格：'function'（Annex B 泄漏）
  // 模块/严格：'undefined'（块级）
}`,
          note: "依赖「块内函数声明泄漏到块外」的代码，跨严格模式/跨引擎行为不一致",
        }}
        do={{
          code: `function test() {
  let f;
  {
    f = () => 'in-block'; // 赋值语义，无歧义
  }
  return typeof f; // 永远 'function'
}`,
          note: "块内需要函数就用 let + 函数表达式/箭头函数，把绑定行为写死，不赌 Annex B",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "作用域链是定义时确定还是调用时确定？",
            intent: "热身题，词法作用域的一句话结论人人会背，考察你能不能落到函数内部槽的层面。",
            depth: 2,
            a: "定义时确定。函数对象创建的那一刻，[[Environment]] 内部槽就记住了定义处的外部环境引用；调用时新建的环境记录 outer 指向它，查找沿这条固定链进行——与调用位置、调用方式都无关。箭头函数捕获 this 用的也是同一套机制。",
            bonus:
              "动态作用域语言（如 bash 的局部变量、Emacs Lisp 动态绑定）才是「调用时确定」——函数行为随调用方变化，无法只读代码做静态分析，这正是 JS 没有选它的原因。",
          },
          {
            q: "var 和 let 在 for 循环里的本质区别？",
            intent:
              "经典题的深挖版——答「一个函数级一个块级」只是第一层，面试官想听每轮迭代的绑定机制。",
            depth: 3,
            a: "var 在整个循环外只创建一个绑定，所有迭代共享，循环结束后它是最终值；let 按规范每轮迭代创建一个新绑定，并把上一轮的值复制进来。配合异步回调时：共享绑定的回调读到循环结束后的最终值，独立绑定的回调各自记着当轮的值。",
            bonus:
              "「每轮新绑定」发生在 for 头的 let 上——这不是 let 的一般行为，是循环语句的特判逻辑（CreatePerIterationEnvironment）。手写 while 循环模拟 for-let 时不会有这个待遇。",
          },
          {
            q: "变量查找越远越慢，这个说法对吗？",
            intent: "考性能直觉的辨析力——方向正确但机制停留在 ES3 时代，说得出引擎优化才是及格线。",
            depth: 4,
            a: "方向正确但结论过时。词法上更远意味着多走几跳 outer，但 V8 等引擎用内联缓存把「沿链查找」优化成带形状校验的常数时间命中，热点代码里链长差异通常被抹平。真正贵的查找是 with、eval 这类让作用域静态不可分析的写法——它们让缓存失效。不要为「链短」牺牲代码清晰度。",
            bonus:
              "全局作用域是例外：它跨过脚本边界且可能被动态扩展（var 挂 window），查找成本确实略高——超热循环里把全局引用提前存进局部变量仍有微弱收益，属于最后的微优化。",
          },
          {
            q: "全局作用域和全局执行上下文是一回事吗？",
            intent:
              "概念区分题——「作用域」和「上下文」被混用的笔记到处都是，这题筛掉只会背名词的人。",
            depth: 5,
            a: "不是。执行上下文是运行时概念：一段代码执行所需的环境记录（含 this、词法环境），全局上下文只有一个、伴随程序全程；作用域是词法结构层面的访问规则，写在代码里、分析代码就能确定。两者的连接点是外部环境引用：作用域链正是通过上下文环境记录的 outer 链条物理串起来的——词法结构决定了链怎么连，上下文提供了链的实体。",
            bonus:
              "浏览器全局词法环境内部还有对象记录与声明式记录两套登记（var 挂 window、let/const 不挂），说明「全局」在规范层面也是分层设计——一个概念，两种登记路径。",
          },
        ]}
      />

      <Paragraph>
        函数定义时固定下来的那条链，会在函数被带离定义处时跟着走——环境被「带走」之后发生了什么，
        就是闭包；而链上查到的 <code>this</code> 为什么反而不看这条链，是另一条独立的规则：
      </Paragraph>
      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "this 到底指向谁？",
            to: "/note/frontend/javascript/scope/this-binding",
            description:
              "同一次函数调用里，作用域走词法链，this 却由调用方式注入——两条规则别混淆。",
          },
          {
            title: "闭包到底是什么：词法环境的快照",
            to: "/note/frontend/javascript/closure/closure-basics",
            description: "作用域链被函数带离定义处之后，环境记录的存活与捕获机制。",
          },
        ]}
      />
    </NoteShell>
  );
}
