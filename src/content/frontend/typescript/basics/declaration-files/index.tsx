import { CodeBlock } from "@/components/demo";
import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  Callout,
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  Table,
  VersionNote,
} from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        <code>.d.ts</code>（d = declaration）是
        <strong>只描述「有什么」、不含「怎么做」的合同文件</strong>——类比 OpenAPI 规范之于 REST
        服务，或 protobuf 的 .proto 之于 RPC。它为四个问题而生：给存量 JS 库补类型、充当 TS
        库的标准发布形态（js + d.ts）、描述宿主环境（DOM/ES
        全局）、给无类型模块挂声明。底层逻辑一句话：
        <strong>文件级靠名字相邻匹配，内容级只有信任没有验证</strong>
        ——声明文件说模块长什么样，模块的类型面就是什么样。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "TypeScript 在工程里到底扮演什么角色？",
            to: "/note/frontend/engineering/typescript/ts-roles",
          },
        ]}
      >
        声明文件是「检查需要全程序知识」的原料供应者——先知道 program 从哪来，再看它的原料。
      </Prerequisite>

      <Heading level={2} title="四个存在理由" />
      <Paragraph>
        npm 上十年的包都是 JS，不可能全部 TS 重写；TS 库又不能把源码直接发给用户；浏览器和 Node
        的全局对象更不可能由
        TS「实现」——三类问题共用同一个解法：把「类型的描述」和「值的实现」拆开放。声明文件就是那个描述：
      </Paragraph>
      <Table
        label="角色速查 / four roles"
        head={["角色", "场景", "实例"]}
        rows={[
          [
            "给存量 JS 补类型",
            "包本身是 JS、没有自带类型",
            "@types/react、@types/node（发布在 @types 作用域下）",
          ],
          [
            "TS 库的发布形态",
            "tsc 编译产出 .js + .d.ts，源码可不发",
            "@xyflow/react 的 dist 里 index.js 与 index.d.ts 并排",
          ],
          [
            "描述宿主环境",
            "全局对象与标准库不是 JS 代码写的",
            "TS 自带的 lib.dom.d.ts、lib.es2022.d.ts 系列",
          ],
          [
            "声明无类型模块",
            "CSS、图片、私有语法后缀",
            "declare module '*.css'、vite/client 里的 declare module '*?raw'",
          ],
        ]}
      />
      <VersionNote
        label="lib 文件的去向 / builtin libs"
        versions={[
          {
            range: "TS 6.x-",
            text: "lib.d.ts 系列以 lib/*.d.ts 文件随 npm 包分发，可以直接打开翻阅",
            color: PALETTE.gray,
          },
          {
            range: "TS 7（原生）",
            text: "lib 内嵌进 Go 原生二进制：包里不再有 lib/*.d.ts 文件（typescript@7 的 lib/ 目录只剩 tsc 启动器）",
            color: PALETTE.green,
          },
        ]}
        note="变的只是分发的物理形态：这些「TS 自带的类型」内容没变，从可翻阅的文件变成了二进制内嵌资源"
      />
      <Paragraph>
        为什么必须是「分离的描述」而不是「带上实现」？因为检查器需要的只有<strong>形状</strong>
        ：你的代码调用了什么、传什么类型、返回什么——它从不执行被调用的代码。四类角色共享这个判断：给
        @types/react 写声明的人不需要重新实现
        React，描述宿主环境的人更不可能去实现浏览器。描述与实现分离之后，两者可以用不同的节奏、不同的语言、不同的发布渠道各自演进——这也是合同类比真正成立的地方：合同约束交互面，不约束双方内部。
      </Paragraph>

      <Heading level={2} title="文件级：名字相邻就配上对" />
      <Paragraph>
        匹配规则朴素到不像设计：<strong>同名相邻</strong>。解析落在 <code>Button.js</code>
        上时，它的类型声明就是同目录的 <code>Button.d.ts</code>（模块格式变体同理：
        <code>.d.mts</code> 对 .mjs、<code>.d.cts</code> 对 .cjs）。包级则由 package.json 指路：
        <code>types</code>/<code>typings</code>
        字段或 exports 的 types 条件，直接定位到 dist 里的声明入口。名字相邻匹配解释了一个现象——TS
        库发布后你能在编辑器里跳转「实现」跳到
        .d.ts：因为对消费者来说，声明文件就是这个模块的全部可见面。
      </Paragraph>
      <Paragraph>
        这套朴素规则够用的原因，是它与 npm
        的物理布局天然对齐：包发布成目录，声明就放在实现旁边——类型查找完全本地、零配置，不依赖任何中心化注册表。每个包自带合同，安装即生效；{" "}
        <code>types</code> 字段与 exports types 条件只是默认规则的「指路牌」，处理 dist
        与源码不同名、多入口分包这类发布形态。规则越朴素，覆盖面反而越大。
      </Paragraph>

      <Heading level={2} title="内容级：信任，不验证" />
      <Paragraph>
        这是声明文件最重要也最反直觉的性质：TS <strong>从不核对声明与实现是否一致</strong>。.d.ts
        说模块导出一个
        <code>(a: string) =&gt; number</code> 的函数，检查器就信了——哪怕实现里参数是数字、返回的是
        string。声明面即类型面，JS 文件的内容对检查器完全隐形。合同只被执行，从不被审计。
      </Paragraph>
      <Paragraph>
        为什么设计成「信任」而不是「核对」？因为核对意味着对实现做完整的类型推导——消费任何一个库都要把它的实现纳入自己的检查范围：成本是天文数字，而且会逼着库作者把实现细节变成公共契约。信任模型把成本切干净：声明面是唯一检查对象，实现可以是
        JS、可以打包成 wasm、甚至可以由别的语言实现。代价就是<strong>漂移风险</strong>
        ——合同说谎时没有任何机制报警，只能靠发布流程（tsc 自产声明保证自洽）与集成测试兜底。
      </Paragraph>
      <CompareTable
        label="两种类型来源 / declared vs inferred"
        left={{ title: "声明制（默认）", color: PALETTE.purple }}
        right={{ title: "推导制（allowJs）", color: PALETTE.green }}
        rows={[
          {
            aspect: "类型从哪来",
            left: "同名 .d.ts / types 字段指路的声明",
            right: "tsc 解析 .js 实现，从代码推导（JSDoc 可精化）",
          },
          { aspect: "与实现的关系", left: "信任——从不核对", right: "同源——天然一致" },
          {
            aspect: "适用场景",
            left: "消费第三方包、库发布",
            right: "JS 项目渐进迁移、checkJs 检查 JS 代码",
          },
        ]}
      />
      <Callout kind="warning" title="「类型全绿但运行时炸」的根因">
        声明写错（或过时）时，检查器依然按合同放行你的代码——类型完备不代表运行时正确。skipLibCheck
        会进一步跳过对声明文件本身的检查，信任模型加深一层。@types
        社区包与实现漂移的风险，正是从这条性质里长出来的。
      </Callout>

      <Heading level={2} title="declare 家族与全局三姿势" />
      <Paragraph>
        <code>declare</code> 是「向检查器描述存在、同时禁止生成代码」的标记词，.d.ts
        里的一切都隐式是 declare。家族成员按描述对象分：变量（<code>declare const/let</code>
        ）、函数与类（
        <code>declare function/class</code>）、枚举与命名空间（<code>declare enum/namespace</code>
        ）、模块（
        <code>declare module "x"</code>，支持 <code>'*.css'</code> 通配符）、全局作用域（
        <code>declare global</code>）。它只用于描述「无法用 TS
        表达但确实存在的外部世界」——宿主注入的全局、非 TS 模块、环境变量：
      </Paragraph>
      <CodeBlock
        lang="typescript"
        code={`// 给 window 挂宿主注入的字段（模块文件内必须用 declare global）
declare global {
  interface Window {
    __NOTE_VIZ_VERSION__: string;
  }
}

// 给无类型的私有模块挂声明（环境声明）
declare module "*.note.css" {
  const classes: Record<string, string>;
  export default classes;
}

export {}; // 让本文件成为模块，declare global 才合法`}
      />
      <Paragraph>
        全局类型声明有三条姿势：<strong>模块内 declare global</strong>（最常用，按需扩展全局接口）；
        <strong>脚本式文件天然全局</strong>——没有任何顶层 import/export 的
        .ts/.d.ts，声明自动进入全局作用域（传统声明文件都长这样）；
        <strong>收录机制</strong>——放进 tsconfig include 的目录、写进 <code>types</code>{" "}
        白名单、或用三斜线
        <code>/// &lt;reference types="..." /&gt;</code> 指令。日常遇到的 <code>vite/client</code>
        就是三种姿势的合订本。
      </Paragraph>
      <DoDont
        label="declare 的纪律 / describe, don't lie"
        dont={{
          code: "declare const config: ReadyConfig",
          note: "运行时根本没有 config 这个全局——撒谎式的 declare 让类型全绿、运行时炸，且比没有类型更难排查",
        }}
        do={{
          code: "declare const __APP_VERSION__: string",
          note: "只描述确实存在的外部世界（构建注入、宿主挂载）；红线该用真实类型修，不用 declare 消",
        }}
      />

      <DoDont
        dont={{
          code: `// ambient.d.ts
declare module "*";`,
          note: "万能通配把整棵模块树变 any，检查形同虚设",
        }}
        do={{
          code: `// types/legacy-lib.d.ts：只为真实缺失的包补声明
declare module "legacy-lib" { /* 按真实 API */ }`,
          note: "声明文件按需精确，有缺口才补",
        }}
      />

      <QAChain
        intro="五问从语法地位挖到信任模型：声明文件的每个设计决定都能从「合同」这个隐喻推出来。"
        items={[
          {
            depth: 2,
            q: ".d.ts 和 .ts 的语法差别是什么？",
            intent: "热身：确认「声明文件是语法受限的 TS」这个定位。",
            a: "只许声明、不许实现：可以有 interface/type/declare 系列，写函数体、赋值语句直接报错。它是 TS 语言内的正式机制（不是口头约定）——编译器专门识别 *.d.ts 扩展名并按声明文件处理，衍生变体 .d.mts/.d.cts 对应 ESM/CJS。",
          },
          {
            depth: 3,
            q: "Button.js 和 Button.d.ts 是怎么配上的？内容会互相校验吗？",
            intent: "把匹配拆成文件级和内容级两问——大多数人只想过第一层。",
            a: "文件级靠名字相邻：同目录同名，解析落在 .js 上自动找同名 .d.ts 拿类型。内容级不校验：TS 从不核对声明的导出面和 JS 实际导出的是否一致——声明说模块长什么样，类型面就是什么样。",
            bonus:
              "例外开关是 allowJs/checkJs：让 tsc 解析 .js 实现本身来推导类型（JSDoc 精化），类型来源从「声明」变成「推导」，天然与实现同源。",
          },
          {
            depth: 3,
            q: "为什么 TS 库发布时不直接给 .ts 源码？",
            intent: "考察发布形态的设计权衡——「给源码不行吗」背后是三重成本。",
            a: "可以但有代价：源码暴露实现细节、消费方被迫承担编译成本（把 tsc 拖进自己的构建）、版本与工具链被绑定。js + d.ts 是标准答案：消费者运行 js、获得类型、无需编译你的代码——contract 与 implementation 各自独立分发。",
          },
          {
            depth: 4,
            q: "tsc 自产的 .d.ts 为什么天然可信，社区的会有漂移风险？",
            intent: "把信任模型落到两类声明的差异上——为 @types 生态的讨论打底。",
            a: "tsc 产出 .js 和 .d.ts 是同一次编译的两个产物——同一类型内核保证两者一致。而社区手写或维护的 @types 是「对着 JS 实现猜合同」：实现升级了合同没跟上，漂移就发生了。这不是能力问题，是「两份产物是否出自同一双手」的问题。",
          },
          {
            depth: 4,
            q: "「信任不验证」的模型有什么安全阀？",
            intent: "既然不验证，工程上靠什么兜底——考察对整个信任链条的完整把握。",
            a: "四道阀：发布侧用 tsc 产出声明保证自洽；消费侧 skipLibCheck 关掉对合同的审计换性能（同时加深信任）；测试兜运行时的底——类型对了运行时照样可能炸，集成测试不可省；strict 系检查把「你自己的代码符合合同」盯死。信任模型不完美，但每一段都有明确的工程实践在补偿。",
            bonus:
              "更前沿的补法是运行时校验（zod 一类 schema 库）：类型与运行时各有一份描述、互相印证——本质上是在合同和实现之间补一层运行时的审计。",
          },
        ]}
      />

      <MemoryCard keyword=".d.ts 是合同不是实现">
        只描述「有什么」，零运行时代码——OpenAPI 之于 REST，proto 之于 RPC，声明之于 JS。
      </MemoryCard>
      <MemoryCard keyword="信任，不验证" color={PALETTE.orange}>
        文件级名字相邻配对，内容级从不核对——「类型全绿但运行时炸」的根因都在这条性质里。
      </MemoryCard>

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "TS 是怎么找到 npm 包的类型声明的？",
            to: "/note/frontend/engineering/typescript/type-lookup",
            description: "合同有了，查找的管道长什么样——types/typeRoots/@types 的完整水流图。",
          },
          {
            title: "references 和 tsc -b 解决什么？",
            to: "/note/frontend/engineering/typescript/project-references",
            description: "契约墙：声明文件作为跨项目边界的另一个角色。",
          },
        ]}
      />
    </NoteShell>
  );
}
