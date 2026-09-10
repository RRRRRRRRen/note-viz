import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock, StepThrough } from "@/components/demo";
import { CrossRef, DoDont, MemoryMap, OutputTimeline, Prerequisite } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Prerequisite
        notes={[
          {
            title: "变量是怎么被找到的：作用域与作用域链",
            to: "/note/frontend/javascript/scope/scope-chain",
          },
        ]}
      >
        变量查找沿作用域链、属性查找沿原型链——两条「逐级向上」的链是本篇的分析框架。
      </Prerequisite>

      <Conclusion>
        JS 没有「类复制式」继承，只有<strong>对象到对象的链接</strong>。读属性时自身没有，就沿{" "}
        <code>[[Prototype]]</code> 内部槽一路向上，直到 <code>null</code> 为止；写入则永远落在自身
        （遮蔽或新建，原型不动）。方法和原型放一份、所有实例共享——既省内存，也让「给已存在的实例补方法」成为可能。
        class 只是这套机制之上的语法糖。<code>constructor</code> 是惯例不是不变量：整体替换{" "}
        <code>prototype</code> 后必须手动补上。
      </Conclusion>

      <Heading level={2} title="双槽辨析：[[Prototype]]、prototype 与 __proto__" />
      <Paragraph>
        原型体系最容易混的是三个名字相似但完全不同的东西。设计动机先说清：
        <strong>链接的职责被分配给了两个角色</strong>——每个对象只有一个「我的原型是谁」的内部槽（
        <code>[[Prototype]]</code>，规范级，只能通过 <code>Object.getPrototypeOf</code>、
        <code>Object.create</code>、<code>new</code> 设置）；而「我 new
        出来的对象该链到谁」被放在构造函数身上， 成了函数特有的属性（<code>Fn.prototype</code>
        ）。实例看链、函数带配置——一个记录关系，一个提供出厂设置。
      </Paragraph>
      <List
        items={[
          <>
            <code>[[Prototype]]</code>：每个对象都有的内部槽，指向它的原型；查找沿它进行。
          </>,
          <>
            <code>.prototype</code>：只有函数有的属性；<code>new Fn()</code> 时新对象的{" "}
            <code>[[Prototype]]</code> 被指向它。
          </>,
          <>
            <code>__proto__</code>：历史遗留的 getter/setter，读它等价于读{" "}
            <code>[[Prototype]]</code>
            ；新代码用标准 API。
          </>,
        ]}
      />
      <Paragraph>
        <code>new Fn()</code> 在引擎里最核心的一步就是把新对象的 <code>[[Prototype]]</code> 指向{" "}
        <code>Fn.prototype</code>（另有以 <code>Fn.prototype.constructor</code> 为构造逻辑初始化
        this、执行函数体两步）。理解「双槽分属两个对象」，下面这组实测结果全部可推导：
      </Paragraph>

      <CodeBlock
        code={`const animal = { eat() { return "eating" } };
const dog = Object.create(animal);

dog.eat(); // "eating" —— 自身没有，沿原型链找到 animal
Object.getPrototypeOf(dog) === animal; // true

function Foo() {}
new Foo().__proto__ === Foo.prototype; // true（演示用，生产用 getPrototypeOf）`}
      />

      <MemoryMap
        label="原型链的内存布局 / prototype links"
        regions={[
          {
            id: "heap",
            title: "堆（对象与原型）",
            desc: "整条原型链都长在堆上，函数也是对象",
            layout: "wrap",
            color: "#1677ff",
          },
        ]}
        objects={[
          {
            id: "dog",
            region: "heap",
            label: "dog（实例）",
            color: "#8b5cf6",
            fields: [
              { name: "name", value: "'旺财'" },
              { name: "[[Prototype]]", refTo: "dogProto" },
            ],
          },
          {
            id: "dogProto",
            region: "heap",
            label: "Dog.prototype",
            color: "#1677ff",
            fields: [
              { name: "bark", value: "<function>" },
              { name: "constructor", refTo: "dogFn" },
              { name: "[[Prototype]]", refTo: "objProto" },
            ],
          },
          {
            id: "dogFn",
            region: "heap",
            label: "Dog（构造函数）",
            color: "#3fb950",
            fields: [{ name: "prototype", refTo: "dogProto" }],
          },
          {
            id: "objProto",
            region: "heap",
            label: "Object.prototype",
            color: "#9ca3af",
            fields: [
              { name: "toString", value: "<function>" },
              { name: "hasOwnProperty", value: "<function>" },
            ],
          },
        ]}
        note="dog.toString 的查找：dog → Dog.prototype → Object.prototype 命中。Object.prototype 的 [[Prototype]] 是 null，链到此为止。constructor 不在实例身上，是沿链在 prototype 对象上找到的。"
      />

      <Heading level={2} title="属性查找算法：一步不少" />
      <Paragraph>
        读取 <code>obj.prop</code> 的完整算法：先在 obj 自身做属性查找（规范里的
        <code>OrdinaryGetOwnProperty</code>）；命中直接返回——数据属性给值，访问器属性调用 getter；
        未命中则取 <code>obj.[[Prototype]]</code>，在原型对象上重复同样的过程，如此逐级向上。
        终止条件只有两个：<strong>某一级命中</strong>，或走到 <code>null</code> （链的尽头，
        <code>Object.prototype.[[Prototype]] === null</code>）。整条链都未命中时，读取得{" "}
        <code>undefined</code>、严格模式的写入抛 <code>TypeError</code>——这和变量查找的{" "}
        <code>ReferenceError</code> 是两套报错逻辑。
      </Paragraph>
      <Paragraph>
        两个容易漏掉的细节：一是<strong>访问器属性中途命中就直接调用，不再向上</strong>
        ——原型链上更远的同名 getter 没有机会执行；二是<strong>写入永远落在自身</strong>：
        <code>obj.prop = x</code> 若自身与原型链都没有该数据属性，就在 obj
        自身新建（遮蔽原型上的同名属性），原型不受影响。
        「读沿链、写落自身」的不对称，正是「方法放原型、状态放实例」这套惯例能成立的底层保证。
      </Paragraph>

      <StepThrough
        label="dog.toString() 的查找过程 / lookup trace"
        steps={[
          {
            title: "自身：dog",
            desc: "OrdinaryGetOwnProperty(dog, 'toString') 未命中——dog 自身只有 name。取 [[Prototype]] 进入下一级。",
            color: "#8b5cf6",
          },
          {
            title: "第一环：Dog.prototype",
            desc: "有 bark 和 constructor，没有 toString——未命中，继续沿 [[Prototype]] 向上。",
            color: "#1677ff",
          },
          {
            title: "第二环：Object.prototype",
            desc: "命中 toString——数据属性直接返回函数值；若是 getter 此刻被调用，查找终止。",
            color: "#3fb950",
          },
          {
            title: "反着写一次：dog.toString = fn",
            desc: "写入不走这条链：在 dog 自身创建遮蔽属性，此后实例读 toString 命中自身，原型上的函数不再可达。",
            color: "#f59e0b",
          },
        ]}
      />

      <Heading level={2} title="为什么方法放原型上：内存与动态性" />
      <Paragraph>
        先算内存账：方法挂在 <code>Fn.prototype</code> 上，一万个实例共享<strong>一份</strong>
        函数对象； 若在构造器里 <code>this.bark = function () {"{…}"}</code>
        ，一万个实例就有一万份函数对象——
        函数对象不小（闭包上下文、代码引用、隐藏类），实例量大的场景是实打实的内存差。
        原型方法的另一个红利是每实例行为一致：方法永远来自同一个对象，改一处全体生效，不存在「这批实例的方法是旧版」的分裂。
      </Paragraph>
      <Paragraph>
        再说动态性：查找发生在<strong>每次属性访问时</strong>，不是 <code>new</code>{" "}
        的那一刻。这意味着运行时往 <code>Fn.prototype</code> 上加方法，
        <strong>已经存在的实例立即可用</strong>—— polyfill 给 <code>Array.prototype</code>{" "}
        补方法、调试期给原型挂探针，靠的都是这个时点。 但同一机制反过来就是坑：
        <code>prototype</code> 上放引用类型字段（如 <code>Fn.prototype.tags = []</code>
        ），所有实例共享同一个数组，一处 <code>push</code> 全体可见——所以惯例是
        <strong>方法放原型、可变状态放实例</strong>（在构造器里赋值）。
      </Paragraph>

      <Heading level={2} title="constructor 陷阱" />
      <Paragraph>
        <code>constructor</code> 是惯例，不是被引擎维护的不变量。默认情况下{" "}
        <code>Dog.prototype.constructor === Dog</code>
        ——这个属性只是函数声明时顺手挂在原型对象上的一个普通属性。 一旦<strong>
          整体替换
        </strong>{" "}
        <code>Dog.prototype</code>（形如 <code>{"= { ... }"}</code> 的 字面量），新对象身上没有{" "}
        <code>constructor</code>，实例沿链查找就会越过它一路找到{" "}
        <code>Object.prototype.constructor</code>，得到 <code>Object</code>——链条断了（下例 Node v22
        实测）。而 <code>instanceof</code> <strong>不受影响</strong>，因为它走{" "}
        <code>[[Prototype]]</code> 链根本不查 <code>constructor</code>
        ——两套判断机制独立，别用一个推断另一个。
      </Paragraph>
      <Paragraph>
        断链的实际影响面：依赖 <code>obj.constructor</code>{" "}
        的代码（通用克隆/工厂、按类型分发的序列化重建、
        部分调试器的类型显示）会拿到错误的构造函数。修复惯例也简单：替换前保留原原型再扩展，或替换时在字面量里
        <strong>
          补回 <code>constructor: Fn</code>
        </strong>
        ；更彻底的做法是干脆不整体替换， 用 <code>Object.setPrototypeOf</code> 或{" "}
        <code>Object.create(Fn.prototype)</code> 组织继承（后者同样记得补 constructor）。
      </Paragraph>

      <CodeBlock
        code={`function Foo() {}
Foo.prototype = { say() {} };   // 整体替换原型对象

const f = new Foo();
f.constructor;       // [Function: Object] —— constructor 链断了
f.constructor === Object; // true —— 沿原型链一路找到 Object.prototype

// 正确姿势：替换前保留，或替换时补上
Foo.prototype = { constructor: Foo, say() {} };`}
      />
      <OutputTimeline
        label="输出解读 / constructor lookup"
        steps={[
          {
            output: "[Function: Object]",
            phase: "同步",
            why: "f 自身没有 constructor，沿链查找：Foo.prototype（被整体替换后的新对象）没有 → Object.prototype 命中——拿到的是 Object 的构造函数。",
          },
          {
            output: "true",
            phase: "同步",
            why: "同一条查找链的结果：f.constructor === Object 是真值比较，印证「constructor 只是 prototype 对象上的普通属性」——原型一换，链条跟着换。",
          },
        ]}
      />

      <DoDont
        label="替换 prototype 的姿势 / prototype swap"
        dont={{
          code: `function Foo() {}
Foo.prototype = { say() {} };
// 整体替换，字面量里没有 constructor

const f = new Foo();
f.constructor === Object; // true
// 依赖 constructor 的克隆/工厂
// 全部拿到错误类型`,
          note: "constructor 是 prototype 对象上的普通属性，整体替换即丢失——沿链向上找到 Object.prototype 的那份",
        }}
        do={{
          code: `function Foo() {}
Foo.prototype = {
  constructor: Foo, // 补回指向
  say() {},
};

// 或不整体替换，增量扩展：
Foo.prototype.say = function () {};
// constructor 原封不动`,
          note: "字面量替换必须补 constructor；能增量扩展就不整体替换——instanceof 不受影响不代表没人读 constructor",
        }}
      />

      <Heading level={2} title="边界陷阱" />
      <Paragraph>
        原型链的坑有共同模式：<strong>共享的东西被当成私有，私有的东西被当成公共</strong>。
        前者是原型上的引用类型字段被所有实例共享（上文已展开）；后者是往内置对象的原型上加方法——
        <code>Array.prototype.first = …</code> 看似方便，实则污染所有数组、可能被{" "}
        <code>for...in</code> 枚举到、与 polyfill/第三方库冲突，多次加载还会重复覆盖。另一个高频坑是{" "}
        <code>__proto__</code>：它是 setter 而非真实属性，写入开销大且非标准；另外「跨 iframe/worker
        的对象原型不共享」会让 <code>instanceof</code> 静默失效（追问链第 2 问展开）。
      </Paragraph>
      <Paragraph>
        原型引用字段这个坑值得单独点名，因为它最像「能跑的正常代码」：在 <code>Fn.prototype</code>{" "}
        上放 <code>tags: []</code> 这类可变对象，每个实例读 <code>this.tags</code> 都沿链命中
        <strong>同一个数组</strong>——某个实例 <code>push</code> 一条，所有实例的 <code>tags</code>{" "}
        都变了，而且序列化、比较、React 的引用比较会一起出诡异现象。 判断标准一句话：原型上只放
        <strong>不可变共享物</strong>（方法、常量）， 每实例一份的可变状态一律在构造器里初始化。
      </Paragraph>
      <DoDont
        label="扩展内置原型 / builtin pollution"
        dont={{
          code: `Array.prototype.first = function () {
  return this[0];
};

[1, 2, 3].first(); // 1
// 代价：所有数组被改、for...in 多出键、
// 与其他 polyfill 冲突、升级 JS 后
// 与原生方法同名时行为分裂`,
          note: "内置原型是全局公共命名空间：一处污染，全站买单——这是「原型动态性」的反面用法",
        }}
        do={{
          code: `// 方案一：工具函数
const first = (arr) => arr[0];

// 方案二：子类或静态方法
class MyArray extends Array {
  first() { return this[0]; }
}`,
          note: "需要新方法时收进自己的命名空间（工具函数/子类），需要通用能力时提 TC39 提案——不动内置原型",
        }}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "class 的方法在实例上还是原型上？",
            intent: "热身题，确认你把 class 还原成原型机制——答「实例上」的人还没穿过语法糖这层皮。",
            depth: 2,
            a: "在原型上。class 声明的方法等同于挂在 Foo.prototype；只有实例字段（constructor 里的 this.x = … 与类字段语法）落在实例自身。所以方法全类一份、字段每实例一份——class 的内存模型与「方法放原型、状态放实例」的惯例完全一致，它就是这套惯例的语法化。",
            bonus:
              "静态方法（static）挂在构造函数自身（Foo.staticFn），不进原型也不随实例可达；私有 #字段存在实例内部槽上，既不在原型也无法从外部访问——三种存放位置值得画成一张表记牢。",
          },
          {
            q: "instanceof 的原理？能被绕过吗？",
            intent:
              "考「双机制」意识：instanceof 与 constructor 是两条独立链——混为一谈的人说不出跨 iframe 失效的原因。",
            depth: 3,
            a: "沿右侧函数的 prototype 在左侧对象的原型链上逐级查找，命中即 true——本质是链的成员资格判断。可以绕过：Symbol.hasInstance 允许自定义判断逻辑；跨 iframe/worker 场景原型不共享（两个realm各有一套 Array.prototype），instanceof 会静默失效，此时用 Array.isArray（查内部槽）代替。",
            bonus:
              "Object.prototype.toString.call(x) 也跨 realm 可靠——它读内部槽标签（[object Array]）而非原型；三种判断的可靠度排序：内部槽 > 原型链（instanceof）> constructor 属性。",
          },
          {
            q: "extends 之后 super 是什么？",
            intent: "考 super 的派发机制——答「super 就是父类原型」在方法被混入/借用时会立刻露馅。",
            depth: 4,
            a: "super 不是指向父类原型的固定引用。super.method 绑定当前 this、但方法从 [[HomeObject]]（方法定义时记录的所属对象）的原型上取——本质是 HomeObject 元信息驱动的动态派发。这就是为什么方法被 obj.method() 调用时 this 是 obj，而方法体里的 super 仍按「定义位置」向上找：this 管接收者，super 管查找起点。",
            bonus:
              "对象字面量里想用 super，方法必须是 shorthand 写法（method() {}）——[[HomeObject]] 只挂在方法上，普通属性函数没有它，写 super 直接语法错误。",
          },
          {
            q: "Object.create(null) 有什么用？",
            intent: "考「无原型对象」的工程价值——知道字典用法是及格，说得出原型污染防御是加分。",
            depth: 4,
            a: "创建没有原型的『纯净对象』：没有 toString/hasOwnProperty 等继承成员，做字典/映射时不会被任意键名干扰（比如读 key 为 '__proto__' 或 'toString' 的值）。代价是连基础方法都没有——只能用 Object.keys、Reflect.has 这类静态方法操作它。",
            bonus:
              "安全视角：JSON.parse 返回的对象原型是 Object.prototype，攻击者可通过 '__proto__' 键做原型污染；以 Object.create(null) 的字典承接外部输入、或解析后深拷贝到无原型对象，是常见的防御姿势。",
          },
          {
            q: "给实例写属性时引擎做什么？会写到原型上吗？",
            intent:
              "压轴题，考「读沿链、写落自身」这条不对称的规范细节——它支撑着整个「方法在原型、状态在实例」的工程惯例。",
            depth: 5,
            a: "不会写到原型上。OrdinarySet 的逻辑：自身有该数据属性就改自身；没有则沿原型链找 setter，找到就调用；都没有则在（非严格模式下）自身新建一个属性——这个新建就是对原型的「遮蔽」。此后实例读该属性命中自身，原型上的同名属性对它不再可见，但其他实例不受影响。",
            bonus:
              "两个边界：严格模式下，原型存在同名只读属性时写入抛 TypeError（非严格静默失败）；对原始值（数字/字符串）的属性写入则完全静默丢弃——临时包装对象随即被扔掉，连遮蔽都不会发生。",
          },
        ]}
      />

      <Paragraph>
        原型链是「对象怎么拿到别人的方法」——下一问自然是「怎么把这套机制组织成可维护的继承体系」；
        而 new 的完整语义（绑定优先级）在另一篇展开：
      </Paragraph>
      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "class 是语法糖吗：从原型链到 class",
            to: "/note/frontend/javascript/prototype/inheritance",
            description: "从原型链借用构造函数到 ES6 class，几种继承方案的取舍与组合。",
          },
          {
            title: "手写 bind 时，new 为什么能「打败」它？",
            to: "/note/frontend/javascript/patterns/bind-new-priority",
            description: "new 的完整语义：原型链接线只是它四步里的一步。",
          },
        ]}
      />
    </NoteShell>
  );
}
