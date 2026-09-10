import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock } from "@/components/demo";
import { Callout, DoDont, MemoryCard, SpecQuote, Table, CrossRef } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        <code>typeof null === "object"</code> 是第一版实现的历史产物：JS 值用「类型标签 +
        数据」表示，对象的标签是 000，而 null 是全零的空指针、标签恰好也是
        000——被顺理成章识别成了对象。 这个行为<strong>因 web 兼容性无法修改</strong>：typeof
        的返回值被海量存量代码依赖，修复提案曾被提出又因破坏兼容被否决。工程结论三句话：判 null 用{" "}
        <code>x === null</code>，判数组用 <code>Array.isArray</code>
        （读内部槽，跨 realm、防伪造），判内建子类型用 <code>Object.prototype.toString.call</code>。
      </Conclusion>

      <Heading level={2} title="第一把尺子：typeof——按类型标签快判" />
      <Paragraph>
        typeof 的机制不在「语法」层，而在值的<strong>内存表示</strong>
        层。第一版 JS 引擎里，一个值由「类型标签 +
        数据」两部分组成，引擎读一下低位标签就能回答「你是什么」。这套设计决定了 typeof
        的两个性格：极快（一次标签读取），但粗糙（标签的粒度只有引擎当初定下的那几档）。它能返回的值是穷尽的——
        七种原始类型的名字、加上 "object" 与 "function"。
      </Paragraph>
      <Paragraph>
        返回值列表里唯一的例外是函数：数组、日期、正则统统返回 "object"，唯独函数有专属的
        "function"。原因是函数有内部方法 <code>[[Call]]</code>（可调用），typeof
        对「可调用对象」做了特判——这是按<strong>能力</strong>而不是按<strong>标签</strong>
        分类的唯一返回值。代价是：typeof 分不清数组与普通对象，而 null 的历史 bug
        也出自同一套标签系统。
      </Paragraph>
      <CodeBlock
        lang="javascript"
        code={`typeof null            // "object" —— 历史 bug，永不修复
typeof []              // "object" —— 数组和普通对象在这里没有区别
typeof function () {}  // "function" —— 唯一按「能力」分类的返回值
typeof undeclaredVar   // "undefined" —— 未声明变量不抛错
// （Node 22.17 验证；typeof 是唯一安全的存在性检查，
//   但 let/const 的暂时性死区内照样抛 ReferenceError）`}
      />
      <SpecQuote source="MDN · typeof">
        In the first implementation of JavaScript, JavaScript values were represented as a type tag
        and a value. The type tag for objects was 0. null was represented as the NULL pointer (0x00
        in most platforms). Consequently, null had 0 as type tag, hence the typeof return value
        "object".
      </SpecQuote>

      <Heading level={2} title="typeof null：改不动的历史快照" />
      <Paragraph>
        把标签系统展开看：对象的标签是 <code>000</code>，整数 1、双精度浮点 010、字符串 100、布尔
        110。 而 null 在引擎里的表示是<strong>全零的空指针</strong>——与大多数平台的
        NULL（0x00）一致。低位标签恰好也是 000，typeof
        便按「对象」汇报。这不是逻辑错误，是当初的设计里 null
        压根没打算有独立标签：一个「什么都不指」的占位值，撞上了「对象」的编码。
      </Paragraph>
      <Paragraph>
        为什么明知是 bug 也不修？因为 <strong>web 兼容性的约束是单向阀</strong>
        ：typeof 是使用频率最高的运算符之一，返回值列表早已被海量存量代码硬编码依赖——无数老页面用{" "}
        <code>typeof x === "object"</code> 做分支判断，任何返回值变化都会让它们行为改变。让{" "}
        <code>typeof null === "null"</code> 的修复提案曾被正式提出，最终因破坏存量网页被否决（据 MDN
        typeof 文档）。同一逻辑的活标本是 <code>document.all</code>：它不是 undefined，但{" "}
        <code>typeof document.all === "undefined"</code>——Web 标准把它明文归类为对规范的「willful
        violation（故意违约）」，同样为了兼容老页面。
      </Paragraph>
      <Callout kind="tip" title="记忆口诀">
        标签 000 是对象，null 全零撞个正着；想改？存量网页不答应。
      </Callout>
      <DoDont
        label="判空与判数组 / null & array check"
        dont={{
          code: `const isObj = (v) => typeof v === "object";
isObj(null)  // true —— null 中招
isObj([])    // true —— 数组也中招
// 一个判断拦不住两个坑`,
          note: "typeof 分不清数组/日期/正则，null 又恰好混进 object",
        }}
        do={{
          code: `if (x === null) { /* 判空用全等 */ }
if (Array.isArray(x)) { /* 判数组用专用检查 */ }
// typeof 只留给原始值`,
          note: "=== 判 null、Array.isArray 判数组，各司其职",
        }}
      />

      <Heading level={2} title="第二把尺子：instanceof——沿原型链找构造函数" />
      <Paragraph>
        instanceof 回答的是另一个问题：「这份数据<strong>从哪条生产线下来</strong>
        的？」算法是沿左侧值的原型链逐级向上取 <code>__proto__</code>，与右侧构造函数的{" "}
        <code>prototype</code> 属性做同一引用比较，命中即 true ，走到原型链尽头（null）仍无则
        false。两个直接推论：原始值没有原型链，<code>"abc" instanceof String</code> 返回
        false（实测）；它判断的是「引用关系」而非「数据形态」。
      </Paragraph>
      <Paragraph>
        「信引用」带来了它的两个盲区。其一<strong>跨 realm 失效</strong>
        ：每个全局环境（iframe、Web Worker、Node 的 vm 沙箱）各有一套内建构造器，两个 realm 的{" "}
        <code>Array</code> 是两个不同的函数对象——A realm 的数组到了 B realm，原型链上找不到 B 的
        Array.prototype， 判断返回 false（下方实测）。其二<strong>原型可被篡改</strong>：{" "}
        <code>Object.setPrototypeOf</code> 可以改变任何对象的原型链，判断结果随之漂移；函数还能通过{" "}
        <code>Symbol.hasInstance</code> 完全自定义 instanceof 的行为——它既是灵活性，也是不可靠性。
      </Paragraph>
      <CodeBlock
        lang="javascript"
        code={`const vm = require("node:vm");
// 在另一个 realm（独立全局环境）里创建的数组
const arr = vm.runInNewContext("[1, 2, 3]");

arr instanceof Array  // false！构造函数是另一个 realm 的
Array.isArray(arr)    // true —— 读内部槽，与 realm 无关
// （Node 22.17 验证；浏览器里 iframe 场景同理）`}
      />
      <DoDont
        label="跨 realm 判断 / cross-realm"
        dont={{
          code: `// iframe 传过来的数组
iframeWin.arr instanceof Array  // false！
// 两个 realm 各有一套 Array 构造函数`,
          note: "instanceof 依赖构造函数引用，跨 realm（iframe/worker）必然失效",
        }}
        do={{
          code: `Array.isArray(iframeWin.arr)  // true
Object.prototype.toString.call(iframeWin.arr)
// '[object Array]'`,
          note: "两者读的都是内部数据而非构造函数引用，与 realm 无关",
        }}
      />

      <Heading level={2} title="第三把尺子：toString.call——读内部标签" />
      <Paragraph>
        最可靠的一把尺子绕开了「引用」与「标签」两套问题：
        <code>Object.prototype.toString.call(x)</code> 读取对象内部的规格化标签，返回{" "}
        <code>'[object Array]'</code>、<code>'[object Map]'</code> 这类字符串。标签的来源是内部槽{" "}
        <code>Symbol.toStringTag</code>
        ——内建对象由引擎按规范写入默认值，自定义对象也可以自己定义。它不依赖原型链（防篡改），也不依赖
        realm（防跨环境），是「穿透一切」的通用兜底。
      </Paragraph>
      <Paragraph>
        一个精妙的细节：<code>Object.prototype.toString.call(null)</code> 为什么不报错？null
        明明点不出任何属性。因为 <code>call</code> 只是把 null 绑定为函数的 this、不发生属性访问，而
        toString 的规范算法第一步就特判 Undefined 与 Null 两个类型，直接返回{" "}
        <code>'[object Undefined]'</code> / <code>'[object Null]'</code>
        （据 ECMA-262 该方法的算法描述）。但这把尺子也非绝对可靠：Symbol.toStringTag
        是普通属性，自定义一个返回 "Array" 的就能伪造出 <code>'[object Array]'</code>
        （实测可复现）。真正的最后防线是 <code>Array.isArray</code>——它读的是引擎内部槽 IsArray，
        由数组的创建路径写入，JS 代码没有任何办法改写内部槽，所以防得住一切伪造。
      </Paragraph>
      <Table
        label="选型决策 / which ruler"
        head={["判断目标", "用哪把尺子", "原因"]}
        rows={[
          [
            "判原始值 / 判 null",
            <>
              <code>typeof</code> / <code>===</code>
            </>,
            "typeof 对原始值可靠；null 是唯一例外，用全等",
          ],
          [
            "判数组",
            <>
              <code>Array.isArray</code>
            </>,
            "读内部 IsArray 槽：跨 realm 安全、无法伪造",
          ],
          [
            "判内建子类型（Map/Set/Date…）",
            <>
              <code>Object.prototype.toString.call</code>
            </>,
            "规格化内部标签，不受原型篡改与 realm 影响",
          ],
          [
            "判自定义类实例",
            <>
              <code>instanceof</code>
            </>,
            "本 realm 内的原型链检查，语义最直白",
          ],
        ]}
      />
      <MemoryCard keyword="类型判断决策">
        判 null 用 <code>===</code>；判数组用 <code>Array.isArray</code>
        ；判内建子类型用 <code>toString.call</code>；判自定义类才用 <code>instanceof</code>。
        三把尺子的分野：<strong>typeof 信标签、instanceof 信引用、toString.call 信数据</strong>。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        intro="从热身到硬核：每一问都建立在前一问的结论之上。先自己想，再展开参考答案对照。"
        items={[
          {
            q: "typeof null 为什么是 'object'？后来为什么不修？",
            intent:
              "热身题，筛只会背结论的人——能讲出类型标签实现与兼容性约束的，才是理解了语言的历史包袱。",
            depth: 2,
            a: "第一版实现里 JS 值由「类型标签 + 数据」表示，对象的标签是 000；而 null 的表示是全零空指针（NULL = 0x00），低位标签恰好也是 000，于是被识别成对象。这个行为自第一版定型后无法修改——typeof 的返回值被海量存量页面依赖，修改会破坏 web 兼容性，改成 'null' 的修复提案曾因兼容性问题被否决（据 MDN typeof 文档）。",
            bonus:
              "同源的兼容性故事还有 document.all：typeof document.all === 'undefined'，虽然它并不是 undefined——Web 标准明文承认这是「willful violation（故意违约）」。两个案例共同说明：JS 的类型怪癖几乎都是「历史表示 + 兼容性锁死」的产物。",
          },
          {
            q: "Object.prototype.toString.call(null) 为什么不报错？null 明明点不出任何属性。",
            intent:
              "考规范阅读量——「call 只借用函数」与「toString 的类型特判分支」两层都说出来才算完整。",
            depth: 3,
            a: "两层原因：其一，call 只是把 null 绑定为 toString 的 this，这个绑定动作本身不发生任何属性访问；其二，toString 的规范算法在开头就特判了 Type(arg) 为 Undefined 与 Null 的情形，直接返回 '[object Undefined]' / '[object Null]'——根本走不到读内部标签那一步（据 ECMA-262 该方法的算法描述）。",
            bonus:
              "对比记忆：Object.keys(null) 这类方法会先做 ToObject，null/undefined 直接抛 TypeError——「这个参数可能不是对象」的宽容只留给了少数像 toString 这样的底层方法。",
          },
          {
            q: "Symbol.toStringTag 能伪造 '[object Array]' 吗？Array.isArray 为什么防得住？",
            intent: "区分「看起来可靠」与「真的可靠」——考内部槽与普通属性的本质差异。",
            depth: 4,
            a: "toString.call 可以被伪造：给对象定义 Symbol.toStringTag 返回 'Array'，就能得到 '[object Array]'（实测可复现），因为它读的只是一个可自定义的普通属性。Array.isArray 防得住：它读的是引擎内部槽 IsArray，由数组的创建路径写入，JS 代码没有任何语法能改写内部槽。所以「判数组用 Array.isArray」是安全结论，toString.call 适合防误判而非防伪造。",
            bonus:
              "「引擎能看到的比 JS 层多」是贯穿性原理：structuredClone 判定哪些值可克隆、JSON.stringify 过滤非 JSON 类型，依据的都是内部数据形态而非可篡改的 JS 层属性。",
          },
          {
            q: "typeof 对未声明变量为什么返回 'undefined' 而不抛 ReferenceError？它在什么情况下失效？",
            intent:
              "考规范细节的两面——「唯一安全的存在性检查」为何成立，以及 let/const 时代它在哪失守。",
            depth: 3,
            a: "规范明文规定：typeof 的求值对「无法解析的引用」特殊处理，直接返回 'undefined' 而不抛错——这让它成为唯一安全的存在性检查手段（如探测某个全局特性是否存在）。但它防的是「不存在」而非「未初始化」：let/const 声明的暂时性死区内，typeof x 照样抛 ReferenceError（实测），因为绑定已经存在、只是尚未初始化。",
            bonus:
              "探测全局变量的现代替代写法：'fetch' in globalThis——用 in 操作符查属性，语义直白且不受死区干扰，也不依赖 typeof 的特殊豁免。",
          },
          {
            q: "instanceof 的原理是什么？手写一个要考虑哪些边界？",
            intent:
              "压轴题考原型链的真理解——只会背「沿原型链找」不够，边界处理与规范入口才是分水岭。",
            depth: 4,
            a: "原理：沿左侧值的原型链逐级取 __proto__（Object.getPrototypeOf），与右侧函数的 prototype 属性做同一引用比较，命中返回 true，走到 null 仍未命中返回 false。手写的三个边界：① 左侧是原始值直接返回 false（没有原型链，'abc' instanceof String 为 false 是实测行为）；② 右侧不是函数要抛 TypeError（'x' instanceof null → TypeError: Right-hand side of 'instanceof' is not an object，实测）；③ 规范里 instanceof 的第一步是询问右侧的 Symbol.hasInstance，函数的默认实现才是原型链遍历——完整模拟要从它开始。",
            bonus:
              "与三把尺子的主线呼应：instanceof 沿链查「引用」，所以跨 realm 失效；Array.isArray 与 toString.call 查「内部数据」，与 realm 无关——判断方式的选择本质是在回答「你信引用，还是信数据」。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "「1」+ 1 为什么等于「11」：隐式转换规则",
            to: "/note/frontend/javascript/types/type-coercion",
            description: "类型系统的另一半：值与值之间怎么互相转换，ToPrimitive 是怎么工作的。",
          },
          {
            title: "属性是怎么被继承的：原型链查找",
            to: "/note/frontend/javascript/prototype/prototype-chain",
            description: "instanceof 的判断依据——[[Prototype]] 与 prototype 的完整机制。",
          },
        ]}
      />
    </NoteShell>
  );
}
