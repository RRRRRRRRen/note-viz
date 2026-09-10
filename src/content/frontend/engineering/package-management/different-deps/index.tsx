import {
  Callout,
  CrossRef,
  DoDont,
  LayerStack,
  MemoryCard,
  Prerequisite,
  SpecQuote,
} from "@/components/viz";
import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        因为 package.json 里写的从来不是「依赖树」，而是<strong>区间</strong>：<code>^1.2.3</code>{" "}
        这类「大概要哪个版本」的意图；而「装依赖」实际是
        <strong>解析、下载、物化</strong>三步，其中解析这一步的结果受三个自由度影响：
        <strong>Node 版本、包管理器及其版本、执行那一刻 registry 的状态</strong>
        。任何一台机器在这三处与别人不同，装出来的依赖树就可能不同。解法不是换工具，而是把自由度逐层钉死：
        Node 版本 → 包管理器 → 依赖树（lockfile）→ 安装方式（frozen）→ 整机环境。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "lockfile 是如何保证依赖树一致的？",
            to: "/note/frontend/engineering/package-management/lockfile-consistency",
          },
        ]}
      >
        机器间依赖漂移正是 lockfile 要防的事：先看一致性机制，再看没有它时怎么漂。
      </Prerequisite>

      <Heading level={2} title="「装依赖」的时候到底发生了什么" />
      <Paragraph>
        敲下 <code>npm install</code> 之后，包管理器做了三件事。第一步
        <strong>解析</strong>：读出 package.json 里每个依赖的版本区间，去 registry
        查询「当前时刻」满足区间的最新版本，再递归处理依赖的依赖，最终得到一棵每个节点都是精确版本的树。第二步
        <strong>下载</strong>：按解析结果拉取各个包的
        tarball，并用完整性哈希逐包校验，保证拿到的字节和发布时一致。第三步
        <strong>物化</strong>：把包写进项目的 node_modules 目录。package.json
        只参与第一步——后两步完全由解析结果决定，所以「装出什么」的关键全在解析。
      </Paragraph>
      <Paragraph>
        区间是解析的输入。<code>^1.2.3</code> 的含义是「1.2.3 及以上、2.0.0 以下都可以」，
        <code>~1.2.3</code> 收窄到「1.2.x」。区间是写给<strong>人</strong>
        看的意图声明——「这个依赖我只在乎大版本兼容」；但机器每次安装都要重新回答「区间里选哪个」，而答案取决于查询那一刻
        registry 上有什么。
      </Paragraph>
      <SpecQuote source="npm Docs · About semantic versioning">
        The caret symbol <code>^</code> allows changes that do not modify the left-most non-zero
        element in the <code>[major, minor, patch]</code> tuple.
      </SpecQuote>
      <Paragraph>
        一个熟悉的技术参照：<code>package.json</code> 之于依赖树，就像 Dockerfile 里的{" "}
        <code>FROM node:latest</code> 之于镜像——<code>latest</code>
        会漂移，谁在什么时间拉，拿到的是谁。C 语言世界同理：同一份源码，gcc 9 和 gcc 13
        编译出的二进制不保证一致。「声明了版本范围」与「得到了确定产物」之间，永远隔着一次解析。
      </Paragraph>

      <Heading level={2} title="病根一：Node 版本不同" />
      <Paragraph>
        Node 不只是「跑 JavaScript 的」，它捆绑特定版本的 V8 引擎和一套内置
        API。两个大版本之间，语法支持、内置模块行为都可能有差异。更隐蔽的是
        <strong>原生模块</strong>：带 C/C++ 代码的包在安装时要针对当前 Node 的 ABI
        版本现场编译，产物直接绑定这一版本——Node 22 的 ABI 号是 127，Node 18 编出来的二进制放到 Node
        22 下加载会直接抛 <code>NODE_MODULE_VERSION</code> 不匹配的错误。
      </Paragraph>
      <Paragraph>
        所以「我们都装了 Node」不等于「我们的 Node 一样」。package.json 里{" "}
        <code>&quot;engines&quot;: &#123;&quot;node&quot;: &quot;&gt;=22&quot;&#125;</code>{" "}
        这种宽松下界，只能挡住大版本，挡不住小版本差异；而 Dockerfile 里写死的{" "}
        <code>node:22-alpine</code>{" "}
        又把精确版本藏在另一个文件里，本地开发的人根本看不到。版本声明的「宽松」和「分散」，是环境差异的第一来源。
      </Paragraph>

      <Heading level={2} title="病根二：包管理器的类型和版本不同" />
      <Paragraph>
        npm、yarn、pnpm 的锁文件格式互不相认（<code>package-lock.json</code> /{" "}
        <code>yarn.lock</code> / <code>pnpm-lock.yaml</code>
        ），安装算法也完全不同：npm 把依赖拍平成扁平的 node_modules，于是你能 require
        到自己从没声明过的包——这就是<strong>幽灵依赖</strong>；pnpm 用全局内容寻址存储加符号链接组装
        node_modules，顶层只看得见直接依赖。同一份 package.json 用不同管理器装，node_modules
        的物理结构都不同，打包器解析模块的路径自然可能不同。
      </Paragraph>
      <Paragraph>
        即使管理器类型一致，版本不同同样有影响：大版本迁移常伴随锁文件格式变更与行为变更——例如 pnpm
        10
        起默认不再执行依赖自带的安装脚本。团队里「各用各的版本」等于把格式漂移的开关常开：谁的版本新，谁
        install 一次就把锁文件重写成新格式，diff 里的冲突全给了别人。
      </Paragraph>

      <Heading level={2} title="病根三：解析漂移，以及被冤枉的「缓存」" />
      <Paragraph>
        区间乘以时间等于漂移。<code>^1.2.3</code> 今天解析到 1.9.0，下个月可能解析到
        1.10.0。没有锁文件时，每次安装都在重新掷骰子；有了锁文件但不同步时——忘了提交、merge
        冲突只解了一边——一次平平无奇的裸 install 会在你不知不觉里重新解析并改写锁文件。
      </Paragraph>
      <Paragraph>
        排查这类问题时，最常见的归因是「缓存坏了」，但多数情况它是替罪羊：下载缓存（npm cache / pnpm
        store）是内容寻址加完整性校验的，真损坏会当场报错，而不是静默产出不同的结果。真正静默出错的是各类
        <strong>缓存与数据源脱节</strong>：node_modules 与 lockfile
        脱节（增量安装留下的赃状态）、构建缓存的 key 没覆盖到某个输入的变化、切换 Node
        版本后原生模块没有重新编译。删除重装有效，是因为它强制了失效，不是因为缓存「烂了」。
      </Paragraph>

      <Heading level={2} title="方案：把自由度逐层钉死" />
      <Paragraph>
        可复现安装的本质是一个漏斗，每一层都有自由度，钉死一层才算关掉一个方差来源。这是木桶效应：上层锁得再严，任何一层漏风，结果就不保证一致——所以方案从来不是三选一，而是逐层收紧的组合拳。
      </Paragraph>
      <LayerStack
        label="五层钉死 / reproducible install"
        title="自上而下：每一层都依赖下一层先被锁住"
        layers={[
          {
            name: "整机环境",
            desc: "CI 校验兜底 / devcontainer——最后一道闸，拦住前面所有层漏掉的问题",
            color: PALETTE.purple,
          },
          {
            name: "安装方式",
            desc: "npm ci · pnpm install --frozen-lockfile · yarn --immutable：只读消费，禁止顺手改锁文件",
            color: PALETTE.blue,
          },
          {
            name: "依赖树",
            desc: "lockfile 提交入库，作为解析结果的唯一事实源",
            color: PALETTE.blue,
          },
          {
            name: "包管理器",
            desc: "packageManager 字段精确到小版本 + 装错即报错",
            color: PALETTE.orange,
          },
          {
            name: "Node 版本",
            desc: ".nvmrc 写精确版本 + engine-strict 让 engines 不满足时报错",
            color: PALETTE.orange,
          },
        ]}
      />
      <List
        ordered
        items={[
          <>
            锁 Node：<code>.nvmrc</code> 写精确版本（如 <code>22.11.0</code>
            ），项目 <code>.npmrc</code> 里 <code>engine-strict=true</code>。
          </>,
          <>
            锁管理器：<code>packageManager</code> 字段（如 <code>&quot;pnpm@10.34.5&quot;</code>
            ），配 <code>only-allow</code> 或 pnpm 自带的严格模式拦截装错。
          </>,
          <>锁依赖树：lockfile 永远提交入库，.gitignore 里永远不出现它。</>,
          <>
            锁安装方式：日常与 CI 都用只读安装（<code>npm ci</code> /{" "}
            <code>pnpm install --frozen-lockfile</code> / <code>yarn --immutable</code>）。
          </>,
          <>兜底：CI 在全新环境跑只读安装 + 构建 + lint，PR 不绿不合并。</>,
        ]}
      />
      <Callout kind="tip" title="验收标准">
        新人 clone 后只跑 install 和
        dev，不问任何人、不看任何文档就能跑起来，且装出的依赖树与团队里任何一人一致——这套环境才算过关。
      </Callout>

      <DoDont
        label="engines 声明 / engine-strict"
        dont={{
          code: `// package.json
{ "engines": { "node": ">=22" } }
/* npm 默认不满足只警告，
   等于没有拦截 */`,
          note: "警告会被忽略，宽松下界还放过了小版本差异——声明的存在感不等于约束力",
        }}
        do={{
          code: `// package.json 同上，再加 .npmrc：
engine-strict=true
# Node 不满足时 install 直接报错，
# pnpm 同样认这个开关`,
          note: "报错替代警告，声明的才真正生效；精确版本交给 .nvmrc",
        }}
      />

      <MemoryCard keyword="一致性 = 钉死每一层自由度">
        Node
        版本、包管理器、依赖树、安装方式、整机环境——五层缺任何一层，其余锁得再严也白锁。方案是组合拳，不是单点工具。
      </MemoryCard>
      <MemoryCard keyword="缓存是替罪羊，脱节是真凶" color={PALETTE.orange}>
        下载缓存真损坏会报错；静默出错的都是「缓存与数据源脱节」。删除有效是因为强制失效——「删了就好」应当触发追问：哪一层的
        key 漏看了哪个输入？
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <DoDont
        dont={{
          code: `# 同事机器正常、CI 报错，于是手动补包
$ npm i dayjs # 绕过 pnpm lockfile 的临时安装`,
          note: "绕过锁文件的安装 = 装出版本漂移，下一台机器继续报错",
        }}
        do={{
          code: `$ pnpm add dayjs # 增量安装也走 lockfile 唯一入口`,
          note: "所有依赖变更过锁文件，机器间才一致",
        }}
      />

      <QAChain
        items={[
          {
            q: "lockfile 已经提交了，为什么大家装出来的还可能不一样？",
            intent:
              "检验是否理解「提交 lockfile」只钉死了依赖树这一层——把 lockfile 当万能解的人，五层模型还没建立。",
            depth: 1,
            a: "因为一致性有五层，lockfile 只负责「依赖树」。Node 版本不同，原生模块会按各自的 ABI 重新编译；包管理器类型或版本不同，安装算法与产物结构都不同；安装方式不严格，有人用宽松模式顺手改了 lockfile，别人的下次安装就跟着漂。lockfile 是必要条件，不是充分条件。",
            bonus:
              "快速自检：对比两台机器的 ls -la node_modules（符号链接结构）与 node_modules/.modules.yaml（环境指纹），差异一眼可见。",
          },
          {
            q: "^1.2.3 允许哪些版本？0 开头的版本为什么特殊？",
            intent:
              "semver 区间是解析漂移的语法基础；0.x 的特殊规则是最常翻车的点——很多依赖恰恰停在 0.x。",
            depth: 2,
            a: "^1.2.3 允许 1.2.3 及以上、2.0.0 以下——规则是「最左非零位不变」。照此 ^0.2.3 只允许 0.2.x（最左非零位是 minor），^0.0.3 只允许 0.0.3。所以依赖停在 0.x 阶段的包，即使加了 ^，每次解析仍可能拿到不同的补丁版本，漂移照样发生。",
            bonus:
              "~1.2.3 允许 1.2.x；想彻底锁死就在 add 时保存精确版本（save-exact），或依赖 lockfile 兜底。",
          },
          {
            q: "幽灵依赖是什么？它是怎么产生的？",
            intent:
              "考安装算法差异——能讲清「依赖提升」来龙去脉的人，才真正理解 npm 与 pnpm 的分野。",
            depth: 2,
            a: "代码里 require 了没写进 package.json 的包，还能正常跑——这就是幽灵依赖。来源是 npm 的扁平化安装：它把「依赖的依赖」提升到顶层 node_modules，你的代码「顺手」就能看见它们。pnpm 的符号链接结构里顶层只放直接依赖，幽灵依赖物理上找不到，运行时直接报错。所以「npm 下能跑、pnpm 下报错」不是 pnpm 有 bug，是它把隐藏的依赖关系暴露了出来。",
            bonus:
              "从 npm 迁移 pnpm 前，先用 lint 规则（如 no-extraneous）扫一遍未声明的导入，把幽灵依赖显式化。",
          },
          {
            q: "为什么说「缓存问题」大多是替罪羊？",
            intent: "建立本系列的诊断观：把「删了重装」从迷信变成可以推理的分层诊断。",
            depth: 3,
            a: "下载缓存（npm cache / pnpm store）是内容寻址加完整性校验的，真损坏会当场报错，不会静默产出不同的结果。真正静默出错的是各类「缓存与数据源脱节」：node_modules 与 lockfile 脱节（增量安装的赃状态）、构建缓存的 key 没覆盖到某个输入变化、切 Node 版本后原生模块没重新编译。删除有效是因为它强制了失效——「删了就好」应当触发追问：哪一层的 key 漏看了哪个输入？",
            bonus:
              "删哪层有效本身就是诊断信号：删 node_modules 有效指向安装脱节；只删 node_modules/.vite 有效指向预构建缓存；重启 dev server 有效则是进程内存态的问题。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "lockfile 是如何保证依赖树一致的？",
            to: "/note/frontend/engineering/package-management/lockfile-consistency",
            description: "病根三的解药：把解析结果固化成文件，让所有人跳过「重新掷骰子」的那一步。",
          },
          {
            title: "一次前端部署是怎么从 dist 走到线上的？",
            to: "/note/devtools/docker/basics/deploy-pipeline",
            description: "整机环境层的终解是容器：镜像就是环境的不可变快照。",
          },
        ]}
      />
    </NoteShell>
  );
}
