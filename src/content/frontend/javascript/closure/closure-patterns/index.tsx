import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        闭包的工程价值集中在三个模式：<strong>私有变量</strong>（外部拿不到引用就改不了状态）、
        <strong>持久状态</strong>（函数执行完状态仍在，如计数器）、
        <strong>高阶封装</strong>（防抖/节流/柯里化都是"闭包记住配置，返回待触发函数"）。
        闭包的形成条件：函数嵌套 + 内部引用外部变量 + 内部函数被返回或保存到外部。
      </Conclusion>

      <Heading level={2} title="技术对照：事件回调捕获的状态" />
      <Paragraph>
        闭包你其实天天在用：<strong>事件回调捕获的状态</strong>。
      </Paragraph>
      <Paragraph>
        初始化代码里注册了一个 <code>addEventListener</code>，回调引用了当时的配置对象。
        之后哪怕注册回调的那段代码早已执行完毕，事件触发时回调依然能读到那份配置——
        被捕获的变量跟着回调走，生命周期不再由原作用域决定，而由「是否还有引用」决定。
      </Paragraph>

      <Heading level={2} title="模式一：私有变量" />
      <CodeBlock
        code={`function createPerson(name) {
  var _name = name;

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
        <strong>运行结果解读</strong>：<code>_name</code> 只存在于 <code>createPerson</code>{" "}
        的作用域里，唯一入口是闭包暴露的 <code>getName/setName</code>。这就是 ES2022{" "}
        <code>#私有字段</code> 出现之前， JS 实现封装的标准手法。
      </Paragraph>

      <Heading level={2} title="模式二：独立持久的计数器" />
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
      <Paragraph>
        <strong>运行结果解读</strong>：每次调用 <code>createCounter()</code>{" "}
        都创建一个全新的作用域，<code>counter1</code> 和 <code>counter2</code> 各自闭包引用各自的{" "}
        <code>count</code>——调用多少次互不串账。
      </Paragraph>

      <Heading level={2} title="模式三：防抖与节流" />
      <Heading level={3} title="防抖：最后一次触发后延迟执行" />
      <CodeBlock
        code={`function debounce(func, delay) {
  var timer = null; // 闭包记住定时器 id
  return function (...args) {
    clearTimeout(timer); // 每次触发都重置倒计时
    var context = this;
    timer = setTimeout(function () {
      func.apply(context, args);
    }, delay);
  };
}

// input.addEventListener('input', debounce(function (e) {
//   console.log('搜索:', e.target.value);
// }, 500));`}
      />
      <Paragraph>
        典型场景：搜索框输入。用户停止输入 500ms 后才发请求。<code>timer</code>{" "}
        必须活在闭包里——如果放在返回函数内部，每次触发都是新变量，clearTimeout 就没意义了。
      </Paragraph>

      <Heading level={3} title="节流：固定时间间隔最多执行一次" />
      <CodeBlock
        code={`function throttle(func, delay) {
  var lastTime = 0; // 闭包记住上次执行时间
  return function (...args) {
    var now = Date.now();
    if (now - lastTime >= delay) {
      func.apply(this, args);
      lastTime = now;
    }
  };
}

// window.addEventListener('scroll', throttle(function () {
//   console.log('scrollY:', window.scrollY);
// }, 200));`}
      />
      <Paragraph>
        典型场景：滚动监听。无论滚多快，200ms 内最多处理一次。<code>lastTime</code>{" "}
        同样依赖闭包在多次调用间保持。
      </Paragraph>

      <Heading level={3} title="一句话区分" />
      <Paragraph>
        防抖是「等你停下来再做」（电梯关门，有人进来就重等）；节流是「再急也按固定节奏做」（红绿灯放行）。
      </Paragraph>

      <Heading level={2} title="模块模式：闭包的组织化用法" />
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
        IIFE 创建独立作用域，返回对象的方法闭包引用私有成员——这是 ES Module
        普及之前主流的模块化方案。现代代码里它的角色已被 import/export 和 <code>#私有字段</code>{" "}
        取代，但理解它是读懂大量存量库源码的前提。
      </Paragraph>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "防抖和节流分别用在哪？给两个具体例子。",
            a: "防抖：搜索框输入联想、窗口 resize 重算布局——只在停止操作后执行一次。节流：滚动加载、鼠标移动跟随、按钮防连点——保证固定频率持续响应。",
          },
          {
            q: "多个组件共享一个防抖函数实例会怎样？",
            a: "会互相清掉对方的定时器。timer 在同一个闭包里，A 触发会取消 B 的等待。需要每个调用方独立防抖时，各创建一个实例。",
          },
          {
            q: "柯里化也是闭包吗？",
            a: "是。curry 返回的函数记住已收集的参数（args），每层调用把新参数 concat 进闭包数组，攒够了才调用原函数——参数的持久化正是靠闭包。",
          },
          {
            q: "闭包捕获的是变量还是值？防抖里的 timer 说明了什么？",
            a: "捕获的是变量绑定（引用）而非值的拷贝。timer 能被后续触发覆盖重写，恰恰证明闭包读写的是同一个变量。",
          },
        ]}
      />
    </NoteShell>
  );
}
