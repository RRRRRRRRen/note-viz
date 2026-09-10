import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock } from "@/components/demo";
import {
  CompareTable,
  DoDont,
  MemoryCard,
  MemoryMap,
  Prerequisite,
  CrossRef,
} from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        原始值赋值即拷贝，引用值赋值只复制指针——<strong>浅拷贝断开第一层、深拷贝断开所有层</strong>
        。<code>JSON.parse(JSON.stringify(obj))</code> 只能处理纯 JSON 结构：函数与 undefined
        丢失、Date 变字符串、RegExp 变空对象、NaN 变 null、<strong>循环引用直接抛 TypeError</strong>
        。 生产选型三级：<strong>structuredClone 首选</strong>（支持循环引用，但不认函数与原型）→
        手写<strong>递归 + WeakMap</strong>（面试满分版）→
        业务定制（需保留方法时）。缓存已拷贝节点用 WeakMap 不用 Map：
        <strong>弱引用不阻止源对象被 GC</strong>。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "「1」+ 1 为什么等于「11」：隐式转换规则",
            to: "/note/frontend/javascript/types/type-coercion",
          },
        ]}
      >
        原始值与引用值的分界（值语义 vs 指针语义）是拷贝问题的源头，本篇直接沿它展开。
      </Prerequisite>

      <Paragraph>
        先把分界线画出来：原始值（number/string/boolean…）按<strong>值</strong>
        存储，赋值即完整拷贝，两个变量从此毫无关系；引用值（对象/数组/函数）按<strong>指针</strong>
        存储，赋值只复制指针——两个变量指向同一块内存。所以 <code>const b = a</code> 之后改{" "}
        <code>b.x</code>，<code>a.x</code> 一起变：不是拷贝出了
        bug，而是从头到尾只有一份对象。顺带一个反直觉的边角： 原始值明明没有方法，
        <code>"abc".length</code>{" "}
        却能用——引擎临时创建包装对象、用完即弃，给原始值挂属性因此静默无效。
      </Paragraph>
      <Paragraph>
        深拷贝要解决的就是这条分界线带来的问题：<strong>造一个真正独立的副本</strong>
        ——改副本的任何一层，原对象都不受影响。判断一段代码有没有拷贝问题，只需要追一个问题：
        <strong>改嵌套属性时，谁还和它共享内存？</strong>下面从「断开几层」开始拆。
      </Paragraph>

      <Heading level={2} title="三层语义：赋值、浅拷贝、深拷贝" />
      <Paragraph>
        一切从值语义开始：原始值赋值是完整拷贝，两个变量此后毫无关系；引用值赋值是复制指针，两个变量共享同一块内存——改一个另一个跟着变。浅拷贝（
        <code>{"{...obj}"}</code>、<code>Object.assign</code>、<code>Array.prototype.slice</code>
        ）创建新容器，但只把<strong>第一层</strong>
        的值/引用抄进去：第一层原始值安全，第一层引用仍是共享指针；深拷贝则递归断开所有层。
      </Paragraph>
      <Paragraph>
        高频事故正是「浅拷贝侥幸」：从 props/state 里 <code>{"{...user}"}</code> 之后再改{" "}
        <code>copy.profile.name</code>——profile 是引用，原始对象同步被改，React
        的引用比较优化也随之失效；表单草稿、撤销重做（历史栈存引用等于没存）是重灾区。
      </Paragraph>

      <DoDont
        label="浅拷贝的侥幸 / shallow trap"
        dont={{
          code: `const copy = { ...state };
copy.profile.city = "上海";

state.profile.city
// "上海" —— 源对象被改脏`,
          note: "profile 是嵌套引用，浅拷贝后仍共享同一块内存",
        }}
        do={{
          code: `// 明确只改第一层 → 浅拷贝够用
// 要断开所有层 → 深拷贝
const copy = structuredClone(state);`,
          note: "先问「会改到第几层」，再选拷贝深度",
        }}
      />

      <CompareTable
        label="对比 / copy depth"
        left={{
          title: "浅拷贝",
          color: "#8b5cf6",
          points: [
            "API：{...obj}、Object.assign、arr.slice()",
            "第一层原始值安全断开",
            "嵌套引用仍共享，改嵌套属性两边都变",
            "适合扁平结构或明确只改第一层的场景",
          ],
        }}
        right={{
          title: "深拷贝",
          color: "#1677ff",
          points: [
            "所有层级断开，互不影响",
            "必须处理循环引用与内建类型（Date/Map/Set…）",
            "成本：递归遍历，大对象有性能与栈深问题",
            "适合：撤销栈、缓存快照、跨组件状态隔离",
          ],
        }}
      />

      <MemoryMap
        label="浅拷贝断到第几层 / shallow copy layers"
        regions={[
          {
            id: "stack",
            title: "变量（栈）",
            desc: "赋值只是复制指针",
            layout: "column",
            color: "#f59e0b",
          },
          {
            id: "heap",
            title: "对象（堆）",
            desc: "{...state} 之后的内存",
            layout: "wrap",
            color: "#1677ff",
          },
        ]}
        objects={[
          {
            id: "v-src",
            label: "state",
            region: "stack",
            fields: [{ name: "ptr", refTo: "o-src" }],
          },
          {
            id: "v-copy",
            label: "copy",
            region: "stack",
            fields: [{ name: "ptr", refTo: "o-copy" }],
          },
          {
            id: "o-src",
            label: "state（源对象）",
            region: "heap",
            color: "#1677ff",
            fields: [
              { name: "city", value: '"北京"' },
              { name: "profile", refTo: "o-inner" },
            ],
          },
          {
            id: "o-copy",
            label: "copy（浅拷贝）",
            region: "heap",
            color: "#3fb950",
            fields: [
              { name: "city", value: '"北京"' },
              { name: "profile", refTo: "o-inner" },
            ],
          },
          {
            id: "o-inner",
            label: "profile（嵌套对象）",
            region: "heap",
            color: "#8b5cf6",
            fields: [{ name: "city", value: '"北京"' }],
          },
        ]}
        note={`第一层已断开：state 与 copy 是两块内存，改 copy.city 互不影响；但 profile 的引用 chip 同色——还是同一个对象，copy.profile.city = "上海" 时两边一起变。深拷贝会把 profile 也复制一份，chip 各指各的。`}
      />

      <Heading level={2} title="JSON 拷贝的缺陷清单" />
      <Paragraph>
        <code>JSON.parse(JSON.stringify(obj))</code> 流传最广、翻车也最多，根因是{" "}
        <strong>JSON 的数据模型只有六种类型</strong>
        （string/number/boolean/null/array/object），JS
        值先被序列化成这个模型再反序列化回来，塞不进模型的统统失真：函数与 undefined/Symbol
        直接丢失（键消失）、Date 变 ISO 字符串、RegExp 变空对象、 NaN/Infinity 变 null、Error
        只剩空对象。
      </Paragraph>
      <Paragraph>
        两个更隐蔽的坑：① <strong>循环引用直接抛 TypeError</strong>
        ——序列化是无限递归，没有「已访问」记录；② <strong>原型彻底丢失</strong>
        ——反序列化得到的是普通对象，实例方法全部消失。所以 JSON
        拷贝只适合「能安全出现在接口返回值里的结构」；反之，只要数据能无损过一遍
        JSON，它就可以安全用 JSON 拷贝——这倒是个自洽的判断标准。
      </Paragraph>

      <DoDont
        label="JSON 拷贝 / json clone"
        dont={{
          code: `const obj = {
  fn: () => {},
  at: new Date(),
  inf: Infinity,
};
obj.self = obj; // 循环引用

JSON.parse(JSON.stringify(obj));
// TypeError: Converting circular
// structure to JSON`,
          note: "即便没有循环：fn 消失、at 变字符串、inf 变 null——全部静默失真",
        }}
        do={{
          code: `// 纯 JSON 结构（接口数据）→ JSON 可用
const copy = structuredClone(state); // 通用首选
// 需保留原型方法 → 定制手写（见下）`,
          note: "先判断数据形态再选工具，别把 JSON 拷贝当地图炮",
        }}
      />
      <MemoryCard keyword="拷贝选型三级" color="#1677ff">
        <strong>① structuredClone</strong>（原生、支持循环引用与内建类型）→{" "}
        <strong>② 手写递归 + WeakMap</strong>（面试满分版，可控性最高）→ <strong>③ 业务定制</strong>
        （需保留类方法/函数属性时）。JSON 拷贝只配出现在纯数据场景。
      </MemoryCard>

      <Heading level={2} title="structuredClone 与满分手写" />
      <Paragraph>
        现代运行时（浏览器、Node 17+）内置 <code>structuredClone</code>
        ：按结构化克隆算法拷贝，支持循环引用、Map/Set/Date/RegExp/ArrayBuffer 等，处理不了函数、DOM
        节点与<strong>原型链</strong>
        ——类实例拷出来是普通对象，方法消失。它不是手写的替代品，而是「纯数据快照」场景的最优解；需要保留行为（方法）时，只剩手写一条路。
      </Paragraph>
      <DoDont
        label="structuredClone 的边界 / structured clone"
        dont={{
          code: `class Cart {
  items = [];
  total() { return this.items.length; }
}
const copy = structuredClone(new Cart());
copy.total; // undefined —— 原型与方法全丢
// （copy.constructor === Object，实测 Node 22.17）

structuredClone(() => {});
// DataCloneError：函数不能克隆`,
          note: "结构化克隆只认「数据」：类实例退化为普通对象，函数直接抛错",
        }}
        do={{
          code: `// 带行为的对象 → 手写递归（见下），
// 或拷贝后手动挂回原型：
Object.setPrototypeOf(copy, Cart.prototype);`,
          note: "纯数据快照用 structuredClone，要保留行为就走手写",
        }}
      />
      <Paragraph>
        手写版的及格线是「递归 + WeakMap 断循环」，满分要补三件事：<strong>内建类型</strong>
        （Date/RegExp/Map/Set 各有专属构造）、<strong>Symbol 键</strong>
        （Reflect.ownKeys 才收得到）、<strong>先登记再递归</strong>
        （顺序错了环引用照样爆栈）。面试时主动说出这三条，等于替面试官问完了第二三问。
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`function deepClone(source, seen = new WeakMap()) {
  // null/原始值/函数直接返回：函数的 typeof 是 "function"，
  // 走这行原样返回引用——克隆无状态函数没有意义，共享即可
  if (source === null || typeof source !== "object") return source;
  if (seen.has(source)) return seen.get(source); // 命中：断开循环
  if (source instanceof Date) return new Date(source);
  if (source instanceof RegExp)
    return new RegExp(source.source, source.flags);
  if (source instanceof Map) {
    const m = new Map();
    seen.set(source, m);
    source.forEach((v, k) =>
      m.set(deepClone(k, seen), deepClone(v, seen))
    );
    return m;
  }
  if (source instanceof Set) {
    const s = new Set();
    seen.set(source, s);
    source.forEach((v) => s.add(deepClone(v, seen)));
    return s;
  }
  const target = Array.isArray(source) ? [] : {};
  seen.set(source, target); // 先登记再递归：环引用在递归中命中缓存
  Reflect.ownKeys(source).forEach((key) => { // 含 Symbol 键
    target[key] = deepClone(source[key], seen);
  });
  return target;
}`}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "赋值、浅拷贝、深拷贝到底差在哪？",
            intent: "热身题，三层语义的分界必须一秒说清——很多人把浅拷贝和赋值混为一谈。",
            depth: 2,
            a: "赋值不创建新容器，引用值连指针带共享；浅拷贝创建新容器但只抄第一层，嵌套引用仍共享；深拷贝递归断开所有层。验证方法：改 copy.profile.name（嵌套属性），源对象跟着变的就是浅拷贝——profile 那层还是同一根指针。",
            bonus:
              "Object.assign 和展开运算符都是浅拷贝；数组 concat/slice 同理——「返回了新数组」不等于深拷贝，第一层元素是对象时照样共享。",
          },
          {
            q: "为什么 JSON 深拷贝遇到循环引用会抛错？",
            intent:
              "考序列化的过程模型——答「无限递归」是及格，能说出 JSON 模型没有引用概念才完整。",
            depth: 3,
            a: "JSON.stringify 靠递归遍历把 JS 值映射成纯数据模型，而 JSON 模型里没有「引用/指针」的表达能力——每个对象只能整体展开。遇到环引用，递归没有终止条件只能一路展开直到栈溢出，实现上直接主动抛 TypeError 拒绝。手写深拷贝的 WeakMap 正是补上「已访问」记录，让遍历在环处停止。",
            bonus:
              "JSON.stringify 的 replacer 第二参数可以过滤/转换字段（顺带规避敏感信息），toJSON 方法可自定义序列化形态——但它们都救不了循环引用。",
          },
          {
            q: "深拷贝的循环引用为什么用 WeakMap 记录而不是 Map？",
            intent: "考弱引用的语义——「都能解决循环引用，但 GC 行为不同」是这道题的分层线。",
            depth: 4,
            a: "两者都能断开循环引用：递归前登记源对象，遇到已登记的直接返回缓存。区别在引用强度：Map 对 key 是强引用，拷贝完的源对象永远被缓存占着，不释放；WeakMap 的引用是弱的不参与 GC 计数，源对象在别处没有引用后可正常回收，缓存随对象一起消失。深拷贝是「过程性」需求，缓存生命周期不该超过拷贝过程本身——WeakMap 语义刚刚好。",
            bonus:
              "同样的判断出现在所有「过程性缓存」场景：DOM 关联元数据用 WeakMap、观察者列表用 WeakRef——强引用还是弱引用，问「缓存该活多久」。",
          },
          {
            q: "seen 登记的时机为什么必须在递归之前？放到递归之后会怎样？",
            intent: "考断环机制的时序——「登记时机」是循环引用检测的成败点，顺序写错环照样爆栈。",
            depth: 4,
            a: "必须先 seen.set(source, target) 再对属性值递归。登记在前，递归中再次遇到同一个对象时 seen.has 命中、直接返回缓存，环被截断；登记在后，第一次回到自身时缓存里还没有记录，递归继续深入——无限展开直到栈溢出，WeakMap 形同虚设。选型（WeakMap）管的是拷贝结束后的回收，时序（先登记）管的是拷贝过程中的断环——两问答的不是一个层面。",
            bonus:
              "Map/Set 分支同理：先创建空容器并登记，再逐项深拷贝——先把「壳」挂进缓存，环引用回来时拿到的是完整的壳，而不是等待中的递归。",
          },
          {
            q: "structuredClone 为什么不能替代所有手写深拷贝？",
            intent: "考内建 API 的边界——说得出「原型与函数」这一层，说明真对比过而不只是知道名字。",
            depth: 4,
            a: "结构化克隆算法为「跨线程传输数据」设计，只认数据不认行为：函数直接抛错，DOM 节点不支持，类实例拷出来是普通对象——原型方法全部丢失。需要保留行为的对象（带方法的类实例、含回调的配置对象）只能手写或业务定制。反过来，纯数据快照场景 structuredClone 是最优解：性能好、语义标准化、零依赖。",
            bonus:
              "进阶语义：structuredClone 的第二个参数 transfer 里的 ArrayBuffer 会被「转移」而非复制——源对象的缓冲区变空，这是性能与安全的权衡点，面试提出来非常加分。",
          },
          {
            q: "频繁深拷贝状态导致性能问题，除了优化拷贝还有什么思路？",
            intent:
              "压轴题，从实现细节跳到架构选型——考你是否知道「不变数据 + 结构共享」这条工业路线。",
            depth: 5,
            a: "深拷贝的 O(n) 全量成本源于「每次变更都完整克隆」。工业解法是<strong>不可变数据 + 结构共享</strong>：变更时不拷贝整棵树，而是只新建变更路径上的节点、其余子树直接复用引用（immutable.js 的 Map/List、Immer 的 draft 代理都是这个思路）——写入成本从 O(n) 降到 O(log n)，还能用引用相等性做 O(1) 变更检测（React.memo 直接受益）。",
            bonus:
              "取舍：结构共享换来了性能与变更检测，代价是「引用相等不再等于内容相等」的心智负担与额外依赖；Immer 靠 Proxy 把写法还原成可变风格，是当前的主流折中。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "「1」+ 1 为什么等于「11」：隐式转换规则",
            to: "/note/frontend/javascript/types/type-coercion",
            description: "值与引用的分界从类型系统讲起——原始值按值、引用值按指针。",
          },
          {
            title: "JS 是怎么释放内存的：GC 与泄漏排查",
            to: "/note/frontend/javascript/memory/gc-and-leaks",
            description:
              "拷贝管理「内存的复制」，GC 管理「内存的回收」——WeakMap 弱引用选型在那边完整展开。",
          },
        ]}
      />
    </NoteShell>
  );
}
