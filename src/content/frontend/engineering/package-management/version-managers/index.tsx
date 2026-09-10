import {
  Callout,
  CompareTable,
  CrossRef,
  MemoryCard,
  Prerequisite,
  SpecQuote,
  Timeline,
  VersionNote,
} from "@/components/viz";
import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        四个工具解决的是同一个问题——
        <strong>同一台机器装多个 Node 版本，进对项目自动用对版本</strong>
        。本质差别只有一个：怎么让正确的版本出现在 PATH 上。nvm / fnm 一派用 shell 钩子
        <strong>改 PATH 顺序</strong>； asdf / Volta 一派用 <strong>shim 假身</strong>转发。fnm 是
        Rust 重写的 nvm（快、Windows 支持最成熟）； Volta 首创「版本声明进 package.json」但已于 2025
        年停止维护；mise 则把版本管理、环境变量、任务运行三合一收编。当前结论：新选型用
        mise（一把梭）或 fnm（轻量纯 Node），Volta 不再建议。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "为什么删了 node_modules 重装就好了？",
            to: "/note/frontend/engineering/package-management/cache-desync",
          },
        ]}
      >
        原生模块按 Node 的 ABI 编译——「Node
        版本」就是环境指纹里最重的一位。版本管理器就是管理这个指纹的工具。
      </Prerequisite>

      <Heading level={2} title="问题是什么：PATH 的查找顺序" />
      <Paragraph>
        先回到零点：为什么「Node 版本」会是个问题？因为一个全局环境通常只能有一个 <code>node</code>
        命令，而现实中老项目跑在 Node 14、新项目要求 Node 22，两者互不兼容。你在终端里敲{" "}
        <code>node</code>
        回车时，shell 并不知道「Node」是什么——它按一个固定的目录列表<strong>从前往后</strong>
        找同名的可执行文件，第一个命中就执行。这个列表就是 PATH（<code>echo $PATH</code>{" "}
        可以看到，冒号分隔的一串目录）。
      </Paragraph>
      <Paragraph>
        理解了「PATH
        是查找顺序」，所有版本管理器的设计就都通透了：所谓「切换版本」，就是让目标版本的目录在查找顺序上排到前面。两条技术路线由此分野——一条是
        <strong>直接改写 PATH 顺序</strong>，一条是<strong>在 PATH 最前端放一个代理（shim）</strong>
        。路线之争贯穿了这十多年的工具史。
      </Paragraph>

      <Heading level={2} title="路线 A：改 PATH 顺序（nvm / fnm）" />
      <Paragraph>
        nvm（2010 年诞生，GitHub 上 star 数最高的版本管理器）严格说不是二进制程序，而是
        <strong>一段 shell 函数</strong>，安装时注入你的 shell 配置。
        <code>nvm install 22</code> 把官方预编译包下载解压到 <code>~/.nvm/versions/node/v22.x</code>
        ；<code>nvm use 22</code> 则是改写当前 shell 的 PATH，把 22 的 bin 目录排到最前。项目约定靠{" "}
        <code>.nvmrc</code>
        文件：cd 进目录后执行 <code>nvm use</code>，nvm 读取它切换。这套「版本目录 + PATH 顺序 +
        .nvmrc 声明」的三件套，奠定了后来所有工具的范式。
      </Paragraph>
      <Paragraph>
        nvm 的代价是 shell 函数的启动开销：每次开一个新终端都要 source
        一大段脚本，终端启动明显变慢。fnm（2019）用 Rust 重写了同一套范式：原生二进制快几个数量级，
        <code>fnm env --use-on-cd</code> 让 shell 在 cd 时自动读 .nvmrc
        切换（把「进对项目用对版本」做成了默认行为），并且是各家对 Windows
        支持最成熟的一个。lightweight、单一职责，是它的标签。
      </Paragraph>

      <Heading level={2} title="路线 B：shim 假身（asdf / Volta）" />
      <Paragraph>
        另一条路线不在「切换」上做文章，而是在 PATH 最前端放一堆与命令同名的
        <strong>假身脚本</strong>（shim）。你敲
        <code>node</code>
        ，先命中的是假身；假身被调用时读取「当前目录的版本声明」，找到对应版本的真身，把命令原样转发过去。asdf（2014）把这套机制泛化到所有语言：每种语言一个插件，版本声明统一写在
        <code>.tool-versions</code>。
      </Paragraph>
      <Paragraph>
        Volta（2017 立项，2020 发布 1.0）把 shim 路线推到了体验顶点：版本声明直接写进 package.json
        的 <code>volta</code> 字段——「这个项目用什么 Node」成为项目声明的一部分，进目录自动生效、零
        shell 钩子、Windows 一等公民。它的这些理念后来被行业标准化吸收（<code>packageManager</code>{" "}
        字段、.nvmrc 生态共识），工具本身却在 2025 年停止了维护。
      </Paragraph>
      <CompareTable
        label="两条路线 / path vs shim"
        left={{ title: "改 PATH 顺序（nvm / fnm）", color: PALETTE.blue }}
        right={{ title: "shim 假身（asdf / Volta）", color: PALETTE.purple }}
        rows={[
          {
            aspect: "生效方式",
            left: "cd 钩子触发，重排 PATH 目录顺序",
            right: "假身常驻 PATH 最前，执行时读声明转发",
          },
          {
            aspect: "终端开销",
            left: "nvm：每次开 shell 都要 source，慢；fnm：二进制，快",
            right: "常驻假身，几乎零额外开销",
          },
          {
            aspect: "声明文件",
            left: ".nvmrc / .node-version",
            right: ".tool-versions / package.json 的 volta 字段",
          },
          {
            aspect: "透明度",
            left: "which node 直接看到真实路径",
            right: "which node 看到的是 shim，需多看一层",
          },
          { aspect: "继承者", left: "fnm", right: "mise（继承了 shim，也支持 PATH 模式）" },
        ]}
      />

      <Heading level={2} title="编年史：从 nvm 到 mise" />
      <Timeline
        label="版本管理器编年史 / 2010–2025"
        steps={[
          { label: "2010", sub: "nvm 诞生，三件套范式确立", color: PALETTE.blue },
          { label: "2014", sub: "asdf：shim + 插件，泛化到多语言", color: PALETTE.blue },
          { label: "2019", sub: "fnm：Rust 重写，Windows 一等公民", color: PALETTE.blue },
          { label: "2020", sub: "Volta 1.0：声明进 package.json", color: PALETTE.purple },
          { label: "2021", sub: "Corepack 随 Node 16.9 内置（实验）", color: PALETTE.purple },
          { label: "2023", sub: "rtx 立项（mise 前身）", color: PALETTE.orange },
          { label: "2024", sub: "rtx 更名 mise：版本+环境+任务三合一", color: PALETTE.orange },
          {
            label: "2025",
            sub: "Volta 官宣停更；Corepack 宣布从 Node 25 起移除",
            color: PALETTE.red,
          },
        ]}
      />
      <Paragraph>
        时间线的后半段是两条主线的合流：一是「版本管理」与「包管理器版本（Corepack 读 packageManager
        字段）」「环境变量（direnv）」「任务运行（Make/just）」被 mise
        逐一收编；二是第一代明星工具相继退场。退场不是随机的，背后有五个可复用的模式。
      </Paragraph>

      <Heading level={2} title="没落五模式：工具为什么会死" />
      <List
        ordered
        items={[
          <>
            <strong>平台漂移税付不起</strong>：活在 Node × 操作系统 × shell
            交叉点上的工具，每月都要追新版本。Volta
            的停更公告原文写明「无法应对新操作系统发布带来的问题」。
          </>,
          <>
            <strong>创新被标准化吸收</strong>：Volta 的「版本声明进项目配置」成功了，变成
            packageManager 字段和 .nvmrc
            共识——思想进了标准，实现就没人需要了。教会了市场，市场不再需要你。
          </>,
          <>
            <strong>维护者经济学崩盘</strong>：工具是免费公共品，维护是真金白银。Volta
            的风投断档后只剩极少数人志愿维护，而漂移税恰恰需要全职投入。
          </>,
          <>
            <strong>破坏生态契约</strong>：Yarn 2 的 Plug'n'Play 技术上更优（干掉
            node_modules），但违反了「node_modules 存在」的全行业假设，被生态用脚投票。对照组：pnpm
            结构激进、接口保守，于是赢了。
          </>,
          <>
            <strong>被收编</strong>：每一浪的赢家吃掉上一浪赢家——mise 内化了 nvm 的 PATH 切换、Volta
            的 shim、direnv 的目录环境、Make 的任务。收编位是工具界最安全的位置。
          </>,
        ]}
      />
      <SpecQuote source="volta-cli/volta README（2025）">Volta is unmaintained.</SpecQuote>
      <VersionNote
        label="2025–2026 的选型信号 / signals"
        versions={[
          {
            range: "Volta",
            text: "官方 README 明示 unmaintained，并推荐迁移到 mise",
            color: PALETTE.red,
          },
          {
            range: "Corepack",
            text: "Node 官方已宣布 25 起不再捆绑（存量 LTS 仍带）；「按 packageManager 字段自动切包管理器」的思想由各工具自行实现",
            color: PALETTE.orange,
          },
          {
            range: "mise / fnm",
            text: "当前活跃主线（mise 33k+ stars、日历版高频发布）；两者声明文件互通——mise 认 .nvmrc，切换成本极低",
            color: PALETTE.green,
          },
        ]}
      />
      <Callout kind="tip" title="选型的体检指标">
        评估一个工具的预期寿命，看四件事：维护者数量与激励结构（有没有人靠它吃饭）、是否占据收编位、是否遵守生态契约、平台漂移税敞口有多大。工具会死，声明文件（.nvmrc、packageManager
        字段）不会——这就是「押声明不押工具」。
      </Callout>

      <MemoryCard keyword="PATH 改顺序，shim 放假身">
        版本切换只有两条技术路线：nvm/fnm 在 cd 时重排 PATH 查找顺序；asdf/Volta 在 PATH
        最前端放假身、执行时按当前目录声明转发。mise 两种都支持。
      </MemoryCard>
      <MemoryCard keyword="声明是资产，工具是消耗品" color={PALETTE.green}>
        .nvmrc、packageManager
        字段这些声明文件被整个生态认领、格式十年稳定；实现它们的工具却迭代不息。选型时优先固化声明，工具坏了随时换。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "nvm 是一个二进制程序吗？它的工作原理是什么？",
            intent:
              "热身题——「nvm 是命令行工具」这个直觉是错的，纠正它是理解一切版本管理器的起点。",
            depth: 1,
            a: "不是。nvm 是一段 shell 函数，安装时被注入到 shell 配置里。nvm install 把官方预编译包解压到 ~/.nvm/versions/node/vX 目录；nvm use 只做一件事：改写当前 shell 的 PATH，让目标版本的 bin 目录排在最前。「多版本共存」靠目录隔离，「切换」靠 PATH 顺序——没有进程、没有守护、没有魔法。",
            bonus:
              "Windows 上广为流传的 nvm-windows 与 nvm 无关，是另一个独立项目——查文档时别走错门。",
          },
          {
            q: "为什么 nvm 会拖慢终端启动，fnm 不会？",
            intent:
              "考「shell 函数 vs 原生二进制」的成本差异——能解释启动耗时的人，对工具的实现层有真实感知。",
            depth: 2,
            a: "nvm 的全部逻辑是 shell 脚本，每次开新终端都要完整 source 一遍，脚本还要扫描版本目录做初始化——这段开销在毫秒到百毫秒级，叠加起来就是肉眼可见的「终端变慢」。fnm 用 Rust 编译成原生二进制，shell 配置里只留一行 eval（fnm env --use-on-cd），初始化开销极低，自动切换由二进制侧支持完成。",
            bonus:
              "性能敏感的另一个选项是延迟加载（lazy-load）：第一次敲 node 时才初始化版本管理器。",
          },
          {
            q: "Volta 体验公认优秀，为什么还是死了？",
            intent:
              "考工具生命的结构性风险——体验好坏与存亡是两回事，这是工程选型最重要的认知之一。",
            depth: 2,
            a: "两个结构性原因。其一，平台漂移税：版本管理器活在 Node、操作系统、shell 三者的交叉点上，每一边更新都是兼容性维护，Volta 的停更公告原文承认「无法应对新操作系统发布带来的问题」。其二，创新被标准化吸收：它最核心的理念——版本声明进项目配置——被 packageManager 字段和 .nvmrc 生态共识标准化，思想进了标准，实现就失去了不可替代性。体验优秀救不了维护经济学。",
            bonus:
              "Volta 团队停更前把最后的精力投入 devEngines 标准提案——从做工具转向做标准，算是把这条规律想透了。",
          },
          {
            q: "「押声明不押工具」在实际选型时怎么落地？",
            intent: "压轴题，把历史规律转成可执行的个人策略——本篇的最终学习目标。",
            depth: 3,
            a: "三步。第一，把声明写进项目并提交：.nvmrc 写精确版本、package.json 写 packageManager 字段——这些格式被整个生态认领，任何工具都得认。第二，解析工具按当前阶段选，且选「认标准声明」的：mise 或 fnm 都读 .nvmrc，换工具时声明零迁移。第三，把「换工具」当成十分钟操作来设计：全局安装一条命令、shell 配置两行——工具层永远保持可替换，声明层才是你的资产。",
            bonus:
              "面试视角：聊到选型时先讲声明层与解析层的分离，再讲具体工具——这比背「哪个工具最新」高一个层次。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "几十个项目版本各异，心智怎么统一？",
            to: "/note/frontend/engineering/package-management/unified-toolchain",
            description:
              "工具认全了，最后一里路：怎么让几十个异构项目在你手里收敛成一套统一工作流。",
          },
        ]}
      />
    </NoteShell>
  );
}
