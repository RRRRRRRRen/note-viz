import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  Callout,
  CrossRef,
  DoDont,
  LayerStack,
  MemoryCard,
  Prerequisite,
  Table,
} from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        「功能很多、用得少」是对的，而且是设计使然：日常书写九成以上只落到一小撮——类型标注、type/interface、联合与字面量联合、
        <strong>泛型的使用</strong>、收窄、<code>as const</code>、几个高频工具类型和{" "}
        <code>import type</code>
        。类型系统的复杂度只服务两类消费者：给 JS 的动态模式找静态建模、让库作者把 API
        契约写精确。应用前端是类型的
        <strong>消费者</strong>不是<strong>生产者</strong>
        ——复杂度被库吸收了。实践守则一句话：一个类型三行内说不清意图，就简化它。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "TypeScript 在工程里到底扮演什么角色？",
            to: "/note/frontend/engineering/typescript/ts-roles",
          },
        ]}
      >
        先立住「运行时没有 TS、检查与转译分离」的心智模型，再看功能地图才不会迷失在类型体操里。
      </Prerequisite>

      <Heading level={2} title="三层功能地图" />
      <Paragraph>
        把 TS
        的全部功能按「日常书写频率」切成三层，边界比想象中清晰。判断标准不是「会不会写」，而是「谁在生产类型」——
        这决定了第三层的功能你几乎永远没有正当理由使用。
      </Paragraph>
      <LayerStack
        label="功能三层 / feature layers"
        title="日常主力占九成，中层要读懂，底层知道存在即可"
        layers={[
          {
            name: "日常主力（九成书写）",
            desc: "类型标注 · type/interface · 联合与字面量联合 · 泛型的使用 · 收窄 · as const · Partial/Pick/Omit/Record · import type",
            color: PALETTE.blue,
          },
          {
            name: "读得懂为主（库作者主战场）",
            desc: "条件类型 + infer · 映射类型修饰符 · 模板字面量类型 · 可变元组 · 递归类型——应用层需要能读懂库的报错，很少需要写",
            color: PALETTE.purple,
          },
          {
            name: "应用层基本不碰",
            desc: "namespace（运行时已死）· const enum（被单文件转译器淘汰）· 装饰器（除非框架约定）· 主动 declaration merging · unique symbol",
            color: PALETTE.gray,
          },
        ]}
      />

      <Heading level={2} title="消费者与生产者" />
      <Paragraph>
        类型系统的复杂度只服务两类消费者。第一类：给 JS
        的动态模式找静态建模——收窄让「鸭子类型」的世界可检查，泛型变体让「任意类型但保持关联」可表达；第二类：让库作者把
        API 契约写精确——React 的类型、xyflow 的类型把成吨的类型体操吸收进了{" "}
        <code>node_modules</code>。你标一个 props
        就享受全链路检查，那份「类型完备」的体验是别人用条件类型换来的。
      </Paragraph>
      <Paragraph>
        所以应用前端是类型的消费者：消费类型、读懂类型报错，而不是生产复杂类型。SQL
        使用者不需要会写存储引擎，但要会写查询、看懂执行计划——定位完全同构。真正的安全增益也不在类型技巧里，而在你已打开的那些检查开关（
        <code>strict</code>、<code>exactOptionalPropertyTypes</code>、
        <code>noUncheckedIndexedAccess</code>
        ）——它们拦的是真实世界的 bug，不是炫技场。
      </Paragraph>

      <Heading level={2} title="常用工具类型清单" />
      <Paragraph>
        第一层里最值得背下来的就是内置工具类型——它们全是<strong>类型层的纯函数</strong>
        ：对已有类型做变换，编译后没有任何运行时对应物。按用途分四组：
      </Paragraph>
      <Table
        label="工具类型速查 / utility types"
        head={["组", "工具类型", "一句话"]}
        rows={[
          ["结构变换", "Partial / Required / Readonly", "全变可选 / 全变必选 / 全变只读"],
          ["结构变换", "Pick<T, K> / Omit<T, K>", "从大类型里挑字段 / 剔字段"],
          ["结构变换", "Record<K, V>", "键集到值类型的映射"],
          ["提取", "ReturnType<F> / Parameters<F>", "拿函数返回值类型 / 参数元组"],
          ["提取", "Awaited<T> / InstanceType<C>", "解开 Promise 拿值类型 / 拿类的实例类型"],
          [
            "联合过滤",
            "Exclude / Extract / NonNullable",
            "从联合里剔除 / 留下 / 去 null undefined",
          ],
          ["字符串", "Uppercase / Capitalize …", "字面量字符串的大小写变换"],
        ]}
      />

      <Heading level={2} title="两个「已死」的边界" />
      <Paragraph>
        <strong>const enum 的处境</strong>
        ：它的卖点是「不生成运行时对象，所有使用点直接内联成字面量」——但跨文件内联需要全程序视角：a.ts
        里的 <code>Color.Red</code> 要内联成 0，编译器必须看到 b.ts 里的定义。tsc
        天然有全程序视角，业务代码里的 const enum 正常内联（本仓库 tsc
        实测：跨文件内联成字面量、零运行时输出）； <code>isolatedModules</code> 只拦{" "}
        <strong>ambient</strong>（.d.ts 声明里的）const enum——声明文件没有实现面可看，直接报错（TS 7
        实测错误码 TS2748）。 真正的变数在单文件转译器：esbuild/Oxc 的 transform
        模式一次只看一个文件，会把 const enum <strong>静默降级</strong>
        成普通
        enum——生成运行时对象、失去内联，行为变了却没有任何报错。它被生态事实性淘汰的核心正是这份
        「行为随工具链漂移的不确定性」，替代写法是 <code>as const</code>{" "}
        对象加推导类型——键做类型、值做运行时，任何工具链下行为一致。
      </Paragraph>
      <DoDont
        label="常量集合的现代写法 / const data"
        dont={{
          code: "const enum Color { Red = '#f00' }\nlet c = Color.Red",
          note: "isolatedModules 只拦 .d.ts 里的 ambient const enum；业务代码在 tsc 下正常内联，但被 esbuild/Oxc 类单文件转译器静默降级成普通 enum——生成运行时对象、失去内联，全程无报错",
        }}
        do={{
          code: "const Color = { Red: '#f00' } as const\ntype Color = keyof typeof Color",
          note: "值做运行时对象、键做类型——转译器无关，两端真实存在；本仓库色板单一来源就是此写法",
        }}
      />
      <Paragraph>
        <strong>namespace 的真假生死</strong>：它前身叫 internal module，是 ES modules 诞生之前 TS
        自己的模块方案。作为「运行时组织代码」的机制它已死——当代码都走 ES modules，用 namespace
        包运行时逻辑失去存在理由，且单文件转译器只支持基础形态。但作为「类型与声明的组织空间」它活得好好的：
        <code>@types/node</code> 里的 <code>NodeJS.ProcessEnv</code>、React 18+ 类型的{" "}
        <code>React.JSX</code>、.d.ts
        里组织一坨相关类型，全是纯类型容器，不产生任何运行时代码。判断标准一句话：
        <strong>
          里面只有 interface/type/declare 就活着；里面有会编译出 JS 的逻辑就该迁 ES modules
        </strong>
        。
      </Paragraph>
      <Callout kind="tip" title="你在别处看到大量 namespace？">
        大概率在 .d.ts 声明层——那是合法且常见的用法。真正该警惕的只有「用 namespace
        包业务逻辑」的存量代码：那是前模块时代的化石。
      </Callout>

      <Heading level={2} title="三个高频误区" />
      <List
        items={[
          <>
            把<strong>类型体操当水平证明</strong>——嵌套条件类型加多层 infer
            在应用代码里是负资产：编译变慢、报错变天书、同事读不懂；
          </>,
          <>
            以为<strong>类型会影响运行时</strong>
            ——工具类型编译后无对应物，类型标注转译即被擦除（详见本知识面第一篇）；
          </>,
          <>
            在 <strong>Vite 项目里用 const enum</strong>——单文件转译管线的毒药，用{" "}
            <code>as const</code> 替代。
          </>,
        ]}
      />

      <QAChain
        intro="四问从「存在性」问到「判断力」：先确认类型层与运行时的边界，再确认消费者定位与写法守则。"
        items={[
          {
            depth: 1,
            q: "Partial<T> 在运行时存在吗？",
            intent: "热身题，确认「类型层纯函数」这个基本认知——答错的人把类型系统当运行时库。",
            a: "不存在。所有工具类型都是类型层的变换公式，编译后的 JS 里没有任何对应物——它们只在编译期帮检查器理解你的意图。",
          },
          {
            depth: 2,
            q: "为什么说应用开发者是「类型的消费者」？",
            intent: "考察是否理解类型复杂度的去向——这是「用得少」的根本原因，不是 TS 弱。",
            a: "因为类型系统的复杂度被库吸收了：React、路由、组件库的类型把条件类型、infer、模板字面量都用在了它们的类型定义里，换来你在应用层「标个 props 就全链路检查」。你消费这份精确，不生产它。",
            bonus:
              "推论：读懂库的类型报错（中层能力）比会写体操（生产能力）对应用开发者更实用——面试里能讲清一个第三方类型报错在说什么，比手写 ValueOf 深层嵌套更能证明水平。",
          },
          {
            depth: 3,
            q: "const enum 在 Vite 项目里会发生什么？",
            intent: "把「功能认知」和「构建管线」缝起来——单文件转译的约束如何反噬语言特性。",
            a: "tsc 一侧几乎不报错：业务代码里的 const enum 在全程序编译下正常内联，isolatedModules 只对 .d.ts 里的 ambient const enum 报错（TS 7 实测错误码 TS2748）。真正的变化在转译侧：esbuild/Oxc 的单文件 transform 会把它静默降级成普通 enum——生成运行时对象、不再内联，行为改变却无任何警告；带全程序视角的 bundler（esbuild bundle、rolldown）则能恢复跨文件内联。同一份代码行为随工具链漂移，这正是它的死刑判决——替代：as const 对象 + keyof typeof。",
          },
          {
            depth: 4,
            q: "什么信号出现时，才说明你「需要」写条件类型和 infer？",
            intent: "区分「会用」和「该用」——很多人学了体操就到处用，这题筛的是判断力。",
            a: "当你在生产类型而不是消费类型时：写通用工具库、写组件库的类型签名、封装需要保持类型关联的泛型 API。应用代码里出现它的正当场景极少——多数时候一个联合类型加几行映射就够了。",
            bonus:
              "判断标准可操作化：这个类型三行内说不清意图就简化。类型是写给人看的合同，编译器不在乎它多优雅。",
          },
        ]}
      />

      <MemoryCard keyword="应用层是类型消费者">
        复杂度被库吸收——你标 props 享受的全链路检查，是库作者的体操换来的。
      </MemoryCard>
      <MemoryCard keyword="三行说不清就简化" color={PALETTE.purple}>
        类型是写给人看的合同。应用代码里类型体操是负资产：编译慢、报错天书、可读性差。
      </MemoryCard>

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "TypeScript 的各个版本都迭代了什么？",
            to: "/note/frontend/typescript/basics/ts-version-history",
            description:
              "功能地图是静态的，但它是六个时代叠出来的——版本史决定了你今天用到的每个特性来自哪里。",
          },
          {
            title: "为什么 Vite 转译 TS 却不做类型检查？",
            to: "/note/frontend/engineering/typescript/vite-transpile-ts",
            description:
              "const enum 之死只是单文件转译约束的一个切面——转译与检查分离的完整逻辑在这篇。",
          },
        ]}
      />
    </NoteShell>
  );
}
