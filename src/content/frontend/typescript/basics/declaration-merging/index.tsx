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
} from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        声明合并是 TypeScript 对同名顶层声明的处理规则，按声明的种类分两类结局：
        <strong>
          interface 与 interface、namespace 与 namespace 同名时自动合并（加法），type
          别名、变量、class 这些「值与别名」同名时直接报错
        </strong>
        。掌握它能解锁两个核心能力：扩展内置类型 （Window、ImportMetaEnv——所以扩展必须用 interface
        而非 type），以及理解 <code>declare module</code> 的双语义——
        <strong>在脚本文件里是整体覆盖，在模块文件里是补丁增强</strong>。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "为什么没有 import/export 的文件就是全局的？",
            to: "/note/frontend/typescript/basics/scope-script-vs-module",
          },
        ]}
      >
        合并发生在哪个作用域，取决于声明所在的文件是脚本还是模块——先弄清作用域判定，再看撞名后的规则。
      </Prerequisite>

      <Heading level={2} title="同名声明的四种结局" />

      <Paragraph>
        两个同名声明撞在同一作用域（通常是全局）时，TypeScript 不做「后来者覆盖」—— 它先看声明的
        <strong>种类</strong>。interface 之间、namespace 之间是加法合并， 后声明把成员并入前者；type
        别名没有合并行为，第二次声明同名的 type 直接报 Duplicate identifier；变量、函数、class
        这些「值」层面同理，同名即冲突。 唯一的横向组合是 namespace 可以给 class 追加静态成员——因为
        class 的构造函数本质是个值， 而 namespace 正是往值上挂成员的容器。
      </Paragraph>

      <Table
        label="同名处理速查 / same-name outcomes"
        head={["同名声明组合", "结局", "说明"]}
        rows={[
          ["interface + interface", "合并", "成员并入同一接口；同名成员类型必须一致，否则报错"],
          ["namespace + namespace", "合并", "成员互相挂载，是给已有类型扩展成员的主要途径之一"],
          ["namespace + class", "合并", "namespace 往 class 上追加静态成员与嵌套类型"],
          ["type + type", "冲突报错", "type 别名没有合并行为，Duplicate identifier"],
          ["const/let + 同名值", "冲突报错", "值层面同名不合并"],
          ["interface + type 别名", "冲突报错", "type 声明的存在阻止合并"],
        ]}
      />

      <Paragraph>
        「同名成员类型必须一致」是合并唯一的冲突检查：<code>interface Window</code> 被声明两次、
        都带 <code>myApi: string</code>，完全合法；一处 string 一处 number 则报错——后续声明必须与
        先前的成员类型一致。这条规则决定了扩展内置类型的工程约定：
        <strong>永远用 interface 而不是 type 去扩展 Window、ImportMetaEnv、ProcessEnv</strong>
        ，因为只有 interface 能与 lib 里的内置声明合并，type 只会撞死。
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`// lib.dom.d.ts 里已有 interface Window { addEventListener(...): void; ... }

// 你的 global.d.ts（脚本式，声明进全局）
interface Window {
  myApi: string;
}
// 合并结果：内置成员 + myApi 都在 —— window.myApi ✅

// 反例：type 撞不上这趟车
type ImportMetaEnv = { VITE_X: string }; // ❌ 与内置 ImportMetaEnv 冲突报错
// （正确姿势见下文：interface ImportMetaEnv 合并扩展）`}
      />

      <MemoryCard keyword="扩展内置类型必须用 interface">
        interface 同名是加法合并，type 同名是冲突报错——Window / ImportMetaEnv / ProcessEnv
        的扩展姿势全由这条规则决定。
      </MemoryCard>

      <Heading level={2} title="declare module 的双语义：覆盖 vs 增强" />

      <Paragraph>
        <code>declare module "x"</code> 是声明合并体系里最反直觉的一个：同一个语法，
        在脚本文件和模块文件里语义完全不同。判定的分水岭仍是上一章的规则——
        <strong>文件是脚本还是模块</strong>。
      </Paragraph>

      <CompareTable
        label="declare module 双语义 / override vs augment"
        left={{ title: "脚本文件里 → 整体覆盖", color: PALETTE.orange }}
        right={{ title: "模块文件里 → 补丁增强", color: PALETTE.blue }}
        rows={[
          {
            aspect: "文件形态",
            left: "无顶层 import/export 的 .d.ts",
            right: "有顶层 import/export 的 .ts/.d.ts",
          },
          {
            aspect: "语义",
            left: "替换该模块已有的全部类型声明",
            right: "与已有声明合并，只能补丁现有导出的类型",
          },
          {
            aspect: "典型用途",
            left: "给无类型的第三方包糊一份声明（或整个标 any）",
            right: "给有类型的库扩展配置项、追加成员",
          },
          {
            aspect: "限制",
            left: "无——你说模块是什么样就是什么样",
            right: "不能新增顶层导出，只能修补已有声明",
          },
        ]}
      />

      <Paragraph>
        覆盖语义是「给没有类型的包补合同」的标准姿势：脚本式 .d.ts 里写{" "}
        <code>declare module "legacy-pkg"</code>，TS 就把这份声明当作该包类型的全部——
        哪怕包里真有类型，你的声明也整个取代它。增强语义则温和得多：模块文件里对{" "}
        <code>declare module "some-pkg"</code> 的书写只会与包的已有类型做 interface/namespace
        合并，官方文档明确限制 augmentation 不能新增顶层声明，只能给现有声明打补丁。
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`// 覆盖：脚本式 .d.ts（无 import/export）
declare module "legacy-pkg" {
  const anything: any;
  export default anything;
}

// 增强：模块文件（有 import/export）
import "some-pkg";
declare module "some-pkg" {
  interface Options {
    newOption?: string; // 补丁：并入包已有的 Options 接口
  }
}
export {}; // 维持模块形态`}
      />

      <Callout kind="warning" title="写之前先确认自己在哪个文件里">
        同一个 <code>declare module</code>，从脚本文件挪进模块文件（比如顺手加了个 import），
        语义就从覆盖滑成增强——如果包本来无类型，「增强一个不存在的声明」会直接报错；
        反过来把增强写进脚本文件，则会把包的官方类型整个覆盖掉而不自知。语法不动，语义随文件形态漂移。
      </Callout>

      <Heading level={2} title="declare global：模块文件里的全局注入" />

      <Paragraph>
        模块文件的顶层声明被锁在局部，那模块里还想扩展全局怎么办？答案是 <code>declare global</code>{" "}
        块——显式声明「接下来的内容进全局作用域」，进去之后再走普通的全局合并规则。
        它和脚本式的区别只是入口：脚本天然全局，模块需要这个仪式性的门。
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`// vite-env.d.ts 的实战形态（脚本式，无需 declare global）
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string; // 与 vite/client 的同名接口合并
}

// 模块文件里的等价操作：必须 declare global
import type { SomeType } from "./some-type";

declare global {
  interface Window {
    __FOO__?: SomeType; // 进全局，与 lib.dom 的 Window 合并
  }
}

export {}; // 维持模块形态`}
      />

      <DoDont
        label="模块里扩展全局 / declare global"
        dont={{
          code: `// 模块文件里直接写
interface Window {
  __FOO__?: SomeType;
}`,
          note: "有顶层 import 的文件里这是局部接口，与 DOM 的 Window 毫无关系——扩展静默失效，不报错",
        }}
        do={{
          code: `declare global {
  interface Window {
    __FOO__?: SomeType;
  }
}`,
          note: "declare global 显式声明注入全局，之后走正常 interface 合并",
        }}
      />

      <Paragraph>
        把两章串起来就是完整的心智模型：
        <strong>作用域判定决定声明落在哪个作用域，声明合并决定 同名声明在作用域内如何相处</strong>
        。全局合并是加法 interface 的主场（扩展内置类型）， 模块内合并是 declare module
        增强的主场（扩展第三方包），而 declare global
        是两者之间的桥。遇到「类型不生效」，先问文件是脚本还是模块，再问撞名的是 interface 还是
        type。
      </Paragraph>

      <Heading level={2} title="追问链：合并机制的深水区" />

      <QAChain
        intro="五问从合并规则挖到工程决策：每一个「为什么用 interface」背后都是同一套机制。"
        items={[
          {
            depth: 2,
            q: "两个同名全局 interface 声明，TypeScript 怎么处理？",
            intent: "热身：确认加法合并这个基本事实——很多人以为和 JS 变量一样后来者覆盖。",
            a: "合并。两个声明的成员并入同一个接口，全项目看见的是合并结果。唯一的冲突条件是同名成员类型不一致（一处 string 一处 number 会报错），类型完全相同的重复成员则合法。",
          },
          {
            depth: 3,
            q: "为什么扩展 Window、ImportMetaEnv 这类内置类型必须用 interface，用 type 就不行？",
            intent:
              "考察能否从合并规则反推工程约定——「社区都这么写」和「机制决定了只能这么写」是两个层次。",
            a: "因为只有 interface 有同名合并行为。内置类型在 lib 声明里全是 interface，你的全局 interface 与它合并，成员并列生效；而 type 同名直接 Duplicate identifier 报错，根本无法与已有声明共存。这不是风格偏好，是语言机制的单行道。",
            bonus:
              "namespace 也能与同名 interface 合并（namespace 是「类型+值+命名空间」三位一体的容器），一些库用 namespace 挂静态常量、interface 描述实例形状的组合拳。",
          },
          {
            depth: 3,
            q: "declare module 在脚本文件和模块文件里的行为差异，具体差在哪？",
            intent: "本篇最反直觉的点。确认是否掌握「语法相同、语义随文件形态漂移」这条主线。",
            a: "脚本文件里是整体覆盖：你的声明取代该包全部已有类型，适合给无类型包糊合同。模块文件里是补丁增强：与包已有声明做合并，只能修补现有导出的类型、不能新增顶层导出。分水岭就是文件顶层有没有 import/export。",
          },
          {
            depth: 4,
            q: "declare global 和脚本式全局文件，两种注入方式怎么选？",
            intent: "把知识点落到工程决策——考察能否按声明内容的归属来分配文件形态。",
            a: "按内容归属分：与某个具体模块绑定的扩展（用了该模块类型的 declare global、给第三方包补丁）放模块文件，靠 import 保证类型依赖明确、随用随有；与项目绑定的纯全局扩展（ImportMetaEnv、无依赖的 Window 字段）放脚本式 .d.ts，收录即生效。没有硬性禁令，但模块化方案的可追溯性更好——搜索 import 就能找到扩展的来源。",
            bonus:
              "declare global 还有一个脚本文件给不了的独特能力：库作者可以在发布的模块里附带全局扩展（如 @types/react 的 JSX 命名空间增强），随安装自动生效——脚本式文件做不到「随包分发」。",
          },
          {
            depth: 4,
            q: "模块增强（augmentation）为什么禁止新增顶层导出？这个限制保护了什么？",
            intent: "从规则挖到设计动机——「不许新增」不是能力不足，是对模块公共契约完整性的保护。",
            a: "模块的导出面是发布者定义的公共契约，增强机制的设计目的只是「让消费者补丁类型缺口」（比如库漏了一个配置项），不是「让任何人改写模块的公共 API」。允许新增导出意味着任何消费者的声明文件都能给 npm 包凭空造 API——类型系统会放行调用这些实际不存在的导出，运行时必然炸。禁止新增把增强约束在「修补」的安全边界内。",
            bonus:
              "patch 缺口也要谨慎：如果后续版本库自己补上了同名成员且类型不同，合并冲突会让消费方构建挂掉——增强实际上是对上游契约的一笔隐式赌注。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "TS 是怎么找到 npm 包的类型声明的？",
            to: "/note/frontend/engineering/typescript/type-lookup",
            description:
              "合并发生在「找到之后」——先看看查找管道：types 白名单与 @types 生态的完整水流图。",
          },
          {
            title: "tsconfig 的一份配置到底谁在读？",
            to: "/note/frontend/engineering/typescript/tsconfig-readers",
            description: "include 之外，types/skipLibCheck 这些旋钮分别被谁拧动。",
          },
        ]}
      />
    </NoteShell>
  );
}
