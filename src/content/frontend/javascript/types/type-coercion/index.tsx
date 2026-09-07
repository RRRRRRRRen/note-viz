import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CompareTable, DoDont, MemoryCard, OutputTimeline } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        类型判断三把尺子：<code>typeof</code> 判原始值（<code>typeof null === "object"</code>{" "}
        是第一版实现的历史 bug）、<code>instanceof</code> 沿原型链判对象（跨 iframe/realm 失效）、
        <code>Object.prototype.toString.call</code> 读内部标签穿透一切。隐式转换记方向：
        <code>==</code> 偏好 <strong>ToNumber</strong>，<code>+</code> 偏好{" "}
        <strong>字符串拼接</strong>，<code>!</code> 一律 <strong>ToBoolean</strong>
        （对象恒真）。0.1 + 0.2 !== 0.3 的根因是 IEEE 754 双精度的二进制舍入，不是「JS 的 bug」。
      </Conclusion>

      <Heading level={2} title="类型判断的三把尺子" />
      <Paragraph>
        JS 有七种原始类型（string、number、boolean、undefined、symbol、bigint、null）加 object。
        <code>typeof</code> 对原始值够用，但有两个坑：<code>typeof null</code> 返回
        "object"（追问链第 1 问展开），以及函数返回 "function" 而其他引用类型一律
        "object"——它分不清数组和普通对象。<code>instanceof</code> 沿原型链查找构造函数的{" "}
        <code>prototype</code>，能区分对象子类型，但有两个盲区：原始值直接返回
        false（它们没有原型链），以及<strong>跨 iframe/realm 失效</strong>——两个全局环境各有一套{" "}
        <code>Array</code> 构造器。
      </Paragraph>
      <Paragraph>
        最可靠的通用判断是 <code>Object.prototype.toString.call(x)</code>
        ，它读取对象内部的 <code>Symbol.toStringTag</code> 标签，返回规格化的 '[object Array]'
        之类字符串——不受原型链篡改与 realm 影响。工程实践的组合拳：判数组用{" "}
        <code>Array.isArray</code>（内部直接读 IsArray 槽，最快最准），判其他内建类型用{" "}
        <code>toString.call</code>，判自定义类才用 instanceof。
      </Paragraph>

      <DoDont
        label="判断数组 / array check"
        dont={{
          code: `// 跨 iframe 传过来的数组
iframeWin.arr instanceof Array  // false！
// realm 不同，构造函数不是同一个`,
          note: "instanceof 依赖构造函数引用，跨 realm（iframe/worker）失效",
        }}
        do={{
          code: `Array.isArray(iframeWin.arr)      // true
Object.prototype.toString.call(iframeWin.arr)
// '[object Array]'`,
          note: "Array.isArray 内部走规格化的品牌检查，与 realm 无关",
        }}
      />

      <Heading level={2} title="隐式转换的方向" />
      <Paragraph>
        隐式转换之所以难背，是因为没抓住「方向」这一层：<code>==</code> 比较时偏好把双方转成
        <strong>数字</strong>（ToNumber），<code>+</code> 运算时只要有一方是字符串就走
        <strong>拼接</strong>（ToString），<code>!</code> 一律转<strong>布尔</strong>（对象恒为
        true）。对象参与运算前先过 ToPrimitive （依次尝试 valueOf →
        toString）——对象到原始值的这一步，是所有转换题的第一站。
      </Paragraph>

      <Paragraph>
        高频输出题 <code>[] == ![]</code>：左右两边都涉及对象转换，逐步拆开就不神秘——
      </Paragraph>

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
      <MemoryCard keyword="转换方向口诀" color="#f59e0b">
        <code>==</code> 偏好 <strong>数字</strong>（ToNumber），
        <code>+</code> 偏好 <strong>字符串</strong>（有一方是 string 就拼接），
        <code>!</code> 一律走 <strong>ToBoolean</strong>（对象恒为 true）。 对象参与运算先过
        ToPrimitive（valueOf → toString）。
      </MemoryCard>

      <Heading level={2} title="原始值与引用值：一切拷贝问题的源头" />
      <Paragraph>
        类型系统里最影响工程判断的一条分界线：原始值按<strong>值</strong>
        存储，赋值即完整拷贝；引用值按
        <strong>指针</strong>
        存储，赋值只复制指针——两个变量指向同一块内存。这条分界解释了三件事：为什么 const
        对象的属性还能改（const
        锁的是指针）、为什么函数传对象进去被改外部可见（传的是指针副本）、以及为什么会有「深拷贝」这个命题。
      </Paragraph>
      <Paragraph>
        另一个常被忽略的现象：原始值明明没有方法，<code>"abc".length</code>{" "}
        却能用——引擎在访问时临时创建<strong>包装对象</strong>
        ，用完即弃。这也意味着给原始值挂属性是静默无效的（{" "}
        <code>const s = "x"; s.foo = 1; s.foo // undefined</code>
        ）：属性挂在了那个转瞬即逝的包装对象上。原始值与引用值的完整行为对照：
      </Paragraph>

      <CompareTable
        label="值语义 / value vs reference"
        left={{
          title: "原始值",
          color: "#8b5cf6",
          points: [
            "赋值/传参 = 完整拷贝，互不影响",
            "== 与 === 行为一致（同类型比字面值）",
            "属性不可变，挂属性静默丢失（包装对象）",
            "typeof 足以判断（null 除外）",
          ],
        }}
        right={{
          title: "引用值",
          color: "#1677ff",
          points: [
            "赋值/传参 = 复制指针，共享同一块内存",
            "== 比较指针地址，需注意 [] == ![] 这类转换",
            "属性可变，const 也锁不住内容变化",
            "深拷贝命题因此而生（见深浅拷贝篇）",
          ],
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "typeof null 为什么是 'object'？后来为什么不修？",
            intent:
              "热身题，筛背口诀的人——答得出类型标签实现，说明你了解语言的历史包袱而非只会背结论。",
            depth: 2,
            a: "JS 第一版实现里，值的机器低位用类型标签区分：000 表示对象。而 null 是全零的空指针，标签恰好也是 000，于是 typeof 把它识别成了 object。这个行为在第一版定型后无法修复——修改会破坏海量存量网站的兼容性，相关提案多次被 TC39 否决。",
            bonus:
              "同源的历史怪癖：typeof 对未声明变量返回 'undefined' 而不报错，这让 typeof 成了唯一安全的存在性检查手段。",
          },
          {
            q: "[] + {} 和 {} + [] 的结果分别是什么？为什么不一样？",
            intent:
              "考 ToPrimitive 的方向性与语句解析的边界——能讲清第二条的人凤毛麟角，直接拉开层次。",
            depth: 3,
            a: "[] + {} 得 '[object Object]'：双方都是对象，+ 偏好字符串拼接，空数组 ToPrimitive 得 ''，空对象得 '[object Object]'，拼接结果就是后者。{} + [] 在表达式语境同样得 '[object Object]'，但在控制台/语句开头，{} 会被解析成空代码块而不是对象字面量，剩下的 + [] 是一元正号转换，[] → '' → 0，所以结果是数字 0。",
            bonus:
              "规范层面：+ 运算符的 ToPrimitive 不传 hint（default），Date 走 toString、其他对象走 valueOf 优先——这也是 Date 参与加法行为特殊的原因。",
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
            q: "0.1 + 0.2 !== 0.3 的根因是什么？生产里怎么比较浮点数？",
            intent:
              "考 IEEE 754 的理解深度——答出「精度丢失」四个字只是入门，能讲二进制表示才是引擎级回答。",
            depth: 4,
            a: "JS 的 number 是 IEEE 754 双精度浮点（64 位：1 符号 + 11 指数 + 52 尾数）。0.1 和 0.2 的二进制都是无限循环小数，存储时被舍入，两个近似值相加得到 0.30000000000000004，与字面量 0.3 的表示不同，于是 !== 成立。生产比较用 Math.abs(a - b) < Number.EPSILON，金额场景干脆用「分」为单位的整数或 BigInt。",
            bonus:
              "Number.MAX_SAFE_INTEGER = 2^53 − 1 正是尾数 52 位加隐含位的边界，超过它整数也不可靠——JSON 大 id（如雪花算法）传到前端会静默失真，惯用字符串传输。",
          },
          {
            q: "为什么 Object.prototype.toString.call 比 instanceof 更可靠？它读的是什么？",
            intent:
              "考类型判断的底层机制——Symbol.toStringTag 与 realm 问题，答出这两点说明真读过规范。",
            depth: 4,
            a: "instanceof 沿原型链找构造函数的 prototype 引用，跨 realm（iframe/worker）时两个环境各有一套 Array 构造器，判断失效；原型也可能被业务代码改写。Object.prototype.toString 读的是对象内部槽 Symbol.toStringTag，返回规格化的 '[object Array]' 之类字符串，既不受 realm 影响也不易被篡改（Symbol 属性无法被常规代码覆盖语义）。",
            bonus:
              "Array.isArray 是更专用的品牌检查：直接读内部槽 IsArray，比 toString 更快也更明确——判断数组用它，判断其他内建类型才用 toString.call。",
          },
        ]}
      />

      <Heading level={2} title="写在最后" />
      <Paragraph>
        值与引用的分界是「深浅拷贝」命题的源头，完整展开见站内「深浅拷贝」篇；包装对象的临时机制与原型链的关系，见「原型链」与「继承演进」篇。类型判断的面试价值不在背结论，而在你能对着一段诡异表达式说出引擎的每一步。
      </Paragraph>
    </NoteShell>
  );
}
