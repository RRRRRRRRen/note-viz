import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock, PlayGround } from "@/components/demo";
import { DoDont, MemoryCard, OutputTimeline, Prerequisite, CrossRef } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        根因是 <strong>IEEE 754 双精度浮点</strong>：JS 的 number 用 64 位存数——1 符号 + 11 指数 +
        52 尾数，本质是「二进制版科学计数法」。0.1 的二进制是无限循环小数，52
        位尾数装不下必然舍入；两个近似值相加后再舍入一次，得到 0.30000000000000004，与字面量 0.3
        的表示不同——于是 <code>!==</code> 成立。这不是 JS 的 bug，Python/Java/C++ 同款。工程三招：
        <strong>比较用 Number.EPSILON 容差</strong>、<strong>金额用「分」单位整数</strong>、
        <strong>高精度计算交给 decimal 类库</strong>（BigInt 只管整数）。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "「1」+ 1 为什么等于「11」：隐式转换规则",
            to: "/note/frontend/javascript/types/type-coercion",
          },
        ]}
      >
        ToNumber 把字符串转成数字时走的就是本文这套浮点模型——转换与表示是同一类型系统的两半。
      </Prerequisite>

      <Heading level={2} title="64 位双精度：number 在内存里的形状" />
      <Paragraph>
        JS 只有一种数字类型，它的实体是 IEEE 754 的双精度格式：64 位切成三段——
        <strong>1 位符号</strong>、<strong>11 位指数</strong>、<strong>52 位尾数</strong>
        ，表示的值是 (−1)^s × 1.fraction ×
        2^(exponent−1023)，即二进制版的科学计数法：尾数管有效数字，指数管小数点位置。为什么选浮点而不是定点？同样的
        64 位，浮点既能表示 5e-324 也能表示 1e308——<strong>用均匀的精度换取巨大的动态范围</strong>
        ，这是科学计算选它的根本原因。
      </Paragraph>
      <Paragraph>
        52 位尾数有一个隐藏加成：规范化后首位恒为 1，不必存储，等于<strong>白捡 1 位</strong>
        ——有效精度是 53 个二进制位。这直接推出了 <code>Number.MAX_SAFE_INTEGER = 2^53 − 1</code>
        ：整数只有 53 个有效位可用，超过它就不再每个整数都有自己的表示——
        <code>9007199254740992 + 1 === 9007199254740992</code> 为
        true（实测）。整数尚且如此，小数的处境只会更糟。
      </Paragraph>

      <Heading level={2} title="为什么 0.1 无法精确表示" />
      <Paragraph>
        关键在「二进制分数」这个概念：小数点后第 n 位的权重是 2^-n，所以 0.5 = 0.1b、0.75 = 0.11b
        可以精确表示——它们的分母是 2 的幂。而 0.1 的分母是 10 = 2 × 5，多出因子
        5，写成二进制分数时分子分母约不干净， 只能是{" "}
        <strong>0.000110011001100…（0011 无限循环）</strong>。凡是分母含 2
        之外素因子的十进制小数（0.1、0.2、0.3、0.6 …）全是无限循环小数——它们注定被 52
        位尾数截断舍入。
      </Paragraph>
      <Paragraph>
        于是 <code>0.1 + 0.2</code> 的完整过程是三次近似：0.1 存为 0.1000000000000000055511…，0.2
        存为 0.2000000000000000111022…（各自舍入到 53
        位有效数字）；两者相加的精确结果又要舍入一次才能放回 52 位尾数——得到
        0.30000000000000004441。而字面量 0.3 自己的表示是
        0.29999999999999998890。两个不同的二进制值，<code>===</code>
        当然为 false。<strong>每一环都是 IEEE 754 的正确行为，误差是表示方式固有的</strong>。
      </Paragraph>
      <CodeBlock
        lang="javascript"
        code={`0.1 + 0.2                    // 0.30000000000000004
0.1 + 0.2 === 0.3            // false
(0.1).toPrecision(20)        // "0.10000000000000000555"
(0.2).toPrecision(20)        // "0.20000000000000001110"
(0.3).toPrecision(20)        // "0.29999999999999998890"
(0.1 + 0.2).toPrecision(20)  // "0.30000000000000004441"
(0.1).toString(2)
// "0.0001100110011001100110011001100110011001100110011001101"
// —— 0011 无限循环，在 52 位尾数处被舍入（Node 22.17 验证）`}
      />
      <OutputTimeline
        label="输出解读 / why each line"
        steps={[
          {
            output: "0.1 + 0.2 → 0.30000000000000004",
            phase: "同步",
            why: "两个已舍入的近似值相加，精确和恰好落在 0.3 的下一个可表示数上——再舍入也回不到 0.3 的表示。",
          },
          {
            output: "=== 0.3 → false",
            phase: "同步",
            why: "左边是 0.30000000000000004441，右边字面量 0.3 是 0.29999999999999998890——同一十进制数的两个不同二进制表示。",
          },
          {
            output: "toPrecision(20) → …555 / …1110",
            phase: "同步",
            why: "20 位十进制有效数字足以显形：存储值不是 0.1/0.2 本身，而是它们的 53 位二进制近似。",
          },
          {
            output: "toString(2) → 0.00011001100…1101",
            phase: "同步",
            why: "二进制下直接看到 0011 循环的截断痕迹——末位 1101 是向上舍入的结果，不是循环体自然结束。",
          },
        ]}
      />
      <PlayGround
        label="在线运行 / playground"
        height={240}
        code={`// 改改数字，看哪些小数是「幸运儿」
console.log(0.5, 0.25, 0.75);   // 分母是 2 的幂：精确
console.log(0.1, 0.2, 0.3, 0.6); // 分母含因子 5：全是近似

console.log(0.1 + 0.2);          // 0.30000000000000004
console.log(0.1 + 0.3 === 0.4);  // true —— 舍入误差恰好抵消
console.log(0.1 + 0.7);          // 0.7999999999999999
console.log((0.1).toString(2));  // 0011 无限循环的截断现场`}
      />

      <Heading level={2} title="工程对策：EPSILON、金额与 toFixed 陷阱" />
      <Paragraph>
        浮点不能比相等，但可以比<strong>距离</strong>。规范给的工具是{" "}
        <code>Number.EPSILON = 2^-52 ≈ 2.22e-16</code>——它是「1 与下一个可表示数之间的距离」，即 1
        附近的最小分辨率。浮点比较的正确姿势是 <code>Math.abs(a − b) &lt; Number.EPSILON</code>
        ：允许一个分辨率的误差。注意 EPSILON 是<strong>相对量</strong>：数量级远离 1
        时分辨率随之变化—— <code>1e10 + 0.1 === 1e10</code> 为 true（实测，0.1 在 1e10
        的尺度下低于分辨率），跨数量级比较应把容差按比例放宽。
      </Paragraph>
      <Paragraph>
        金额场景有一条铁律：<strong>不让小数参与运算</strong>。第一选择是「分」单位整数：19.9 元存
        1990 分，整数加减乘完全精确——直接乘 100 也有坑（<code>19.9 * 100</code> 实测
        1989.9999999999998），放大时用 <code>Math.round</code> 兜底。第二选择是 decimal
        类库（decimal.js/big.js）：内部用十进制数字串模拟竖式运算，0.1 就是精确的
        0.1，代价是性能与体积。顺带厘清 <code>toFixed</code>
        的陷阱：它舍入的是「已存储的二进制近似值」——1.005 实际存的是 1.0049999…，于是{" "}
        <code>(1.005).toFixed(2)</code> 得 "1.00"、<code>(6.35).toFixed(1)</code> 得 "6.3"（实测）——
        展示层凑合能用，算钱绝不可靠。
      </Paragraph>
      <List
        items={[
          <>
            浮点<strong>相等比较</strong>：Math.abs(a − b) &lt; Number.EPSILON（跨数量级放宽容差）
          </>,
          <>
            金额<strong>存储与运算</strong>：「分」单位整数；展示时再除回元
          </>,
          <>
            高精度<strong>十进制计算</strong>：decimal.js / big.js；整数溢出走 BigInt（注意 BigInt
            无 JSON 表示，需转字符串）
          </>,
        ]}
      />
      <DoDont
        label="金额运算 / money math"
        dont={{
          code: `// 浮点直接累加金额
let total = 0;
total += 0.1; total += 0.2; total += 0.3;
total // 0.6000000000000001
total === 0.6 // false`,
          note: "每一步都在放大表示误差，对账时必然对不上",
        }}
        do={{
          code: `// 「分」单位整数：0.1 元 = 10 分
let total = 10 + 20 + 30;
total // 60 分，精确
(total / 100).toFixed(2) // "0.60" 只用于展示`,
          note: "整数运算无误差；小数只在最后一刻为展示而出现",
        }}
      />
      <DoDont
        label="浮点比较 / float compare"
        dont={{
          code: `if (a === b) { /* 永远不可靠 */ }
(0.1 + 0.2) === 0.3  // false
1e10 + 0.1 === 1e10  // true，小数被吞掉`,
          note: "=== 对近似值非错即漏——两个方向都会出事",
        }}
        do={{
          code: `const eq = (x, y) =>
  Math.abs(x - y) <
  Number.EPSILON * Math.max(1, Math.abs(x), Math.abs(y));
eq(0.1 + 0.2, 0.3) // true`,
          note: "容差按数量级放大：EPSILON 是 1 附近的分辨率，不是全局常数",
        }}
      />
      <MemoryCard keyword="浮点三原则">
        <strong>比较用容差不用 ===</strong>（EPSILON 按数量级放宽）；
        <strong>金额用分单位整数</strong>
        （小数只在展示层出现）；<strong>toFixed 只管展示不管算账</strong>
        （它舍入的是二进制近似值）。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        intro="从舍入方向到类库原理：每一问都建立在前一问之上。先自己想，再展开对照。"
        items={[
          {
            q: "为什么 0.1 + 0.3 === 0.4 成立，0.1 + 0.2 === 0.3 却不成立？",
            intent:
              "考「误差方向」的理解——浮点误差不是随机分布，个别等式成立是舍入抵消的巧合而非精确。",
            depth: 2,
            a: "0.1 与 0.3 的近似值相加后，精确和恰好更靠近 0.4 的表示，舍入后返回 true——误差在相加时相互抵消了；而 0.1 与 0.2 的近似值相加，精确和恰好落在 0.3 的下一个可表示数（0.30000000000000004）上，怎么舍都回不去。所以 0.1 + 0.3 === 0.4 是巧合，不能推广——0.1 + 0.7 就是 0.7999999999999999（实测）。",
            bonus:
              "精确可表示的十进制小数只有 m/2^n 形式（0.5、0.25、0.75、0.8125…）；其余全靠近似——「哪些等式恰好成立」取决于舍入方向，没有任何规律可依赖。",
          },
          {
            q: "Number.EPSILON 是「最小精度」吗？所有浮点比较都能用它吗？",
            intent:
              "考 EPSILON 的准确语义——「1 附近的分辨率」与「全局常数」的混淆是这道题的筛选点。",
            depth: 3,
            a: "不是全局最小精度。Number.EPSILON = 2^-52，定义是「1 与下一个可表示数之间的距离」；浮点的分辨率随数量级缩放（2 附近是 2^-51，越大越粗）。所以它只在 1 附近量级做容差才准；1e10 尺度下 0.1 低于分辨率、加不上去（1e10 + 0.1 === 1e10 为 true，实测）——跨数量级比较应把容差写成 EPSILON × max(1, |a|, |b|) 这类按比例放大的形式。",
            bonus:
              "别和 Number.MIN_VALUE 混淆：那是最小正的规格化数（约 5e-324），管的是「能表示多小的数」；EPSILON 管的是「1 附近能分辨多细的差」——一个管下溢边界，一个管分辨率。",
          },
          {
            q: "(1.005).toFixed(2) 返回什么？为什么？正确的金额四舍五入怎么做？",
            intent: "toFixed 陷阱的高频翻车现场——考「舍入发生在什么表示上」这个根因。",
            depth: 3,
            a: '返回 "1.00"，不是 "1.01"。因为 1.005 无法精确表示，实际存储的是 1.00499999999999989…，toFixed 是对存储值做舍入，天然带着这个向下偏差（(6.35).toFixed(1) 同理得 "6.3"，实测）。正确做法：金额先转「分」单位整数再按整数规则舍入（如 Math.round(19.9 * 100) 得 1990，实测 19.9*100 = 1989.999… 必须 round 兜底）；更高精度直接上 decimal 类库的舍入方法——它们在十进制表示上舍入，所见即所得。',
            bonus:
              "toFixed 还有边界行为差异：舍入策略遵循「二进制值最近的十进制」而非十进制的四舍五入/银行家舍入——跨语言对账系统里，两侧必须用同一套十进制舍入规则。",
          },
          {
            q: "Number.MAX_SAFE_INTEGER 的 53 从哪来？雪花算法 id 传到前端为什么会变？",
            intent: "考 53 位有效精度的来源与工程后果——答出「隐含首位」才说明理解了尾数设计。",
            depth: 4,
            a: "64 位中 52 位存尾数的小数部分，规范化形式的整数首位恒为 1、不占存储——合计 53 个有效二进制位，能一一对应表示的整数上限是 2^53 − 1 = 9007199254740991。超过后相邻整数共用同一表示：9007199254740992 + 1 === 9007199254740992（实测）。后端 64 位 long 的雪花 id 通常大于它，HTTP 返回 JSON 后 JSON.parse 用 number 装载即静默失真——惯用方案是字符串传输，前端需要运算时转 BigInt。",
            bonus:
              "BigInt 与 JSON 不兼容：JSON.stringify(1n) 直接抛 TypeError（BigInt 没有合法的 JSON 表示）——序列化前必须手动转字符串，反序列化后按需转回，这一层转换约定要在前后端明确。",
          },
          {
            q: "decimal 类库为什么能精确计算？代价是什么？什么时候才值得用它？",
            intent:
              "收尾题，从「为什么错」推进到「怎么对」的选型判断——考十进制模拟的实现认知与分层策略。",
            depth: 4,
            a: "decimal.js/big.js 内部用「十进制数字串 + 指数」模拟手工竖式运算：加减法按小数点对位、乘法按整数乘后调指数——全程十进制，0.1 就是精确的 0.1，不存在二进制表示误差。代价是性能（相比原生浮点慢一个数量级以上）与依赖体积。所以工程上分层：展示层舍入用 toFixed（接受偏差）、一般比较用 EPSILON、金额走分单位整数、只有科学计算/财务清算这类「不能容忍任何表示误差」的场景才上类库。",
            bonus:
              "语言演进的印证：TC39 的 Decimal 提案正是为补「原生十进制」而来（目前仍处早期阶段），落定前类库是正解；而 JS 原生路线里 BigInt 只补了整数——「精确十进制小数」至今没有内建答案。",
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
              "同一类型系统的另一面：typeof/instanceof/toString.call 三把尺子的原理与边界。",
          },
          {
            title: "为什么改了副本，原对象也跟着变：深浅拷贝",
            to: "/note/frontend/javascript/types/deep-clone",
            description: "number 的精度问题之外，引用值的「共享」是另一类经典意外。",
          },
        ]}
      />
    </NoteShell>
  );
}
