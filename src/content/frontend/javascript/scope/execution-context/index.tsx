import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        执行上下文是<strong>代码执行前的环境准备</strong>：绑定 this、建立词法环境。
        全局上下文只有一个；函数每次调用都新建一个，压入调用栈，执行完弹出。
        「变量提升」只是创建阶段先登记声明的表现——<code>var</code> 提升且初始化为 undefined，{" "}
        <code>let/const</code> 提升但不初始化（暂时性死区）。
      </Conclusion>

      <Heading level={2} title="技术对照：调试器里的 Call Stack 面板" />
      <Paragraph>
        执行上下文栈就是<strong>调试器里的 Call Stack 面板</strong>，永远只执行栈顶那一帧：
      </Paragraph>
      <Paragraph>
        程序启动时压入一个常驻的栈底帧（全局上下文）；每调用一个函数，就把新帧
        <strong>压</strong>到栈顶；函数返回帧弹出，露出下面的帧继续执行。
        栈叠得越深（递归越深），离上限越近——压爆了就是栈溢出（stack overflow）。 在 Chrome DevTools
        的 Sources 面板里打断点，右侧那个 Call Stack 列表就是它的实时快照。
      </Paragraph>

      <Heading level={2} title="执行上下文的类型" />
      <Paragraph>
        <strong>全局上下文</strong>：程序启动时创建，唯一一个，浏览器中 <code>this</code> 指向{" "}
        <code>window</code>。<strong>函数上下文</strong>：每次调用创建一个，数量不限。 （
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

// 真实输出：
// Inside first function
// Inside second function
// Again inside first function
// Inside global execution context`}
      />
      <Paragraph>
        <strong>栈的变化</strong>：<code>[global]</code> → <code>[global, first]</code> →{" "}
        <code>[global, first, second]</code> → <code>[global, first]</code> → <code>[global]</code>
        。注意 first 的后半段要等 second 弹栈后才能继续——这就是"栈顶优先"。
      </Paragraph>

      <Heading level={2} title="上下文的三个阶段" />
      <Heading level={3} title="创建阶段" />
      <Paragraph>
        做三件事：绑定 <code>this</code>；创建词法环境（环境记录器存变量/函数声明 +{" "}
        外部环境引用指向父级作用域）；创建变量环境（专门存 <code>var</code> 声明）。
        <code>let/const</code> 存在词法环境里——这个存放位置差异就是提升行为差异的根源。
      </Paragraph>

      <Heading level={3} title="执行阶段" />
      <Paragraph>逐行执行代码，完成变量赋值与函数调用。</Paragraph>

      <Heading level={3} title="回收阶段" />
      <Paragraph>
        上下文出栈，等待 GC。但注意：如果有闭包引用着上下文里的变量，这些变量不会被回收
        （详见「内存管理」知识面）。
      </Paragraph>

      <Heading level={2} title="动手验证：变量提升的各种姿势" />
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
      <Paragraph>
        <strong>运行结果解读</strong>：三段代码表现完全不同，因为创建阶段的处理不同——
        <code>var</code> 声明提前并初始化为 <code>undefined</code>； 函数声明
        <strong>整体</strong>提升（声明 + 赋值一步到位）；
        <code>let/const</code> 只提升声明<strong>不初始化</strong>，访问它会触发
        暂时性死区（TDZ）错误，而非 undefined。
      </Paragraph>

      <Heading level={2} title="函数声明 vs 函数表达式" />
      <CodeBlock
        code={`// 声明式：整体提升
foo(); // 'I am a function declaration'
function foo() {
  console.log('I am a function declaration');
}

// 表达式：只有 var bar 提升为 undefined
bar(); // TypeError: bar is not a function
var bar = function () {
  console.log('I am a function expression');
};`}
      />
      <Paragraph>
        <strong>运行结果解读</strong>：<code>var bar</code> 提升后是 <code>undefined</code>， 调用{" "}
        <code>undefined()</code> 自然抛 TypeError——注意这与 let 的 TDZ
        错误信息完全不同，面试时能区分这两种报错是加分项。
      </Paragraph>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "函数声明和变量声明同名，谁赢？",
            a: "函数声明优先。var foo 与 function foo(){} 同名时，提升后 foo 是函数；随后执行阶段的赋值语句 foo = 'variable' 会把它覆盖成字符串。",
          },
          {
            q: "暂时性死区的范围怎么算？",
            a: "从块级作用域开始到 let/const 声明语句执行完毕。在这区间内访问该变量一律抛 ReferenceError，即使外层有同名变量也不会'穿透'查找。",
          },
          {
            q: "递归会不会栈溢出？怎么规避？",
            a: "深递归会（约万层级别，各引擎不同）。规避：改写循环、尾递归优化（仅部分引擎支持，V8 需要严格模式且未全面启用）、或用 trampoline 手动展平。",
          },
          {
            q: "提升是'代码被移动'了吗？",
            a: "不是。代码物理位置不变，是引擎在创建阶段先扫描登记了所有声明。理解这一点就明白为什么提升只在同一作用域内发生、不会跨块。",
          },
        ]}
      />
    </NoteShell>
  );
}
