import { SequenceDiagram } from "@/components/viz/SequenceDiagram";
import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  SpecQuote,
  Table,
  VersionNote,
} from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        你在编辑器里看到的一切 TS 智能——红线、补全、跳转、重构——来自一个独立进程：
        <strong>tsserver</strong>。官方 Wiki 的定义一句话说透：「封装了 TypeScript
        编译器与语言服务、通过 JSON 协议暴露它们的 node
        可执行文件」。编辑器把文件生命周期（open/change/close，未保存也算）推给它，它在内存里按
        tsconfig 构建一次常驻的 program，之后所有查询增量应答。
        <strong>它不产出任何文件、不参与构建</strong>——这是理解编辑器行为与构建行为差异的钥匙。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "TypeScript 在工程里到底扮演什么角色？",
            to: "/note/frontend/engineering/typescript/ts-roles",
          },
        ]}
      >
        本篇展开三角色模型中的第二角色：类型内核的「常驻实时查询」形态。
      </Prerequisite>

      <SpecQuote source="TypeScript 官方 Wiki · Standalone Server (tsserver)">
        a node executable that encapsulates the TypeScript compiler and language services, and
        exposes them through a JSON protocol.
      </SpecQuote>

      <Heading level={2} title="一次补全的完整旅程" />
      <Paragraph>
        编辑器与 tsserver 的关系不是「插件调函数」，而是两个进程之间的协议对话。VSCode 的内置扩展
        typescript-language-features 启动 tsserver 进程，之后每一次按键背后都是一轮请求-响应：
      </Paragraph>
      <SequenceDiagram
        label="编辑器 ↔ tsserver / json-rpc over stdio"
        actors={["编辑器", "tsserver 进程"]}
        messages={[
          {
            from: "编辑器",
            to: "tsserver 进程",
            label: "open：推入文件内容（未保存也算）",
            color: "#1677ff",
          },
          {
            from: "tsserver 进程",
            to: "编辑器",
            label: "构建/增量更新内存中的 program",
            color: "#9ca3af",
            dashed: true,
          },
          { from: "编辑器", to: "tsserver 进程", label: "geterr：请求诊断", color: "#f59e0b" },
          {
            from: "tsserver 进程",
            to: "编辑器",
            label: "semanticDiag：语义诊断事件 → 红线",
            color: "#f85149",
            dashed: true,
          },
          {
            from: "编辑器",
            to: "tsserver 进程",
            label: "completions / definition / quickinfo",
            color: "#8b5cf6",
          },
          {
            from: "tsserver 进程",
            to: "编辑器",
            label: "候选列表 / 目标位置 / 类型签名",
            color: "#3fb950",
            dashed: true,
          },
        ]}
      />
      <Paragraph>
        三个关键性质藏在这张图里。第一，<strong>未保存的缓冲区内容也算数</strong>
        ——编辑器推的是你正在打字的文本，所以红线跟着打字实时变。第二，协议是 TS 自定义的
        JSON-RPC（请求带 seq 序号、响应带长度头，走 stdin/stdout），<strong>不是标准 LSP</strong>
        ——LSP 是微软后来为通用化发明的，TS 直到 7.0 才换。第三，geterr
        这类命令可以分步执行——打开大项目时红线「转一会儿」才出来，就是首次全量构建 program 的成本。
      </Paragraph>

      <Heading level={2} title="功能从哪来：一切来自那次 program" />
      <Paragraph>
        tsserver 启动后按 tsconfig 构建一个
        program：解析整个模块图、加载全部声明文件、跑类型检查器。之后它做的每件事都是这次 program
        上的查询——功能不是魔法，是同一份类型内核不同角度的投影：
      </Paragraph>
      <Table
        label="功能按数据来源分组 / where features come from"
        head={["数据来源", "典型功能"]}
        rows={[
          ["类型检查器", "语义红线、hover 类型签名、收窄后的智能提示"],
          ["模块解析器", "补全候选、auto-import 路径生成、跳进 node_modules 的类型"],
          ["符号表 / 引用图", "跳转定义与实现、Find All References、跨文件安全重命名"],
          [
            "重构引擎",
            "extract function/const、organize imports、quick fix（补 await、转 import type）",
          ],
          ["语法层（不查类型）", "语法诊断、大纲与折叠、语义高亮"],
        ]}
      />
      <Paragraph>
        理解了「功能即查询」，重命名为什么能跨文件安全就不神秘：它查的是 program
        的引用图，改的是所有引用点的符号，而不是文本替换——后者只有编辑器字面搜索的能力，遇到同名局部变量立刻出错。
      </Paragraph>

      <Heading level={2} title="三类项目：你的文件归谁管" />
      <Paragraph>
        tsserver 内部把文件划归三类项目，优先级 configured &gt; external &gt;
        inferred。这个模型直接解释了「编辑器和构建的类型检查为什么会不一致？」一篇讲的推断项目漂移：
      </Paragraph>
      <CompareTable
        label="configured vs inferred / project kinds"
        left={{ title: "Configured Project", color: "#3fb950" }}
        right={{ title: "Inferred Project", color: "#f85149" }}
        rows={[
          {
            aspect: "由谁定义",
            left: "tsconfig.json / jsconfig.json 声明",
            right: "tsserver 为游离文件自建",
          },
          { aspect: "编译选项", left: "你 tsconfig 里写的", right: "默认选项（宿主可改）" },
          {
            aspect: "文件范围",
            left: "include/files 圈定的",
            right: "散文件 + 三斜线引用 + 模块导入连带",
          },
          {
            aspect: "与 tsc -b 的关系",
            left: "同一套配置，结论趋同",
            right: "tsc 根本不查这些文件——漂移源头",
          },
        ]}
      />
      <Paragraph>
        散文件一旦被新出现的 tsconfig
        覆盖，会自动脱离推断项目；推断项目若是「根文件构成」的，还会整个销毁重建。所以「include
        写全、别留游离文件」不只是构建洁癖，是编辑器结论可靠性的前提。
      </Paragraph>

      <Heading level={2} title="插件、同源与协议变迁" />
      <Paragraph>
        tsconfig 的 <code>plugins</code> 字段可以往 tsserver 里注入增强插件（styled-components
        补全、css-modules 跳转一类），但插件<strong>只能增强已有文件类型的体验</strong>
        ，不能让服务认识新文件类型——这就是 .vue 必须由 Volar 整体接管 tsserver
        的原因。另一边，IDEA/WebStorm 的 TS 智能同理：JetBrains
        内嵌同一套语言服务（可选拖捆绑版或项目版），自己只做 UI 接线和索引层叠加。所以两家 IDE
        的「智能差异」是版本、配置与呈现，<strong>不是两套类型判断</strong>。
      </Paragraph>
      <Paragraph>
        把「同源」再往下挖一层：tsserver 与 tsc 不止读同一份 tsconfig，它们 import
        的是同一个包里的同一个类型内核——所以「编辑器结论」与「构建结论」的分歧永远不可能来自算法本身，只可能来自版本与项目归属这些
        <strong>输入差异</strong>。协议变迁的逻辑同理：TS 自定义 JSON 协议把语言服务绑在「对接
        VSCode 内置扩展」这一种宿主上，LSP 则把同一份智能开放给所有编辑器——变的只是传输层， program
        的构建方式与「功能即查询」的模型原样继承。理解了这一点，TS 7 换协议就不是「推倒重来」，
        而是同一内核换了一条更通用的出线口。
      </Paragraph>
      <VersionNote
        label="协议变迁 / wire protocol"
        note="协议通用化的代价：依赖旧 tsserver 插件生态的工具需要适配期。"
        versions={[
          {
            range: "TS ≤ 6.x",
            text: "自定义 JSON 协议走 stdin/stdout，VSCode 内置扩展专属对接",
            color: "#1677ff",
          },
          {
            range: "TS 7.0+",
            text: "原生语言服务改用标准 LSP——Neovim、Zed 等任意 LSP 编辑器同等受益",
            color: "#3fb950",
          },
        ]}
      />

      <Heading level={2} title="日常玄学三连" />
      <DoDont
        label="首次打开红线转半天 / first program build"
        dont={{
          code: `# 红线还没出来 → 删依赖重装
rm -rf node_modules && pnpm install`,
          note: "首次全量构建 program 是固有成本，重装只是把同一笔成本重新付一遍",
        }}
        do={{
          code: `// 等首次 geterr 跑完（状态栏有语言服务活动指示）
// 之后所有查询走增量应答`,
          note: "一次全量、此后增量——大项目冷启动的固定门票，不是卡死",
        }}
      />
      <DoDont
        label="红线失灵时 / restart the right thing"
        dont={{ code: "重启整个 VSCode", note: "重建成本高，还会丢工作区状态——杀鸡用牛刀" }}
        do={{
          code: "TypeScript: Restart TS Server",
          note: "只重建语言服务进程与 program，几秒完成，玄学红线的第一处置动作",
        }}
      />
      <DoDont
        label="auto-import 路径发歪 / fix resolution, not imports"
        dont={{
          code: `// 生成的导入路径很怪 → 逐个手动改
import { a } from "../../../src/utils/a";`,
          note: "生成路径歪说明解析配置错了——手改只修这一个文件，下一次 auto-import 继续歪",
        }}
        do={{
          code: `// 回配置层：核对 paths 与文件的项目归属
"paths": { "@/*": ["./src/*"] }`,
          note: "auto-import 按当前 project 的解析规则生成导入路径——配置对了，路径自然和打包器一致",
        }}
      />

      <QAChain
        intro="五问从进程模型挖到协议变迁：每答都建立在「功能即查询」这一个抽象上。"
        items={[
          {
            depth: 2,
            q: "红色波浪线是谁画的？",
            intent: "热身：确认「红线来自语言服务而非构建工具」这个第一性认知。",
            a: "tsserver。编辑器启动的独立语言服务进程，在内存里对项目做常驻增量编译，把语义诊断（semanticDiag 事件）推回编辑器渲染成红线。它不产出文件、不参与构建。",
          },
          {
            depth: 3,
            q: "为什么没保存的文件也有红线和补全？",
            intent: "考察对「编辑器推送的是缓冲区」的理解——这决定了红线是实时的。",
            a: "因为编辑器通过 open/change 请求把缓冲区当前内容推给 tsserver，未保存也算。语言服务是基于你正在打字的文本做分析，不是基于磁盘文件——所以红线跟打字实时变，保存动作对它无意义。",
          },
          {
            depth: 3,
            q: "auto-import 怎么知道全项目有哪些候选？",
            intent: "用具体功能反推 program 的信息结构——补全不是字符串搜索。",
            a: "来自 program 的模块图加符号表：tsserver 知道项目里所有可导入的模块及其导出符号，补全请求时按上下文过滤排序，再由模块解析器生成符合 tsconfig paths 约定的导入路径。所以 paths 配错时，auto-import 生成的路径也是歪的。",
          },
          {
            depth: 4,
            q: "跨文件安全重命名，为什么「全局查找替换」做不到？",
            intent: "区分「符号级操作」与「文本级操作」——这是语言服务价值的核心例证。",
            a: "重命名走的是 program 的引用图：先解析出符号的所有真实引用点（含 import、导出、类型位置），逐一改写；同名但不同作用域的符号不会误伤。全局替换是文本操作，遇到注释、字符串、同名局部变量立刻出错。",
            bonus:
              "Find All References 同理——它数的是引用图里的边，不是 grep 的命中数。面试里讲清这个区别，能直接证明你理解语言服务和文本工具的分界。",
          },
          {
            depth: 4,
            q: "TS 7 换 LSP 后，谁受益谁阵痛？",
            intent:
              "协议变迁背后的生态再分配——考察你是否把 tsserver 协议当成历史产物而非永恒真理。",
            a: "受益的是所有 LSP 编辑器：Neovim、Zed 不再需要第三方适配就能获得 TS 智能——因为原生服务说标准协议。阵痛的是绑定旧协议的生态：tsserver 插件和深度对接 VSCode 内置扩展的工具需要适配期，TS 7.0 暂无稳定编程 API 加剧了这一点。",
          },
        ]}
      />

      <MemoryCard keyword="tsserver = JSON 协议封装的编译器">
        官方定义背下来：封装编译器与语言服务、经 JSON 协议暴露的 node
        可执行文件——进程独立、stdin/stdout、不产文件。
      </MemoryCard>
      <MemoryCard keyword="一切功能来自常驻 program" color="#8b5cf6">
        红线、补全、跳转、重命名全是同一次内存编译上的查询——语言服务的功能不是魔法，是投影。
      </MemoryCard>

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "编辑器和构建的类型检查为什么会不一致？",
            to: "/note/frontend/engineering/typescript/ts-version-drift",
            description: "推断项目只是漂移的一半——版本错位的机理与声明式统一在治理篇。",
          },
          {
            title: "tsconfig 的一份配置到底谁在读？",
            to: "/note/frontend/engineering/typescript/tsconfig-readers",
            description: "tsserver 全读 tsconfig，转译器只读投影——一份配置三类读者的完整地图。",
          },
        ]}
      />
    </NoteShell>
  );
}
