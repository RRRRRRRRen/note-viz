import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock } from "@/components/demo";
import { DoDont, MemoryCard, OutputTimeline, Prerequisite, CrossRef } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        隐式转换不用背清单，记<strong>方向</strong>就够：<code>+</code>
        只要有一方是字符串就走<strong>拼接</strong>，<code>==</code> 偏好把双方转成
        <strong>数字</strong>（ToNumber），<code>!</code> 一律走 <strong>ToBoolean</strong>
        （对象恒真）。对象参与运算前先过 <strong>ToPrimitive</strong>（valueOf → toString）。所以{" "}
        <code>'1' + 1</code> 是 '11'：'1' 是字符串，+ 选拼接，1 转成 '1'。面试输出题的富矿全在{" "}
        <code>==</code> 的多步转换链；工程里用 <code>===</code>{" "}
        规避。类型判断（三把尺子）与浮点精度已拆成独立篇。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: 'typeof null 为什么是"object"？',
            to: "/note/frontend/javascript/types/typeof-null",
          },
        ]}
      >
        先会「认」一个值的类型（三把尺子），再学值之间怎么「变」——转换只发生在运算符要求的位置。
      </Prerequisite>

      <Heading level={2} title="'1' + 1 是怎么变成 '11' 的：ToPrimitive" />
      <Paragraph>
        <code>+</code> 是唯一身兼两职的算术运算符：数字相加与字符串拼接。它的算法分三步（据 ECMA-262
        加法运算符的语义）：① 双方各自 ToPrimitive——对象依次尝试 <code>valueOf</code> →{" "}
        <code>toString</code>，原始值原样通过；② 转换后若<strong>任一方是字符串</strong>，另一方也
        ToString，走拼接；③ 否则双方 ToNumber 相加。<code>'1' + 1</code> 的完整推演：'1'
        已是原始值原样通过第①步；第②步发现字符串，把 1 转成 '1'；拼接得 '11'。而{" "}
        <code>'1' - 1</code> 是 0——减法没有拼接语义，'1' 被 ToNumber 成 1。
      </Paragraph>
      <Paragraph>
        ToPrimitive 是所有转换题的第一站，因为<strong>对象必须先变成原始值才有资格参与运算</strong>
        。普通对象走 valueOf（默认返回自身，等于没转）→ toString（'[object Object]'）；数组没有
        valueOf 价值，toString 等价于 <code>join(',')</code>——空数组得 <code>''</code>，[1,2] 得
        '1,2'。把这两条规则记牢，下面所有诡异表达式都是它们的排列组合。
      </Paragraph>
      <CodeBlock
        lang="javascript"
        code={`'1' + 1     // "11" —— + 看到字符串走拼接
'1' - 1     // 0 —— 减法只有数字语义，'1' 被 ToNumber
1 + '1'     // "11" —— 换个位置，规则不变
[] + {}     // "[object Object]" —— '' + '[object Object]'
[1, 2] + 1  // "1,21" —— 数组 ToPrimitive 得 "1,2"
// （Node 22.17 验证）`}
      />

      <Heading level={2} title="== 与 ! 的转换方向" />
      <Paragraph>
        <code>==</code> 的偏好是<strong>数字</strong>
        ：遇到布尔先把布尔转数字（false → 0）；对象与原始值比较时，对象过 ToPrimitive 再比。{" "}
        <code>!</code> 的偏好是<strong>布尔</strong>
        ：且对象到布尔没有任何转换发生——一律 true。高频输出题 <code>[] == ![]</code>
        把两条规则拧在了一起，先自己推一遍再看解读：
      </Paragraph>
      <CodeBlock
        lang="javascript"
        code={`console.log([] == ![]); // true
// （Node 22.17 验证）—— 空数组既「真」又「等于 false」，不矛盾`}
      />
      <OutputTimeline
        label="输出解读 / [] == ![]"
        steps={[
          {
            output: "![] → false",
            phase: "同步",
            why: "右边的 ! 先算：空数组是对象，ToBoolean 永远为 true，取反得到 false。任何对象 ! 一下都是 false。",
          },
          {
            output: "[] == false",
            phase: "同步",
            why: "原式变成空数组与布尔比较。== 遇到布尔值，先把布尔转数字：false → 0。",
          },
          {
            output: "[] == 0",
            phase: "同步",
            why: "左边是对象、右边是数字，触发 ToPrimitive([])：调用 join() 得到空字符串 ''。",
          },
          {
            output: "'' == 0 → true",
            phase: "同步",
            why: "字符串与数字比较走 ToNumber，'' → 0。0 == 0，最终输出 true。",
          },
        ]}
      />
      <MemoryCard keyword="转换方向口诀">
        <code>==</code> 偏好 <strong>数字</strong>（ToNumber），<code>+</code> 偏好{" "}
        <strong>字符串</strong>（有一方是 string 就拼接），<code>!</code> 一律走{" "}
        <strong>ToBoolean</strong>（对象恒为 true）。 对象参与运算先过 ToPrimitive（valueOf →
        toString）。
      </MemoryCard>

      <Heading level={2} title="边界与陷阱" />
      <Paragraph>
        三类高频事故，共同点是「结果无法从写法直接推导」——这正是 <code>==</code>{" "}
        在工程规范里被禁用的原因：它的每一步转换都合规，但组合起来的行为不成体系。
      </Paragraph>
      <DoDont
        label="== 混用比较 / loose equality"
        dont={{
          code: `// 三行看起来该一致，实际：
''  == 0    // true
'0' == 0    // true
''  == '0'  // false！
// == 的结果不满足传递性`,
          note: "与数字比走 ToNumber，字符串互比走字面值——同一组值三种结论",
        }}
        do={{
          code: `Number('0') === 0  // true，显式转换
'' === '0'         // false，与上一行自洽
// 语义可推导，不需要背规范`,
          note: "=== 把「转换」从隐式变显式，比较结果随时能心算验证",
        }}
      />
      <DoDont
        label="语句位的花括号 / statement position"
        dont={{
          code: `// 在控制台/语句开头直接写：
{} + []
// 0 —— {} 被解析成「空代码块」，
// 剩下的是一元正号：+[] → +'' → 0`,
          note: "同一串字符，语句位与表达式位是两棵语法树——解析层陷阱",
        }}
        do={{
          code: `({} + [])  // "[object Object]"
[] + {}    // "[object Object]"
// 需要当值用就包括号，
// 或永远别让 {} 出现在行首`,
          note: "表达式位里两者一致：都走 ToPrimitive 拼接",
        }}
      />
      <DoDont
        label="对象判真 / truthy trap"
        dont={{
          code: `if (arr) { }   // 空数组也恒真
if (obj) { }   // {} 同样恒真
// 想判「空」的对象写法永远不生效`,
          note: "ToBoolean 对对象不做任何转换，一律 true——没有「空对象为假」这回事",
        }}
        do={{
          code: `if (arr.length > 0) { }
if (Object.keys(obj).length > 0) { }
// 「空不空」问属性，别问对象本身`,
          note: "唯一例外是 null/undefined/0/''/NaN 这些原始值——它们是 falsy",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        intro="从热身到硬核：每一问都建立在前一答之上。先自己想，再点开参考答案对照。"
        items={[
          {
            q: "'1' + 1 和 '1' - 1 的结果分别是什么？为什么不同？",
            intent:
              "热身题，考 + 的拼接偏好这条「方向」的第一反应——背清单的人答得慢，记方向的人脱口而出。",
            depth: 2,
            a: "'1' + 1 是 \"11\"：+ 发现任一方是字符串就走拼接，数字 1 被 ToString 成 '1'。'1' - 1 是 0：减法只有数字语义，'1' 被 ToNumber 成 1。+ 是唯一有双重语义的算术运算符，这正是隐式转换事故的集中地。",
            bonus:
              "规范层面的顺序：先双方 ToPrimitive、再查字符串、最后才 ToNumber——「先转换成原始值、再决定拼接还是相加」，不是直接判断原始类型。",
          },
          {
            q: "[] + {} 和 {} + [] 的结果分别是什么？为什么不一样？",
            intent:
              "考 ToPrimitive 的方向性与语句解析的边界——能讲清第二条的人凤毛麟角，直接拉开层次。",
            depth: 3,
            a: "[] + {} 得 '[object Object]'：双方都是对象，+ 偏好字符串拼接，空数组 ToPrimitive 得 ''，空对象得 '[object Object]'，拼接结果就是后者。{} + [] 在表达式语境同样得 '[object Object]'，但在控制台/语句开头，{} 会被解析成空代码块而不是对象字面量，剩下的 + [] 是一元正号转换，[] → '' → 0，所以结果是数字 0。",
            bonus:
              "验证方式：把表达式放进括号 ({} + []) 或赋值给变量后求值，都会回到 '[object Object]'——「语句位陷阱」可以用括号消除。",
          },
          {
            q: "Object.is 和 === 的区别在哪？什么场景必须用它？",
            intent:
              "考边界值语义——NaN 与 -0 两个特殊值的态度，正是三个等号体系（== / === / Object.is）的分层依据。",
            depth: 3,
            a: "Object.is 与 === 几乎一致，只修正两处：NaN 与 NaN 相等（=== 为 false，因为规范规定 NaN 不等于任何值包括自身）；+0 与 -0 不相等（=== 视为相等）。必须用 Object.is 的场景：NaN 判等（如缓存 key 比较、状态变更检测），React 里 Object.is 正是 state 更新判断的依据——setState 传入 NaN 时靠它跳过无效渲染。",
            bonus:
              "== / === / Object.is 的递进关系：== 做隐式转换后比较，=== 不转换直接比（同类型），Object.is 在 === 基础上修正 NaN 与 ±0 两个边界。",
          },
          {
            q: "对象转原始值的 ToPrimitive 有 hint 吗？Date 为什么行为特殊？",
            intent:
              "考 hint 三档与 @@toPrimitive 的覆盖关系——说出 Date 的特殊性而不说 hint，是背现象不是懂机制。",
            depth: 4,
            a: '有三档 hint："number"（==、-、*、关系运算）、"string"（模板字符串、String()、属性键）、"default"（+ 与 ==）。普通对象在 default 下 valueOf 优先；Date 通过 @@toPrimitive 把 default 与 string 都导向 toString——所以 new Date() + 1 是字符串拼接而 new Date() - 1 是数字减法（实测），普通对象两个都是数字运算路径。这是「对象可以声明自己的转换偏好」的规范入口。',
            bonus:
              "Symbol.toPrimitive 的优先级高于 valueOf/toString，且返回值必须是原始值——返回对象直接抛 TypeError: Cannot convert object to primitive value（实测）。",
          },
          {
            q: "为什么 if([]) 为真、[] == false 也为真？两句话矛盾吗？",
            intent:
              "压轴题，考「转换只发生在运算符要求的位置」——把 ToBoolean 与 == 的算法混为一谈就答不出这题。",
            depth: 5,
            a: "不矛盾，两条路径用的是不同算法：if 的 ToBoolean 对任何对象一律返回 true——对象到布尔之间没有任何转换发生；而 == 的算法要求双方转数字：![] 先得 false，false 再 ToNumber 成 0，[] 过 ToPrimitive 得 ''，'' ToNumber 成 0，0 == 0。同一份值在不同运算符语境下走不同转换链——转换不是值的固有属性，而是运算符的要求。",
            bonus:
              "这个模型还解释了 Boolean([]) === true 与 [] == false 为什么能共存：Boolean() 走 ToBoolean（不转换对象），== 走 ToPrimitive + ToNumber——JS 里唯一让「对象转原始值再转数字」的常规入口就是 == 和关系运算符。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: 'typeof null 为什么是"object"？',
            to: "/note/frontend/javascript/types/typeof-null",
            description:
              "转换之外另一半基本功：typeof/instanceof/toString.call 三把尺子的原理与边界。",
          },
          {
            title: "0.1 + 0.2 为什么不等于 0.3？",
            to: "/note/frontend/javascript/types/float-precision",
            description: "ToNumber 的目的地是 IEEE 754——浮点表示误差与金额处理的工程对策。",
          },
          {
            title: "为什么改了副本，原对象也跟着变：深浅拷贝",
            to: "/note/frontend/javascript/types/deep-clone",
            description: "原始值与引用值的分界在拷贝问题上的完整展开。",
          },
        ]}
      />
    </NoteShell>
  );
}
