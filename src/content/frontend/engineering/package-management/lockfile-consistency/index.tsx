import { CodeBlock, FlowChart } from "@/components/demo";
import {
  Callout,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  Table,
  VersionNote,
} from "@/components/viz";
import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        lockfile 把<strong>解析函数在某一刻的完整输出</strong>
        固化成文件：每个包的精确版本、下载完整性哈希（integrity）、以及整棵依赖关系图。有了它，之后任何人在任何机器上安装都
        <strong>跳过解析</strong>，直接按坐标下载、逐包校验哈希、原样落盘；再配合只读安装模式（
        <code>npm ci</code> / <code>pnpm install --frozen-lockfile</code> /{" "}
        <code>yarn --immutable</code>
        ），锁文件成为唯一事实源——这就是「人人同树」的完整机制。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "为什么各机器装出来的依赖会不一样？",
            to: "/note/frontend/engineering/package-management/different-deps",
          },
        ]}
      >
        本篇解决上一篇的病根三：区间乘以时间等于漂移——解药是把「解析」从每次安装都重来，变成只做一次、记录下来、永久复用。
      </Prerequisite>

      <Heading level={2} title="解析为什么必须被记录" />
      <Paragraph>
        安装的第一步是解析：把 <code>^1.2.3</code> 这样的区间翻译成一个精确版本。这一步必须查询
        registry——「区间里有哪些候选、最新的是谁」这个问题只有 registry 能回答，而 registry
        是活的：每天都有新版本发布。于是解析函数有三个输入：package.json
        里的区间（人写的意图）、registry
        的当前状态（随时间漂移的事实）、以及解析设置。前两个输入的代码被提交进仓库，第三个输入却只存在于「执行那一刻」——不记录下来，每次安装都是重新掷骰子。
      </Paragraph>
      <Paragraph>
        lockfile 的本职就是<strong>把解析的输出连同输入一起存档</strong>。区间的含义从此分层：
        <code>package.json</code> 说「我要 1.x 的兼容范围」，<code>lockfile</code>{" "}
        说「本仓库事实上用的是 1.9.0，其内容哈希是
        sha512-…」。一个是意图，一个是事实——事实一经记录，就不再随 registry
        漂移。一个熟悉的技术参照：拉镜像时按 <code>tag</code> 还是按 <code>digest</code>——tag
        是区间，会漂移；digest 是精确内容，永不漂移。lockfile 就是依赖世界的 digest 清单。
      </Paragraph>
      <FlowChart
        label="三段机制 / resolve → lock → materialize"
        data={{
          direction: "LR",
          nodes: [
            { id: "manifest", label: "package.json\n区间（意图）", color: PALETTE.orange },
            { id: "registry", label: "registry\n此刻状态（会漂移）", color: PALETTE.purple },
            { id: "resolve", label: "解析\n只发生一次", color: PALETTE.blue },
            { id: "lock", label: "lockfile\n精确版本 + integrity", color: PALETTE.green },
            { id: "materialize", label: "物化\nnode_modules", color: PALETTE.blue },
          ],
          edges: [
            { source: "manifest", target: "resolve" },
            { source: "registry", target: "resolve", label: "查询", dashed: true },
            { source: "resolve", target: "lock", label: "存档" },
            { source: "lock", target: "materialize", label: "只读复用" },
          ],
        }}
      />
      <Paragraph>
        图里唯一要紧的箭头标注是「只发生一次」：解析只应发生在<strong>有意变更依赖</strong>
        的时刻（add / update ），其余一切安装都从 lockfile
        这一站直接出发。什么情况下这条纪律会被打破、破了会长什么样，是下一篇的主题。
      </Paragraph>

      <Heading level={2} title="lockfile 里到底记了什么" />
      <Paragraph>
        各家锁文件格式不同（npm 的 <code>package-lock.json</code>、pnpm 的{" "}
        <code>pnpm-lock.yaml</code>、yarn 的 <code>yarn.lock</code>
        ），但记录的信息高度一致。以下是一个最小项目 <code>pnpm add ms@2.1.3</code>{" "}
        之后的真实锁文件片段（pnpm 10.34.5 实测）：
      </Paragraph>
      <CodeBlock
        lang="typescript"
        code={`# pnpm-lock.yaml（实测片段）
lockfileVersion: '9.0'

importers:            # 本项目（importer）声明的意图与解析结果
  .:
    dependencies:
      ms:
        specifier: 2.1.3        # 意图：package.json 里的版本声明
        version: 2.1.3          # 事实：解析到的精确版本

packages:             # 每个包的坐标与内容哈希
  ms@2.1.3:
    resolution: {integrity: sha512-6FlzubTLZG3J2...}

snapshots:            # 依赖关系图：每个包依赖谁（同版本号关联）
  ms@2.1.3: {}`}
      />
      <Paragraph>
        三个区块各司其职：<code>importers</code>{" "}
        同时保留意图（specifier）和事实（version），这份「对照表」正是包管理器检测「package.json 与
        lockfile 是否脱节」的依据；
        <code>packages</code> 记录精确坐标和 <code>integrity</code> 哈希；<code>snapshots</code>{" "}
        记录整棵依赖图。下载阶段的完整性校验就发生在 integrity 字段上：每个 tarball
        下载后先算哈希再落盘，字节对不上立即报错——这既是供应链防篡改，也是「拿到不同字节」这类静默差异的天敌。
      </Paragraph>
      <Callout kind="warning" title="integrity 对不上不是故障，是护栏">
        使用镜像源时若镜像同步滞后，可能出现「按坐标找不到该版本」或「哈希对不上」的报错。这是校验机制在正确工作——它拒绝用内容不同的包顶替已记录的事实。修法是统一并更新镜像源，而不是关掉校验。
      </Callout>

      <Heading level={2} title="只读安装：三大管理器的同一件事" />
      <Paragraph>
        lockfile 要兑现「人人同树」，还差最后一块拼图：安装过程必须<strong>只读消费</strong>
        它，而不是「顺手更新」它。三大管理器都有对应的严格模式，语义一致——只按 lockfile 装；lockfile
        与 package.json 对不上时直接报错，绝不静默重解析：
      </Paragraph>
      <Table
        label="严格安装对照 / strict install"
        head={["管理器", "命令", "行为特点"]}
        rows={[
          ["npm", "npm ci", "先删除现有 node_modules 再按 lockfile 全新安装——天然杜绝增量赃状态"],
          [
            "pnpm",
            "pnpm install --frozen-lockfile",
            "检测到 CI 环境（CI=true）时默认开启；本仓库实测：脱节时报 ERR_PNPM_OUTDATED_LOCKFILE 并指出不匹配项",
          ],
          [
            "yarn",
            "yarn install --immutable",
            "lockfile 需要变更时失败，--immutable-cache 进一步连缓存一起只读",
          ],
        ]}
      />
      <VersionNote
        label="严格安装的来历 / history"
        versions={[
          {
            range: "npm 5（2017）",
            text: "内置 package-lock.json，npm 正面跟进 yarn 带来的 lockfile 范式",
          },
          { range: "npm 5.7.0（2018）", text: "引入 npm ci——为 CI 提供先清场、只读安装的标准动作" },
          {
            range: "pnpm 9+（2024）",
            text: "lockfileVersion 9.0（本仓库在用的格式）；pnpm 大版本迁移常伴随锁文件格式升级",
          },
        ]}
        note="来源：npm 官方博客与 pnpm 发布说明。大版本升级后的首次 install 必然整本重写锁文件，属于一次性成本。"
      />

      <DoDont
        label="CI 安装命令 / install in CI"
        dont={{
          code: `# CI 流水线里
npm install
# lockfile 对不上时静默重解析，
# 每次构建可能拿到不同的树`,
          note: "CI 是全新环境，本该是最可复现的地方——宽松安装反而让它变成随机源",
        }}
        do={{
          code: `# CI 流水线里
npm ci          # 或 pnpm install --frozen-lockfile
# 只按 lockfile 装，
# 对不上立即失败`,
          note: "「对不上就红」正是想要的：脱节必须在合并前被发现",
        }}
      />

      <MemoryCard keyword="区间是意图，lockfile 是事实">
        package.json 声明兼容范围，lockfile
        记录事实上解析到了哪个版本、内容哈希是什么、依赖关系如何。所有安装从「事实」出发，而不是重新解释「意图」。
      </MemoryCard>
      <MemoryCard keyword="严格模式 = 只读消费" color={PALETTE.green}>
        npm ci / --frozen-lockfile / --immutable 的共同语义：lockfile
        对不上就报错，绝不静默重解析。CI 环境默认严格（pnpm 实测报错文案里明说）。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <DoDont
        dont={{
          code: `// 只有 package.json 的范围声明，没有锁文件
"react": "^19.0.0"`,
          note: "每台机器各自解析到不同 patch 版本，「我这里好的」开始了",
        }}
        do={{
          code: `# pnpm-lock.yaml：范围被物化成唯一答案
react@19.2.8:
  resolution: {integrity: sha512-...}`,
          note: "精确版本 + 完整性哈希，安装结果可复现",
        }}
      />

      <QAChain
        items={[
          {
            q: "lockfile 和 package.json 各自的角色是什么？为什么两个都要？",
            intent: "热身题——两者职责混为一谈的人，后面所有脱节问题都诊断不了。",
            depth: 1,
            a: "package.json 是人写的意图声明：要哪些依赖、接受什么兼容范围，还要承担脚本、元数据等职责；lockfile 是机器写的解析档案：精确版本、integrity 哈希、完整依赖图。前者用于「声明变更意图」，后者用于「复现解析结果」。删掉任何一个，系统都退回「每次重新解析」的不确定状态。",
            bonus: "两者像代码与编译产物的关系——你不会把 .o 文件当源码改，也不该手改 lockfile。",
          },
          {
            q: "integrity 校验失败会发生什么？为什么说这不是坏事？",
            intent:
              "考对完整性机制的信任边界——能区分「护栏生效」与「环境故障」的人，遇到镜像源问题才不会病急乱投医。",
            depth: 2,
            a: "下载的字节算出的哈希与 lockfile 记录不一致，安装立即失败——这发生在任何代码执行之前。它不是故障而是护栏在正确工作：要么 registry 的内容被改动了（供应链攻击的典型信号），要么镜像源同步滞后导致拿到了不同字节。正确处置是核实来源、统一镜像，而不是删除 lockfile 重新生成——后者恰恰把「事实档案」销毁了。",
            bonus:
              "这也是 lockfile 必须入库的原因之一：不信任「重新解析」，才能信任「每次下载的字节一致」。",
          },
          {
            q: "为什么 CI 必须用 npm ci / --frozen-lockfile，本地却可以偶尔宽松？",
            intent: "考「严格」的适用边界——理解了这一点，才不会把「本地能跑」当成 CI 该有的标准。",
            depth: 2,
            a: "CI 是全新环境，唯一的价值就是可复现与守门：按 lockfile 装不上、对不上，说明仓库当前状态有问题，必须当场红掉。本地开发面对的是「人正在有意变更依赖」的场景，宽松安装是 add/update 的工作方式；但普通 install 也会静默补账，所以本地日常同样建议严格模式，只在有意变更时放宽。",
            bonus: "pnpm 检测到 CI=true 时 frozen-lockfile 自动为真——它的报错文案会明说这一点。",
          },
          {
            q: "版本区间在 lockfile 里还留着吗？留它做什么？",
            intent:
              "压轴题，考 specifier 字段的存在意义——能答出「脱节检测」的人，读 lockfile diff 就有了抓手。",
            depth: 3,
            a: "留着。pnpm 的 importers 区块里，每个依赖同时记录 specifier（package.json 里的声明）和 version（解析结果）。安装时把两者对照：对不上说明有人改了 package.json 而没同步 lockfile——脱节检测的依据正是这份对照表；frozen 模式报错时也会明确列出「lockfile: 2.1.3, manifest: ^2.0.0」这样的不匹配项。",
            bonus:
              "所以 review 别人的 PR 时，lockfile diff 里 specifier 行的变化值得重点看——它对应的是 package.json 的改动。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "为什么没人动 lockfile，它却自己变了？",
            to: "/note/frontend/engineering/package-management/lockfile-changes",
            description:
              "机制知道了，接下来是行为：add 和 install 到底什么时候写 lockfile，「补账」是怎么回事。",
          },
          {
            title: "git 为什么不存 diff：内容寻址怎么做的？",
            to: "/note/devtools/git/object-model/content-addressing",
            description: "integrity 哈希与 Git 对象库是同一个思想：以内容 hash 作为唯一坐标。",
          },
        ]}
      />
    </NoteShell>
  );
}
