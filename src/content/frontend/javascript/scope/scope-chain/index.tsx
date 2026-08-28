import { Conclusion, NoteShell, Prose, QAChain, Section, Subsection } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        作用域是<strong>变量的有效访问范围</strong>，JS 采用词法作用域—— 作用域在
        <strong>函数定义时</strong>就确定了，跟在哪里调用无关。
        查变量时沿作用域链由内向外逐级查找，直到全局，找不到才抛 <code>ReferenceError</code>。
      </Conclusion>

      <Section title="一个生活化的类比">
        <Prose>
          <p>
            把作用域链想成<strong>公司里的逐级请示</strong>：
          </p>
          <p>
            你（当前函数）要报销一笔钱（访问变量），先查自己的预算（当前作用域）； 自己没有，找
            <strong>直属主管</strong>（外层函数）；主管也没有，逐级上报到 <strong>CEO</strong>
            （全局作用域）；CEO 这里都没有，直接被驳回（<code>ReferenceError</code>）。
          </p>
          <p>
            关键点：你的汇报线路（作用域链）在你<strong>入职时（函数定义时）</strong>
            就写进了组织架构，
            之后无论你被借调到哪里办公（函数在哪里被调用），请示对象都不会变——这就是词法作用域。
          </p>
        </Prose>
      </Section>

      <Section title="作用域的三种类型">
        <Subsection title="全局作用域">
          <Prose>
            <p>
              页面打开时创建、关闭时销毁。注意 <code>var/function</code> 声明会挂到{" "}
              <code>window</code> 上，而 <code>let/const/class</code>{" "}
              不会——它们存在于脚本级声明中，但同样全局可访问：
            </p>
          </Prose>
          <CodeBlock
            code={`var globalVar = 'I am global';
console.log(window.globalVar); // 'I am global'

let globalLet = 'I am also global';
console.log(window.globalLet); // undefined

console.log(globalLet); // 'I am also global'（访问不受影响）`}
          />
        </Subsection>
        <Subsection title="函数作用域">
          <Prose>
            <p>
              每次调用函数都会创建一个<strong>全新的、独立的</strong>作用域，函数执行完毕即销毁。
              内部可以访问外部，反之不行。
            </p>
          </Prose>
        </Subsection>
        <Subsection title="块级作用域">
          <Prose>
            <p>
              ES6 引入。只有 <code>let/const</code> 声明的变量受块级约束，<code>var</code>{" "}
              会"逃出"代码块：
            </p>
          </Prose>
          <CodeBlock
            code={`{
  let blockVar = 'I am in block';
}
console.log(blockVar); // ReferenceError: blockVar is not defined

{
  var noBlockVar = 'I escape the block';
}
console.log(noBlockVar); // 'I escape the block'`}
          />
        </Subsection>
      </Section>

      <Section title="动手验证：词法作用域">
        <p className="mb-2 text-sm text-muted">先自己推断输出，再在控制台运行对照：</p>
        <CodeBlock
          code={`var value = 1;

function foo() {
  console.log(value);
}

function bar() {
  var value = 2;
  foo();
}

bar(); // 输出: 1（不是 2!）`}
        />
        <Prose>
          <p>
            <strong>运行结果解读</strong>：<code>foo</code> 定义在全局，它的外层作用域就是全局；
            即使在 <code>bar</code> 里被调用，查 <code>value</code> 也只沿「foo → 全局」这条链找，
            永远不会路过 <code>bar</code> 的作用域。如果 JS 采用动态作用域（它没有），这里才会输出
            2。
          </p>
        </Prose>
      </Section>

      <Section title="作用域链的查找顺序">
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
        <Prose>
          <p>
            查找链：<code>inner → outer → 全局</code>。命中即停，不会继续向外； 全部落空抛{" "}
            <code>ReferenceError</code>。这也解释了为什么
            <strong>内层变量会遮蔽（shadow）外层同名变量</strong>。
          </p>
        </Prose>
      </Section>

      <Section title="经典追问链">
        <QAChain
          items={[
            {
              q: "作用域链是定义时确定还是调用时确定？",
              a: "定义时确定。函数创建时其 [[Environment]] 内部槽就记录了定义处的外部环境引用，调用时沿这条固定链查找，与调用位置无关。",
            },
            {
              q: "var 和 let 在 for 循环里的本质区别？",
              a: "var 只在函数级创建一个绑定，所有迭代共享；let 每轮迭代创建一个新绑定。所以配合异步回调时 var 输出最终值、let 输出各轮值。",
            },
            {
              q: "变量查找越远越慢，这个说法对吗？",
              a: "方向正确但机制过时。引擎（如 V8）的隐藏类和内联缓存已大幅优化查找，性能差异在多数场景可忽略，不要为『链短』而牺牲代码清晰度。",
            },
            {
              q: "全局作用域和全局执行上下文是一回事吗？",
              a: "不是。执行上下文是代码执行的环境记录（含 this、词法环境），全局上下文只有一个；作用域是词法结构层面的访问规则。作用域链正是通过上下文中的外部环境引用串起来的。",
            },
          ]}
        />
      </Section>
    </NoteShell>
  );
}
