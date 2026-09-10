import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  Callout,
  CrossRef,
  MemoryCard,
  Prerequisite,
  Timeline,
  VersionNote,
} from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        TS 的大版本是六条性格完全不同的主线：1.x 立项（带标签的 JS）、2.x{" "}
        <strong>类型系统奠基</strong>（strictNullChecks 与条件类型，今天的 TS 从这里开始）、3.x{" "}
        <strong>工程化</strong>（references、import type）、4.x 类型能力巅峰、5.x{" "}
        <strong>现代化与性能</strong>（面向构建管线集成）、6/7 原生化（Go
        重写）。两条贯穿线：语言能力在 4.x 就基本造完，之后全力转向工具链；破坏变更永远走「5.x 废弃
        → 6.0 警告 → 7.0 硬移除」三级火箭。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "前端实际用得到多少 TS 功能？",
            to: "/note/frontend/typescript/basics/ts-feature-surface",
          },
        ]}
      >
        先知道今天的功能地图，再看它是怎么一层层叠出来的——每个你在用的特性都有出生年份。
      </Prerequisite>

      <Timeline
        label="六条时代主线 / eras"
        steps={[
          { label: "1.x 立项", sub: "2012-14 · 带标签的 JS", color: "#9ca3af" },
          { label: "2.x 类型奠基", sub: "strictNullChecks · 条件类型", color: "#8b5cf6" },
          { label: "3.x 工程化", sub: "references · import type", color: "#1677ff" },
          { label: "4.x 类型巅峰", sub: "模板字面量 · satisfies", color: "#f59e0b" },
          { label: "5.x 现代化", sub: "标准装饰器 · 提速", color: "#3fb950" },
          { label: "6→7 原生化", sub: "过渡 · Go 重写", color: "#f85149" },
        ]}
      />

      <Heading level={2} title="2.x：现代 TS 的地基（2016-2018）" />
      <Paragraph>
        这五年决定了今天 TS 的样子。2.0 的 <code>strictNullChecks</code> 是史上最大的单一变更：null
        和 undefined 从「所有类型的合法成员」变成独立类型，JS
        的空值问题第一次能被静态拦截——在此之前整个类型系统对最常见的运行时错误视而不见。同期控制流分析登场：
        <code>if (typeof x === 'string')</code> 之后 x
        自动收窄，静态分析第一次「顺着代码的执行逻辑思考」，而不是孤立地看每一行标注。
      </Paragraph>
      <Paragraph>
        同一时期铺开的还有类型系统的机器底座：2.1 的 keyof 加映射类型给了 <code>Partial</code>/
        <code>Pick</code> 底层机制，2.3 的 <code>strict</code>
        把一堆严格检查打包成一个开关，2.8 的条件类型加 <code>infer</code>{" "}
        让类型系统具备了「模式匹配」能力——这三块拼图日后演化出整个工具类型生态。生态侧，2.0 把
        @types 迁到了 npm：类型分发从此搭上包管理的便车，DefinitelyTyped 的仓库形态让「给 JS
        库补类型」第一次有了规模化分工。TS 从「贴标签的 JS」升级为一门真正的类型系统。
      </Paragraph>

      <Heading level={2} title="3.x：工程化与一个时代的落幕（2018-2020）" />
      <Paragraph>
        3.0 的 project references 与 <code>tsc -b</code> build mode 让大仓库和 monorepo
        可以按依赖图增量构建——你 build script 里那个 <code>-b</code> 就诞生于此。3.0 还有{" "}
        <code>unknown</code>
        顶型。但真正值得记住的是 3.7：<code>?.</code> 和 <code>??</code> 的实现是「TS 抢跑 JS
        语法」时代的尾声——此后官方明确退守
        <strong>类型是主场，JS 语法只跟进 TC39 stage 3</strong>。3.8 的 <code>import type</code>
        则是一步伏笔：为几年后单文件转译器的普及提前铺路。
      </Paragraph>
      <Paragraph>
        工程化不只指仓库结构，也指 tsc 自身的可扩展性：3.4 的 <code>--incremental</code>{" "}
        把上次编译的形状信息存盘复用，大型项目的二次检查从全量重算变成增量追补——「按依赖图构建」（references）与「按时间增量构建」（incremental）在
        3.x 凑齐，tsc 第一次能稳定伺候 monorepo 规模的代码库。
      </Paragraph>

      <Heading level={2} title="4.x：类型能力的巅峰（2020-2022）" />
      <Paragraph>
        4.0 可变元组、4.1 模板字面量类型与递归条件类型（「类型体操」时代的燃料）、4.3 的
        <code>override</code>、4.5 的内联 <code>{"import { type Foo }"}</code>、4.9 的{" "}
        <code>satisfies</code>
        （按目标校验但保留推断——DX 明星特性）。语言能力到顶的标志很直白：从这之后，每个版本的
        release notes 一半是编辑器功能。这不是偷懒——TypeScript 的产品形态本来就是
        <strong>编译器 + 语言服务双面</strong>，语言造完了，重心自然移向消费它的工具。
      </Paragraph>
      <Paragraph>
        巅峰的另一面是成本：模板字面量套递归条件类型的组合威力巨大也极易失控——类型体操的黄金年代与「编译器卡死」「内存爆炸」的事故报告同期出现，4.x
        后半程的 release notes 开始频繁出现性能修复。这条曲线给 5.x
        把重心转向性能与管线集成做了最直接的铺垫。
      </Paragraph>

      <Heading level={2} title="5.x → 7：现代化与原生（2023-）" />
      <Paragraph>
        5.0 换上标准 stage-3 装饰器、正式引入 <code>moduleResolution: "bundler"</code>
        承认打包器语义、内部重写为 ESM 换来提速；5.2 的 <code>using</code> 对齐显式资源管理提案；5.5
        的推断类型谓词让 <code>filter</code> 回调自动收窄；5.6 的{" "}
        <code>noUncheckedSideEffectImports</code>
        继续收紧边界。特征非常一致：
        <strong>不再造新的类型机器，全力转向与现代构建管线的集成和编译性能</strong>。6.0
        则是纯粹的过渡版——最后一个 JS 实现的编译器，内容几乎全是拆除：大范围废弃、默认值向 7
        对齐。7.0 换成 Go 原生二进制，故事翻页（详见下一篇）。
      </Paragraph>
      <Paragraph>
        5.x 还有一条容易被忽视的支线：<code>isolatedDeclarations</code>
        （5.5 实验性）。它约束「声明导出的类型必须显式标注」，让转译器不跑全程序推断也能直接产出
        .d.ts——和 3.8 的 <code>import type</code>{" "}
        遥相呼应，都是为「类型可被单文件工具静态处理」补拼图。语言设计在给工具链让路，这条线贯穿了后半程。
      </Paragraph>

      <Heading level={2} title="破坏如何拆除：三级火箭" />
      <Paragraph>
        TS
        向后兼容记录极佳的秘诀是把破坏集中在大版本、并且提前两级预告：先废弃（警告但可用），再改默认（给缓冲阀），最后硬移除。你的升级动作因此有章可循——读官方
        breaking changes、按废弃清单提前清理，而不是等构建炸了再查。
      </Paragraph>
      <Paragraph>
        这套机制的成本是<strong>版本节奏被拆除任务占满</strong>：每个破坏都要提前两个版本预告，6.0
        「几乎没有新功能」正是代价本身。换来的收益是升级路径永远有据可查——废弃警告本身就是迁移清单，生态可以在缓冲期内分批消化，而不是被一次大版本集体冲垮。
      </Paragraph>
      <VersionNote
        label="同一选项的三段命运 / deprecation ladder"
        versions={[
          { range: "TS 5.x", text: "进入废弃名单：仍可用，文档标记弃用", color: "#9ca3af" },
          {
            range: "6.0",
            text: '改默认值并发出警告，ignoreDeprecations: "6.0" 可临时缓冲',
            color: "#f59e0b",
          },
          { range: "7.0", text: "硬移除：写了直接报错，缓冲阀失效", color: "#f85149" },
        ]}
      />
      <Callout kind="warning" title="三个升级误区">
        ① 以为 minor 版本只有修 bug——<strong>裁判型依赖的 minor 也可能新增检查</strong>，lockfile
        锁死才稳；② 以为废弃就能立刻删用法——6.0 的缓冲阀就是给存量代码留的时间窗；③ 拿二手 changelog
        当真——「baseUrl 被移除」这类传闻要以自己仓库 <code>tsc -b --dry</code> 实测为准。
      </Callout>

      <QAChain
        intro="五问沿时代线递进：从最大的单一变更，到转折点，再到拆除机制与产品形态。"
        items={[
          {
            depth: 2,
            q: "为什么说 strictNullChecks 是史上最大的单一变更？",
            intent: "考察对「这版之前 TS 在防什么」的理解——很多人以为它只是个开关。",
            a: "因为它改变了 null 和 undefined 的类型地位：从「所有类型的合法成员」变成独立类型。在此之前整个类型系统对 JS 里最常见的运行时错误（空值）视而不见；在此之后，忘记判空在编译期就报错。",
            bonus:
              "控制流分析同期进场：if 里 typeof 收窄之后，TS 开始「顺着执行逻辑思考」而不是孤立地看每行标注——这是 narrowing 的起点。",
          },
          {
            depth: 3,
            q: "3.7 版本为什么是历史转折点？",
            intent: "考察版本史背后的产品策略转向——背过 release notes 的人答不出这层。",
            a: "3.7 实现了尚未定案的 ?. 和 ??，是「TS 抢跑 JS 语法」时代的尾声。此后官方明确策略：类型是主场，JS 语法只跟进 TC39 stage 3——不再用编译器替标准委员会做实验。",
            bonus:
              "3.8 的 import type 是同期的伏笔：它为「类型可被静态识别并擦除」提供了显式语法，几年后单文件转译器普及，这个先见之明兑现了。",
          },
          {
            depth: 3,
            q: "条件类型加 infer 到底解决了什么问题？",
            intent: "区分「背语法」和「懂动机」——infer 是 2.x 类型机器的最后一块拼图。",
            a: "给类型做模式匹配：T extends Array<infer U> ? U : never 让你能从既有类型里「提取」感兴趣的部分。没有它，映射类型只能变换已知结构，无法对未知形状做逆向推导——Promise 的返回值类型、函数参数类型都提不出来。",
          },
          {
            depth: 4,
            q: "6.0 这种「几乎没新功能」的版本，存在的意义是什么？",
            intent: "考察对三级火箭拆除机制的理解——以及「过渡版」这种工程手段的价值。",
            a: "为 7.0 扫清障碍：6.0 把大范围废弃落地、把默认值向 7 对齐、用 ignoreDeprecations 提供缓冲。等 7.0 硬移除时，受影响的存量项目已经在 6.0 阶段收到过警告——破坏是预告过的，不是突袭的。",
          },
          {
            depth: 4,
            q: "为什么近几年的 release notes 一半是编辑器功能？",
            intent: "检验是否理解 TS 的产品形态——答「不务正业」的人把编译器和语言服务混为一谈了。",
            a: "因为 TypeScript 的产品形态本来就是编译器加语言服务双面：语言能力在 4.x 基本造完，之后的性能优化、诊断改进、quick fix 全部落在消费类型的编辑器体验上。看 release notes 的构成变化，能看到产品重心的迁移。",
            bonus:
              "这也解释了为什么 5.x 的主线是「与构建管线集成」：moduleResolution bundler、ESM 内部重写、isolatedDeclarations——全是在为「类型系统如何嵌入现代工具链」服务。",
          },
        ]}
      />

      <MemoryCard keyword="现代 TS 始于 2.x">
        strictNullChecks、控制流分析、条件类型——今天写代码的每一刻都踩在 2.x 的地基上。
      </MemoryCard>
      <MemoryCard keyword="类型主场，语法跟 stage 3" color="#8b5cf6">
        3.7 之后 TS 不再抢跑 JS 语法：它是类型系统，不是预言机。破坏走「废弃→警告→硬移除」三级火箭。
      </MemoryCard>

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "TypeScript 7 原生化改变了什么？",
            to: "/note/frontend/engineering/typescript/ts-native-compiler",
            description: "六条主线的终点：Go 重写、平台二进制、启动链实测——原生时代的三角色格局。",
          },
          {
            title: "编辑器和构建的类型检查为什么会不一致？",
            to: "/note/frontend/engineering/typescript/ts-version-drift",
            description: "版本史的现实后果：多份 TS 并存时的漂移机理与声明式统一。",
          },
        ]}
      />
    </NoteShell>
  );
}
