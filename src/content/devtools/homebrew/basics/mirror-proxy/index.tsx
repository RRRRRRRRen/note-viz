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
import { ShellBlock } from "@/components/demo/ShellBlock";

export default function Note() {
  return (
    <NoteShell>
      <Prerequisite
        notes={[
          {
            title: "brew 装的软件到底放在哪？",
            to: "/note/devtools/homebrew/basics/brew-essentials",
          },
        ]}
      >
        先知道 brew 的目录模型与 bottle（预编译二进制）是什么，镜像与代理的配置才有落点。
      </Prerequisite>

      <Conclusion>
        两条路线原理不同：<strong>镜像</strong>是换下载点——把 brew 的几个下载地址改指国内同步服务器
        （环境变量 <code>HOMEBREW_API_DOMAIN</code>、<code>HOMEBREW_BOTTLE_DOMAIN</code>{" "}
        等），带宽满速但有同步延迟；<strong>代理</strong>是换条路——设标准的 <code>http_proxy</code>/
        <code>https_proxy</code>/<code>all_proxy</code> 变量，流量仍来自官方源，零漂移。brew{" "}
        <strong>没有 HOMEBREW_PROXY 这个变量</strong>。最省心的组合是官方源 + 一个稳定代理；
        追求满速用「镜像管 brew 自家内容 + 代理管 cask 厂商源」的双保险，且 API 与 bottle
        两个域名变量必须<strong>成对改、同源改</strong>。
      </Conclusion>

      <Heading level={2} title="先弄清 brew 到底在下载什么" />
      <Paragraph>
        配置之前先看清流量构成——brew 一次 <code>install</code>{" "}
        背后最多有三类下载，走向完全不同的服务器： ① <strong>brew 本体更新</strong>，
        <code>brew update</code> 时对 <code>github.com/Homebrew/brew</code> 做 git 拉取；②{" "}
        <strong>配方元数据</strong>，Homebrew 4.0 起默认 API 模式，不再克隆 homebrew-core
        仓库，而是拉一份 JSON 格式的包索引（默认 <code>https://formulae.brew.sh/api</code> ，据{" "}
        <code>man brew</code> 的 HOMEBREW_API_DOMAIN 条目）；③ <strong>包本身</strong>——formula
        装的是 bottle 预编译二进制，托管在 GitHub Packages（默认{" "}
        <code>ghcr.io/v2/homebrew/core</code>），而 cask 装的 GUI
        应用包存在各厂商自己的服务器，大量是 GitHub Releases。
      </Paragraph>
      <Paragraph>
        这个构成立刻给出结论：镜像站靠定时同步，只能覆盖<strong>有同步机制的前两类加 bottle</strong>
        ；厂商源散落在各处、镜像无从覆盖，只能靠代理。所以「镜像能不能解决下载慢」取决于你装的是什么。
      </Paragraph>

      <Table
        label="三类流量 / download traffic"
        head={["流量", "默认位置", "镜像覆盖", "代理覆盖"]}
        rows={[
          ["brew 本体（git 更新）", "github.com/Homebrew/brew", "可（brew.git 远程）", "可"],
          ["配方元数据（API JSON）", "formulae.brew.sh/api", "可（HOMEBREW_API_DOMAIN）", "可"],
          ["bottle 二进制", "ghcr.io/v2/homebrew/core", "可（HOMEBREW_BOTTLE_DOMAIN）", "可"],
          ["cask 应用包", "各厂商服务器（GitHub Releases 居多）", "不可", "可"],
        ]}
      />

      <Heading level={2} title="镜像：改写下载地址的环境变量" />
      <Paragraph>
        镜像方案的全部内容就是四个环境变量（名字与语义均来自 <code>man brew</code>）：
        <code>HOMEBREW_API_DOMAIN</code> 指向元数据镜像、<code>HOMEBREW_BOTTLE_DOMAIN</code> 指向
        bottle 镜像、<code>HOMEBREW_BREW_GIT_REMOTE</code> 与 <code>HOMEBREW_CORE_GIT_REMOTE</code>{" "}
        分别改写 brew 本体与 core tap 的 git 远程。以清华 TUNA 镜像（官方帮助页给出的 4.0
        推荐配置）为例：
      </Paragraph>

      <ShellBlock>
        {`# ~/.zprofile —— 4.0 API 模式下多数场景只需前两行
export HOMEBREW_API_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles/api"
export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles"

# 可选：brew 本体与 core tap 的 git 远程也指到镜像（开发命令/非默认 prefix 才需要）
export HOMEBREW_BREW_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git"
export HOMEBREW_CORE_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git"`}
      </ShellBlock>
      <Paragraph>
        两个 API 模式特有的注意点。<strong>其一</strong>：老教程反复讲的「替换 homebrew-core.git
        远程」在 4.0 之后的多数机器上无从谈起——API 模式不再克隆 core 仓库，<code>brew config</code>{" "}
        里 <code>Core tap: N/A</code> 就是证据；多数用户只需要 API_DOMAIN 与 BOTTLE_DOMAIN
        两个变量。<strong>其二</strong>：设置 <code>HOMEBREW_BREW_GIT_REMOTE</code>/
        <code>HOMEBREW_CORE_GIT_REMOTE</code> 后，每次 <code>brew update</code> 会自动把对应仓库的
        remote 改写过去（manpage 明文行为），不需要再手动 <code>git remote set-url</code>。
      </Paragraph>
      <Callout kind="warning" title="两个域名必须成对改、同源改">
        <code>HOMEBREW_API_DOMAIN</code> 管「有哪些版本」，<code>HOMEBREW_BOTTLE_DOMAIN</code>{" "}
        管「从哪下载这些版本」。只改其中一个，元数据与二进制就来自两个不同步的源——镜像上还没有的
        bottle 版本会被要求去镜像下载，得到 404
        或校验失败。恢复官方默认的办法：删掉这些环境变量即可。
      </Callout>

      <Heading level={2} title="代理：brew 直接读标准变量" />
      <Paragraph>
        brew <strong>没有</strong> HOMEBREW_PROXY 之类的专用变量。manpage 的「Using Homebrew behind
        a proxy」一节写得很直接：用 <code>http_proxy</code>、<code>https_proxy</code>、{" "}
        <code>all_proxy</code>（SOCKS5）、<code>ftp_proxy</code>、<code>no_proxy</code>{" "}
        这套标准变量——brew 的下载由 curl 完成、仓库更新由 git 完成，它们本来就吃这套协议：
      </Paragraph>

      <ShellBlock>
        {`export http_proxy=http://127.0.0.1:7897
export https_proxy=http://127.0.0.1:7897
# 或 SOCKS5：export all_proxy=socks5://127.0.0.1:7897

# 验证：brew config 直接回显代理（本机实测输出片段）
$ brew config | grep proxy
http_proxy: http://127.0.0.1:7897
https_proxy: http://127.0.0.1:7897`}
      </ShellBlock>
      <Paragraph>
        代理的价值在于<strong>覆盖面</strong>：官方源零漂移，cask 的厂商源、GitHub Releases
        一并解决，镜像滞后问题也不存在。代价是速度与稳定性取决于节点质量。只想单次加速某条命令时，不必改全局环境：{" "}
        <code>http_proxy=http://127.0.0.1:7897 brew upgrade ffmpeg</code>{" "}
        的前缀写法只对这一条命令生效。
      </Paragraph>

      <CompareTable
        label="选型对照 / mirror vs proxy"
        left={{
          title: "镜像",
          color: "#8b5cf6",
          points: [
            "原理：国内服务器定时同步，换个下载点",
            "配置：HOMEBREW_API_DOMAIN / BOTTLE_DOMAIN 等变量",
            "国内带宽满速，但有同步延迟",
            "只覆盖 brew 自家内容，管不到 cask 厂商源",
            "坑：滞后导致新版本拿不到、半镜像配置 404",
          ],
        }}
        right={{
          title: "代理",
          color: "#1677ff",
          points: [
            "原理：本机客户端转发流量，内容仍来自官方源",
            "配置：http_proxy / https_proxy / all_proxy 标准变量",
            "与官方零延迟一致，无镜像漂移",
            "覆盖一切下载源，包括 cask 的厂商源",
            "速度与稳定性取决于节点质量",
          ],
        }}
      />

      <MemoryCard keyword="镜像管自家，代理管厂商源" color="#1677ff">
        brew 自家内容（元数据 JSON、bottle）镜像全覆盖；cask 应用包在厂商服务器上，镜像无能为力。
        双保险 = 镜像管自家 + 代理管散落源；只选一个时，<strong>官方源 + 稳定代理</strong>{" "}
        最省心——配置只剩两行标准变量，且永远没有同步延迟。
      </MemoryCard>

      <Heading level={2} title="边界与陷阱" />
      <Paragraph>
        <strong>镜像滞后不是玄学，可被识别。</strong>
        某天 <code>brew update</code>{" "}
        后突然冒出几十个可升级的包，多半不是官方同一天集体发版，而是镜像
        之前落后、这次一口气追平；反过来，刚发布的新版本在镜像上往往要等几小时才同步到，{" "}
        <code>brew install</code> 拿不到 bottle 报 404 时，先怀疑镜像而不是命令本身。
      </Paragraph>

      <DoDont
        label="半镜像配置 / partial mirror"
        dont={{
          code: `export HOMEBREW_API_DOMAIN="https://mirrors.example.com/api"
# BOTTLE_DOMAIN 没改 → 元数据来自镜像、
# bottle 仍走 ghcr.io，两边版本不同步`,
          note: "API 与 bottle 是两个独立变量：只改一个 = 半镜像，装新版本时容易 404 或校验失败。",
        }}
        do={{
          code: `export HOMEBREW_API_DOMAIN="https://mirrors.example.com/api"
export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.example.com/bottles"
# 成对修改，且取自同一个镜像站`,
          note: "两个域名变量始终成对出现、指向同一镜像站，元数据与二进制才处于同一次同步。",
        }}
      />
      <DoDont
        label="镜像滞后时的安装 / stale mirror"
        dont={{
          code: `$ brew install 刚发布的工具
# ==> Downloading ... 404: Not Found
$ 反复重试、重装 brew……`,
          note: "镜像还没同步到这个版本时，重试多少次都是 404——先对比官方 formulae.brew.sh 确认版本是否存在。",
        }}
        do={{
          code: `# 急用刚发布的版本：临时绕开镜像走官方源（配代理）
$ env -u HOMEBREW_API_DOMAIN -u HOMEBREW_BOTTLE_DOMAIN \\
    http_proxy=http://127.0.0.1:7897 \\
    https_proxy=http://127.0.0.1:7897 \\
    brew install 刚发布的工具`,
          note: "单条命令临时摘掉镜像变量（env -u）并走代理，不污染全局配置；不急就等镜像同步。",
        }}
      />
      <DoDont
        label="代理变量名 / proxy env"
        dont={{
          code: `export HOMEBREW_PROXY=http://127.0.0.1:7897
# 不存在的变量，静默无效`,
          note: "brew 没有 HOMEBREW_PROXY：下载走 curl、仓库更新走 git，读的是它们认的标准变量。",
        }}
        do={{
          code: `export http_proxy=http://127.0.0.1:7897
export https_proxy=http://127.0.0.1:7897
# 验证：brew config | grep proxy`,
          note: "标准变量立即生效，且 brew config 会原样回显，是否配置成功一眼可查。",
        }}
      />

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "接手一台机器，怎么快速判断它的 brew 配的是镜像、代理还是官方默认？",
            intent:
              "热身题，考动手排查的第一步——不知道 brew config 会回显这些配置的人，只能瞎翻 .zshrc。",
            depth: 1,
            a: "一条 brew config 全看出来：ORIGIN 是 brew 本体的 git 远程（官方值是 https://github.com/Homebrew/brew.git），http_proxy/https_proxy 行有值就是配了代理，API_DOMAIN / BOTTLE_DOMAIN 相关行不是官方默认值就是配了镜像。环境变量还可能写在 .zprofile、.zshrc、.bash_profile 任何一处，但生效值以 brew config 显示的为准。",
            bonus:
              "brew config 还会显示 Core tap 一行：N/A 说明处于 4.0 的 API 模式（未克隆 core 仓库），这决定了「改 tap 远程」类老教程是否适用。",
          },
          {
            q: "为什么镜像站管不了 cask 应用的下载，却能管 bottle？",
            intent:
              "考对 brew 下载模型的理解——答不出「厂商源不可控」就说明从来没想过 cask 装的东西到底从哪来。",
            depth: 2,
            a: "因为两者的存放位置不同。bottle 是 Homebrew 官方构建、集中托管在 GitHub Packages（ghcr.io）的标准产物，地址规律固定，镜像站写同步脚本即可覆盖；cask 配方只记录「去厂商给的 URL 下载 dmg」，实际文件散落在各软件厂商自己的服务器（大量是 GitHub Releases），没有统一的同步入口，镜像站无法穷举覆盖。所以镜像只管 brew 自家内容，厂商源只能靠代理转发。",
            bonus:
              "推论：cask 还有一类应用自带「自动更新」（Chrome、VS Code），装好后更新流量根本不经过 brew——镜像对这类应用连安装后的更新都管不着。",
          },
          {
            q: "brew update 之后突然冒出几十个「可升级」，是官方同一天集体发版吗？该不该直接 upgrade？",
            intent:
              "考镜像延迟的工程判断——能从「升级列表突然变长」倒推出镜像落后的人，才算真正用镜像用过脑子。",
            depth: 3,
            a: "大概率是镜像在追进度：镜像站定时同步，之前落后若干小时，这次 update 把积压的元数据一次拉平，列表里全是「这几小时里官方发过的版」。此时直接 upgrade 要小心：列表里可能混着你依赖链上不急着动的包（甚至连带升掉你 pin 过的依赖）。稳妥做法是 brew outdated 先看清单，只 upgrade 真正需要的几个；对报错的工具再统一 reinstall。",
            bonus:
              "想避免「install 前自动 update 带来意外升级」，可以 export HOMEBREW_NO_AUTO_UPDATE=1 关掉自动更新，改成手动挑时机 brew update。",
          },
          {
            q: "Homebrew 4.0 的 API 模式到底改了什么？为什么大量「替换 homebrew-core.git 远程」的老教程失效了？",
            intent:
              "考版本演进的因果——4.0 是镜像配置的分水岭，说不清 API 模式的人给出的镜像方案往往是无效配置。",
            depth: 3,
            a: "4.0 之前，brew 的包索引就是本地的 homebrew-core git 仓库，update = git pull，所以加速手段是「把 core 仓库远程换成镜像」。4.0 起默认 API 模式：索引改为从 HOMEBREW_API_DOMAIN 拉一份 JSON（默认 formulae.brew.sh/api），core 仓库根本不再克隆到本地（brew config 显示 Core tap: N/A）——没有仓库可换远程，老教程自然失效。新方案只剩两个变量：API_DOMAIN（索引）与 BOTTLE_DOMAIN（二进制）。",
            bonus:
              "API 模式的兜底：manpage 写明镜像暂时不可用时，brew 会回退到默认 API 域名拉元数据——镜像抖动通常表现为慢，而不是直接失败。",
          },
          {
            q: "把镜像变量清理干净、彻底回到官方默认，怎么做才可靠？",
            intent:
              "压轴考配置的全貌意识——镜像配置散落在环境变量与 git remote 两个层面，且两者的还原方式不对称，漏一处就等于没还原。",
            depth: 4,
            a: '分两层还原，且两层不对称。环境变量层：从 shell 配置文件（.zprofile/.zshrc 等）删掉 HOMEBREW_API_DOMAIN、HOMEBREW_BOTTLE_DOMAIN、HOMEBREW_BREW_GIT_REMOTE、HOMEBREW_CORE_GIT_REMOTE，重开终端后 env | grep HOMEBREW 确认无残留。git 层要手动：查 brew update 的实现可知，它只在「变量非默认」时执行 git remote set-url 把远程改写成镜像——变量删掉后它不会主动改回去，需要自己执行 git -C "$(brew --repository)" remote set-url origin https://github.com/Homebrew/brew.git 复位（有 core tap 的机器同样处理）。最后 brew config 复核：ORIGIN 回到官方地址、无 proxy 行，即为干净状态。',
            bonus:
              "这种不对称并不罕见：进入状态是自动的（设了变量 update 就改 remote），退出状态是手动的（删变量不回滚）——凡是「工具按当前配置初始化」的机制大多如此，还原时要以实际落盘状态为准，而不是以配置文件为准。",
          },
        ]}
      />

      <Heading level={2} title="写在最后" />
      <Paragraph>
        镜像与代理的取舍本质是<strong>一致性与带宽的权衡</strong>
        ：镜像用同步延迟换国内速度，代理用节点质量换官方一致。
        同一个问题在别的制品生态里反复出现——Docker 镜像的构建机到部署机、企业内自建制品仓库，都是
        「官方源太慢，中间加一层」的不同形态。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "Nexus 是什么：为什么公司都要自建制品仓库？",
            to: "/note/devtools/docker/registry/nexus",
            description: "镜像加速的企业级形态：自建私服统一代理 npm/PyPI/Docker 等上游源。",
          },
          {
            title: "镜像怎么从构建机到部署机？",
            to: "/note/devtools/docker/registry/image-transport",
            description: "同一问题在 Docker 世界的样子：registry、传输与拉取加速。",
          },
        ]}
      />
    </NoteShell>
  );
}
