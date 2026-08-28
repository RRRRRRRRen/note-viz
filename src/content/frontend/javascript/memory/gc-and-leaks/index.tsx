import { Conclusion, NoteShell, Prose, QAChain, Section, Subsection } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        现代 JS 引擎用<strong>标记清除</strong>：从根（全局对象、当前调用栈）出发标记所有可达对象，
        清除不可达者——所以<strong>「能否被访问到」决定生死</strong>，而不是引用数。 泄漏的本质是
        <strong>对象已经没用、但仍然被根可达的引用链挂着</strong>：
        意外全局变量、被遗忘的定时器、脱离 DOM 的引用、不必要的闭包捕获。
      </Conclusion>

      <Section title="一个生活化的类比">
        <Prose>
          <p>
            标记清除像<strong>小区物业清理长期占位的僵尸车</strong>：
          </p>
          <p>
            物业从<strong>登记册（根：全局对象/当前栈）</strong>
            出发，挨个打电话确认："这车还有人要吗？"
            车主说"我下周还开"——贴绿标（标记，可达）；电话打不通、没人认领——贴红条拖走（清除，不可达）。
          </p>
          <p>
            早期的<strong>引用计数</strong>则是"数钥匙"：几把车钥匙（引用）就保留，钥匙归零就拖走。
            问题是一辆车两把钥匙互锁在车里（循环引用），每把都有钥匙、永远数不到零，车永远占着位子——
            这正是它被淘汰的原因。
          </p>
        </Prose>
      </Section>

      <Section title="标记清除 vs 引用计数">
        <Subsection title="标记清除（主流）">
          <Prose>
            <p>
              从根遍历 → 标记可达 → 清除不可达。能正确处理循环引用，因为可达性判断不看引用数，
              看是否从根"顺着摸得到"。
            </p>
          </Prose>
          <CodeBlock
            code={`var obj1 = { name: 'Object 1' };
var obj2 = { name: 'Object 2' };
var obj3 = { name: 'Object 3', ref: obj1 };

obj1 = null; // obj1 被 obj3.ref 引用着，仍可达，不回收
obj2 = null; // obj2 无人引用，不可达，回收
obj3 = null; // 此时 obj1、obj3 都不可达，一起回收`}
          />
        </Subsection>
        <Subsection title="引用计数（已淘汰）">
          <CodeBlock
            code={`function circularReference() {
  var obj1 = {};
  var obj2 = {};
  obj1.ref = obj2;
  obj2.ref = obj1;
  // 函数结束后按标记清除：两者从根不可达，正常回收
  // 按引用计数：互相引用计数恒为 1，永远不回收（泄漏）
}
circularReference();`}
          />
          <Prose>
            <p>
              <strong>运行结果解读</strong>：同一段代码在两种算法下生死不同—— 这就是 IE 时代 DOM+JS
              循环引用泄漏的根源，也是现代引擎改用标记清除的动机。
            </p>
          </Prose>
        </Subsection>
      </Section>

      <Section title="四种经典泄漏场景">
        <Subsection title="1. 意外的全局变量">
          <CodeBlock
            code={`function leak() {
  name = 'Global leak'; // 忘记声明 → 挂到全局 → 永不回收
}
leak();

// 防御：开启 'use strict' 后这行直接抛 ReferenceError`}
          />
        </Subsection>
        <Subsection title="2. 被遗忘的定时器">
          <CodeBlock
            code={`var data = new Array(1000000);

var timer = setInterval(function () {
  var node = document.getElementById('node');
  if (node) node.innerHTML = String(data.length);
}, 1000);

// 即使 node 被移除，定时器闭包仍引用 data
// 正确做法：不再需要时 clearInterval(timer)`}
          />
        </Subsection>
        <Subsection title="3. 脱离 DOM 的引用">
          <CodeBlock
            code={`var elements = { button: document.getElementById('button') };

document.body.removeChild(document.getElementById('button'));
// DOM 已移除，但 JS 变量仍引用它 → 节点无法回收

// 解决：用完置空
elements.button = null;`}
          />
        </Subsection>
        <Subsection title="4. 闭包的多余捕获">
          <CodeBlock
            code={`function assignHandler() {
  var element = document.getElementById('button');
  var id = element.id;

  element.onclick = function () {
    console.log(id); // 只需要 id，闭包却把整个 element 带进了可存活集
  };

  element = null; // 改进：切断不必要的引用链
}`}
          />
        </Subsection>
      </Section>

      <Section title="减少 GC 压力的实践">
        <Prose>
          <p>
            <strong>数组清空</strong>用 <code>arr.length = 0</code> 替代 <code>arr = []</code>
            （复用数组对象，少产生待回收垃圾）；<strong>大对象</strong>
            用完及时置 <code>null</code> 解除引用；<strong>定时器/监听器</strong>
            用完成对清理（<code>clearInterval</code> / <code>removeEventListener</code>）；
            <strong>意外全局</strong>
            靠严格模式在开发期拦住。频繁创建大对象的热路径（动画、游戏循环） 考虑对象池复用。
          </p>
        </Prose>
      </Section>

      <Section title="经典追问链">
        <QAChain
          items={[
            {
              q: "标记清除的根具体指什么？",
              a: "全局对象、当前调用栈上所有函数的局部变量、以及宿主环境注册的引用（如 DOM 节点的原生处理器）。从这些起点顺着引用链能摸到的对象都算存活。",
            },
            {
              q: "GC 运行时会卡住页面吗？",
              a: "会。全量标记需要 stop-the-world，但 V8 做了增量标记（把标记拆成小块穿插在脚本执行间）与并发/并行回收，把单次停顿压到毫秒级。写代码时避免一次性分配巨量对象仍是最佳实践。",
            },
            {
              q: "Chrome DevTools 里怎么定位泄漏？",
              a: "Performance 面板录一段操作看内存锯齿是否只涨不跌；Memory 面板拍堆快照（Heap Snapshot），用 Comparison 视图对比两次快照中持续增长的对象，Retained Size 排序找持有者。",
            },
            {
              q: "WeakMap/WeakSet 和内存泄漏什么关系？",
              a: "它们的键是弱引用，不参与 GC 可达性计算——对象其他引用都没了就会被回收，即使还挂在 WeakMap 里。适合给 DOM 节点、组件实例附加元数据而不阻止其回收。",
            },
          ]}
        />
      </Section>
    </NoteShell>
  );
}
