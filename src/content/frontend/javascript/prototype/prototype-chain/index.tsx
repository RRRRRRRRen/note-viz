import { motion } from "framer-motion";
import { Conclusion, NoteShell, Prose, QAChain, Section } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        JS 没有"类复制式"继承，只有<strong>对象到对象的链接</strong>。 读属性时若自身没有，就沿{" "}
        <code>[[Prototype]]</code> 一路向上找，直到 <code>null</code>
        。class 只是这套机制之上的语法糖。
      </Conclusion>

      <Section title="三个容易混淆的东西">
        <Prose>
          <p>
            <strong>
              1. <code>[[Prototype]]</code>（内部槽）
            </strong>
            ：每个对象都有，指向它的原型，只能通过 <code>Object.getPrototypeOf</code>、{" "}
            <code>Object.create</code>、<code>new</code> 等方式设置。
          </p>
          <p>
            <strong>
              2. <code>.prototype</code>（函数属性）
            </strong>
            ：只有函数有。<code>new Fn()</code> 时，新对象的 <code>[[Prototype]]</code> 被指向{" "}
            <code>Fn.prototype</code>。
          </p>
          <p>
            <strong>
              3. <code>__proto__</code>
            </strong>
            ：历史遗留的 getter/setter，等价于读 <code>[[Prototype]]</code>
            。新代码请用标准 API。
          </p>
        </Prose>
        <CodeBlock
          code={`const animal = { eat() { return "eating" } };
const dog = Object.create(animal);

dog.eat();          // "eating" —— 自身没有，沿原型链找到 animal
Object.getPrototypeOf(dog) === animal;   // true

function Foo() {}
new Foo().__proto__ === Foo.prototype;   // true（演示用，生产用 getPrototypeOf）`}
        />
      </Section>

      <Section title="constructor 陷阱">
        <CodeBlock
          code={`function Foo() {}
Foo.prototype = { say() {} };   // 整体替换原型对象

const f = new Foo();
f.constructor;        // Object！constructor 链断了
f.constructor === Object;  // true —— 沿原型链一路找到 Object.prototype

// 正确姿势：替换前保留，或替换时补上
Foo.prototype = { constructor: Foo, say() {} };`}
        />
      </Section>

      <Section title="原型链可视化">
        <PrototypeDiagram />
      </Section>

      <Section title="经典追问链">
        <QAChain
          items={[
            {
              q: "class 的方法在实例上还是原型上？",
              a: "在原型上。class 声明的方法等同于挂在 Foo.prototype；只有实例字段（constructor 里的 this.x = ...）在实例自身。",
            },
            {
              q: "extends 之后 super 是什么？",
              a: "super 不是简单指向父类原型。它绑定当前 this 调用父类原型上的方法——本质是 [[HomeObject]] 元信息驱动的动态派发。",
            },
            {
              q: "Object.create(null) 有什么用？",
              a: "创建无原型的『纯净对象』，没有 toString/hasOwnProperty 等污染，适合做字典。代价是连基础方法都没有，需要时只能用 Object.keys 等静态方法。",
            },
            {
              q: "instanceof 的原理？能被绕过吗？",
              a: "沿右侧函数的 prototype 在左侧对象的原型链上查找。Symbol.hasInstance 可自定义判断；跨 iframe 场景会因为原型不共享而失效，用 Array.isArray 代替。",
            },
          ]}
        />
      </Section>
    </NoteShell>
  );
}

function PrototypeDiagram() {
  const chain = [
    { label: "dog 实例", sub: "自身属性: name" },
    { label: "Dog.prototype", sub: "bark() / constructor" },
    { label: "Animal.prototype", sub: "eat()" },
    { label: "Object.prototype", sub: "toString() / hasOwnProperty()" },
    { label: "null", sub: "查找结束" },
  ];
  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border bg-card p-5">
      <div className="mb-3 text-[10px] tracking-[0.08em] text-muted uppercase meta-mono">
        原型链查找路径 / prototype lookup
      </div>
      <div className="flex flex-col items-center gap-1.5">
        {chain.map((node, i) => (
          <div key={node.label} className="flex w-full max-w-sm flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`w-full rounded-md border px-3 py-2 text-center ${
                i === chain.length - 1
                  ? "border-dashed border-border text-muted"
                  : "border-accent/40 bg-accent/5"
              }`}
            >
              <div className="font-mono text-xs text-foreground">{node.label}</div>
              <div className="text-[10px] text-muted">{node.sub}</div>
            </motion.div>
            {i < chain.length - 1 && (
              <span className="text-xs text-muted meta-mono">↓ [[Prototype]]</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
