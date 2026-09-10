import { CodeAnnotate, FlowChart } from "@/components/demo";
import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { Callout, CrossRef, DoDont, MemoryCard, Prerequisite, Table } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        编辑器（tsserver）和构建（tsc -b）是<strong>同一个类型内核的两种运行形态</strong>
        ，它们结论漂移的来源只有两个：
        <strong>版本不一致</strong>（编辑器默认用自带 TS，构建用 node_modules 里的）和{" "}
        <strong>推断项目</strong>
        （include 外的散文件被 tsserver 自建临时项目检查）。治理手法是声明式统一：package.json 声明
        → lockfile 锁死 → node_modules 落地，编辑器侧用 <code>typescript.tsdk</code>
        指路（首次需一次性授权），IDEA 则默认自动探测。版本对了，两边结论天然趋同。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "TypeScript 在工程里到底扮演什么角色？",
            to: "/note/frontend/engineering/typescript/ts-roles",
          },
        ]}
      >
        「tsserver 与 tsc 是同一内核的实时查询与跑批」是本篇的前提——漂移是主从延迟，不是两个真理。
      </Prerequisite>

      <Heading level={2} title="一个项目里的多份 TS" />
      <Paragraph>
        典型项目里 TS 不止一份。盘点一下你在用的副本：<strong>node_modules/typescript</strong>
        （package.json 声明、lockfile 锁定的那份，tsc -b 和当库用的工具都找它）；
        <strong>编辑器内置版</strong>（VSCode 随编辑器发布一份
        TS，语言服务默认用它，跟你装了哪版无关）；可能还有<strong>全局安装的残留</strong>（
        <code>npm i -g typescript</code> 的老习惯产物）。「各种版本的 TS
        对开发环境有什么影响」的答案主体就在这：版本错位 = 编辑器结论与构建结论漂移。
      </Paragraph>
      <Paragraph>
        漂移的具体表现有两个方向：编辑器用旧版、构建用新版——新版本的检查更严、新语法支持更多，于是「编辑器全绿、CI
        红一片」；反过来则是「编辑器画的红线构建根本不认」。两边读的是同一份
        tsconfig，理论上结论趋同，唯一的变量就是内核版本不同。
      </Paragraph>

      <Heading level={2} title="统一链条：把裁判锚到 lockfile" />
      <Paragraph>
        声明式统一的思路和你工具链里 mise
        的哲学同构：声明一份来源，所有读者都对齐它。构建侧天然统一——CI 装依赖后跑的 tsc 就是
        node_modules 里那份；要统一的只有编辑器侧：
      </Paragraph>
      <FlowChart
        label="版本单一事实源 / single source"
        data={{
          direction: "TB",
          nodes: [
            { id: "pkg", label: "package.json 声明 ^7.0.2", color: "#9ca3af" },
            { id: "lock", label: "pnpm-lock.yaml 锁死 7.0.2", color: "#1677ff" },
            { id: "nm", label: "node_modules/typescript", color: "#f59e0b" },
            { id: "ci", label: "tsc -b / CI 门禁", color: "#3fb950" },
            { id: "vsc", label: "VSCode（tsdk 指路 + 一次授权）", color: "#8b5cf6" },
            { id: "idea", label: "IDEA（默认自动探测）", color: "#8b5cf6" },
          ],
          edges: [
            { source: "pkg", target: "lock", label: "install" },
            { source: "lock", target: "nm", label: "物化" },
            { source: "nm", target: "ci" },
            { source: "nm", target: "vsc" },
            { source: "nm", target: "idea" },
          ],
        }}
      />
      <Paragraph>
        VSCode 侧提交一个文件就完成全团队统一；IDEA 侧什么都不用做——它的语言服务默认自动探测项目的
        node_modules/typescript，有项目包时自动优先使用，没有才回退内置捆绑版。两家的机制差异很大，但路的尽头是同一个事实源：
      </Paragraph>
      <CodeAnnotate
        lang="javascript"
        code={`// .vscode/settings.json —— 提交进仓库
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "javascript.tsdk": "node_modules/typescript/lib",
  "javascript.enablePromptUseWorkspaceTsdk": true
}`}
        annotations={[
          {
            line: 3,
            text: "tsdk：声明语言服务该用哪份 TS（相对路径、指向 lib 目录）——「Use Workspace Version」的持久化形态",
          },
          {
            line: 4,
            text: "首次打开项目时弹一次授权提示；点一次允许后永久生效，授权记录存本机不进仓库——每位成员各点一次",
          },
          {
            line: 5,
            text: "javascript 同款：混着写 .js 的项目里，JS 语言服务同样要对齐版本",
          },
        ]}
      />
      <Callout kind="warning" title="为什么要弹一次授权，而不是静默生效？">
        tsdk 指向的是 node_modules
        里的代码，语言服务会以进程方式加载执行它——仓库声明的版本等于「这个仓库要求你运行它的代码」。VSCode
        要求用户显式信任一次，这是供应链的信任边界：<strong>声明 ≠ 授权</strong>。授权记录存本机
        workspaceStorage，所以每人首次打开都要点一下。
      </Callout>
      <Paragraph>
        手动入口也值得知道：命令面板 <code>TypeScript: Select TypeScript Version</code>
        可以随时切换——但它是<strong>上下文敏感的</strong>，必须先打开一个 .ts/.tsx/.js
        文件它才出现在面板里；也可以直接点底部状态栏的 TS 版本号。配置好 tsdk
        之后，这个菜单基本就不需要了。
      </Paragraph>

      <Heading level={2} title="兼容六轴：升级时两边怎么错开" />
      <Paragraph>
        版本不一致之所以危险，是因为 TS
        的兼容性不是一根轴，是六根——每根轴上「编辑器旧、构建新」或反向都会产生不同的症状：
      </Paragraph>
      <Table
        label="兼容六轴 / compat axes"
        head={["轴", "方向", "典型表现"]}
        rows={[
          [
            "新编译器读旧代码",
            "向后（最好）",
            "破坏集中大版本，且走「废弃→警告→硬移除」三级火箭提前预告",
          ],
          [
            "旧编译器读新代码/@types",
            "向前（必然差）",
            "@types 包用新语法写声明，老 tsc 直接在 .d.ts 里报 syntax error",
          ],
          [
            "lib.d.ts 隐式 API 面",
            "随版本变",
            "DOM 声明更新后与你 declare global 的同名成员打架——升级后「奇怪的全局错误」头号来源",
          ],
          [
            "target/lib 与运行时",
            "语法降级",
            "TS 只降语法不补 API（Promise 类型给了，老浏览器运行时没有，polyfill 另请）",
          ],
          [
            "tsconfig 严格校验",
            "无前向兼容",
            "未知 compiler option 直接报错——内置老 TS 的编辑器打开新 tsconfig 画红线",
          ],
          [
            "语言兼容 ≠ API 兼容",
            "TS 7 特有",
            "代码语义兼容，但 import typescript 当库用的工具断供（vue-tsc / ts-morph / Next 检测）",
          ],
        ]}
      />

      <Heading level={2} title="推断项目：第二个漂移源" />
      <Paragraph>
        就算版本完全统一，还有第二个结构性漂移源：tsserver 对
        <strong>不在任何 tsconfig include 范围里的散文件</strong>，会自建一个「推断项目」（inferred
        project）——用默认编译选项按引用连带收集检查，而 <code>tsc -b</code> 对 include
        外的文件根本不查。选项不同，同一个文件的结论就可能不同。它的项目模型、三类项目的优先级与销毁重建行为，在「
        编辑器的 TS 智能是怎么来的？」一篇有完整拆解；本篇只记治理结论：
        <strong>include 写全，别留散文件</strong>。
      </Paragraph>

      <Heading level={2} title="高频误判" />
      <DoDont
        label="同一份配置 ≠ 同一个结论 / one config, two kernels"
        dont={{
          code: `编辑器（内置 TS 6）─┐
                     ├─ 读同一份 tsconfig → 结论漂移
CI（node_modules 7）─┘`,
          note: "配置相同、内核不同——检查语义随内核版本走，同一份 strict 喂出两个结论；「读同一份配置」不构成一致性保证",
        }}
        do={{
          code: `# 先统一内核，再谈配置
pnpm up typescript@7          # lockfile 锁死
"typescript.tsdk": "node_modules/typescript/lib"`,
          note: "版本一致之后，同一份 tsconfig 才只有一种语义——这是所有漂移治理的第一步",
        }}
      />
      <DoDont
        label="tsdk 是声明不是授权 / declare vs trust"
        dont={{
          code: `// .vscode/settings.json：以为提交即全员静默生效
{
  "typescript.tsdk": "node_modules/typescript/lib"
}`,
          note: "少了授权开关——VSCode 默认仍用编辑器内置版，新成员的红线依旧由旧内核画出，配置形同虚设",
        }}
        do={{
          code: `{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}`,
          note: "首次打开弹一次授权、点一次本机永久生效——声明（仓库管）与授权（个人管）各走各的闸门",
        }}
      />
      <Paragraph>
        第三个误判更隐蔽：以为 <strong>lockfile 只锁运行时依赖</strong>
        ——它同样锁死 typescript 这个「裁判」。没有 lockfile，node_modules 里那份 TS
        的版本都无法复现，编辑器指路（tsdk）也指了个寂寞——这正是统一链条的地基。
      </Paragraph>
      <DoDont
        label="编辑器版本策略 / version anchoring"
        dont={{
          code: "（不配置，用编辑器默认）",
          note: "内置 TS 版本随编辑器发布节奏走——团队里每个人编辑器版本不同，红线结论就不同",
        }}
        do={{
          code: '"typescript.tsdk": "node_modules/typescript/lib"',
          note: "提交进仓库 + enablePromptUseWorkspaceTsdk，全团队编辑器判断收敛到 lockfile 锁定的那份",
        }}
      />

      <QAChain
        intro="五问沿「现象 → 根因 → 治理」递进：先解释症状，再拆机理，最后落到声明式统一。"
        items={[
          {
            depth: 2,
            q: "为什么编辑器没报错，CI 却红了？",
            intent: "最常见的第一现场——考察是否立刻想到「两个判断源可能不同内核」。",
            a: "因为编辑器和构建用的不是同一份 TS。编辑器默认用自带版本（可能旧），CI 里 tsc -b 用 node_modules 里的（可能新）——新版本的检查更严，旧版放行的代码新版拦截。版本锚定到工作区即可消除。",
          },
          {
            depth: 3,
            q: "版本统一之后，编辑器和构建就一定一致了吗？",
            intent: "考第二个漂移源——只知道版本轴的人会答「是」，说明没踩过 include 外散文件的坑。",
            a: "不一定。版本统一只消掉了第一类漂移（主从延迟），还有推断项目这条结构性漂移源：include 外的散文件被 tsserver 自建临时项目按默认选项检查，tsc -b 却根本不查它们。版本锚定与 include 写全两件事都做干净，两边结论才真正收敛。",
            bonus:
              "治理自检：散文件多出现在新脚本、新工具目录刚创建还没进 include 的窗口期——把「include glob 与目录结构对齐」放进 code review 清单，比事后排查症状便宜得多。",
          },
          {
            depth: 3,
            q: "lib.d.ts 的变化怎么坑人？怎么缓解？",
            intent: "「升级 TS 后冒出奇怪的全局错误」的头号来源——很多人想不到是标准库声明在变。",
            a: "每次升级标准库声明都在更新：DOM lib 会给 window 加新成员、ES lib 会加新全局。你项目里 declare global 的同名声明就会和它冲突。缓解：skipLibCheck: true 跳过对 .d.ts 的检查（挡掉一大部分），剩下撞名的自己改名或收窄声明。",
          },
          {
            depth: 4,
            q: "typescript 的 ^ 版本区间为什么比普通依赖更敏感？",
            intent: "把「裁判型依赖」和普通库区分开——semver 心智对不同类型的依赖应该不同。",
            a: "普通库的 minor 是加功能，编译器的 minor 可能加检查——上次能编译的代码升级 minor 后可能报新错。所以 typescript 这类「裁判型」依赖对区间更敏感：日常靠 lockfile 锁死保稳定，升级走显式 PR、读官方 breaking changes，跟数据库大版本升级一个纪律。",
          },
          {
            depth: 4,
            q: "VSCode 和 IDEA 在「用哪份 TS」上的机制差异是什么？",
            intent: "全栈视角：统一策略必须覆盖团队里所有编辑器，不能只背 VSCode 的配置。",
            a: "VSCode 默认用编辑器内置版，需要仓库提交 typescript.tsdk 指向 node_modules/typescript/lib，且每人首次打开要点一次授权（供应链信任边界：声明 ≠ 授权）；IDEA/WebStorm 默认就自动探测并优先使用项目的 node_modules/typescript，无需任何配置文件。两家路的尽头都是 lockfile 锁定的那份。",
          },
        ]}
      />

      <MemoryCard keyword="漂移只有两个来源">
        版本不一致 + 推断项目——排查编辑器与构建的结论分歧，先查这两处。
      </MemoryCard>
      <MemoryCard keyword="lockfile 是版本事实源" color="#8b5cf6">
        声明（package.json）→ 锁定（lockfile）→ 落地（node_modules）→
        编辑器指路（tsdk）——一条链，一个真相。
      </MemoryCard>

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "编辑器的 TS 智能是怎么来的？",
            to: "/note/frontend/engineering/typescript/tsserver-internals",
            description: "读懂 tsserver 的进程与项目模型，推断项目这个词才有完整的出处。",
          },
          {
            title: "类型检查、lint、格式化为什么不打架？",
            to: "/note/frontend/engineering/typescript/tool-conflicts",
            description: "版本统一只是治理的第一板斧——多工具职责链的完整解法在治理篇。",
          },
        ]}
      />
    </NoteShell>
  );
}
