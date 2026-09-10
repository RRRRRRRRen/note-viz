import {
  Callout,
  CrossRef,
  DoDont,
  LayerStack,
  MemoryCard,
  Prerequisite,
  Table,
} from "@/components/viz";
import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        「删了就好」是真的，但它有效的原因不是「缓存烂了」，而是<strong>缓存与数据源脱节了</strong>
        ：node_modules 是 lockfile 的缓存，构建缓存是源码和配置的缓存，下载缓存是 registry
        的缓存——任何一层与它的数据源失去同步，就会静默产出错误结果，而删除重装是唯一的手动失效手段。项目里一共有四层这样的缓存，
        <strong>删哪一层有效，本身就是诊断信号</strong>
        ：它告诉你脱节发生在哪。删除之后该追问的是：这一层的 key 漏看了哪个输入？——把迷信式 rm -rf
        变成分层诊断。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "pnpm 凭什么又快又省还封杀幽灵依赖？",
            to: "/note/frontend/engineering/package-management/pnpm-structure",
          },
        ]}
      >
        那篇的 .modules.yaml 环境指纹是本篇「node_modules
        层自愈机制」的主角；本篇把视野扩大到全部四层缓存。
      </Prerequisite>

      <Heading level={2} title="为什么缓存必然可能脱节" />
      <Paragraph>
        缓存的定义是「用一份存下来的结果，代替一次昂贵的重新计算」，它成立的前提是：缓存内容和数据源
        <strong>保持一致</strong>。工程上有两个原因让这个前提无法被绝对保证。其一，
        <strong>缓存的 key 不可能覆盖全部输入</strong>：key
        通常只挑「最可能影响结果的输入」做哈希，没被挑进 key
        的输入变了，缓存照样命中——这是经典的缓存失效难题（计算机科学的老笑话：世上只有两大难题——缓存失效、命名，以及差一错误）。其二，
        <strong>缓存写入不是原子操作</strong>：安装到一半被
        Ctrl-C、磁盘满了、进程崩了，都会留下「一半新一半旧」的半成品状态。
      </Paragraph>
      <Paragraph>
        技术参照是 HTTP 缓存：浏览器敢缓存响应，是因为协议设计了失效机制——ETag
        对不上就重新拉取，Cache-Control 到期就重新验证。缓存的正确性从来不由「缓存本身」保证，而由
        <strong>失效机制</strong>
        保证。前端工程里的这四层缓存，失效机制各有缺口，这正是「删了就好」存在的理由。先认清四层各是什么、数据源是谁：
      </Paragraph>
      <LayerStack
        label="四层缓存 / cache layers"
        title="每层缓存一个数据源：脱节 = 缓存与它的源对不上"
        layers={[
          {
            name: "④ 进程内存态",
            desc: "源 = 磁盘上的一切。dev server / IDE 语言服务持有的模块图、文件监听状态",
            color: PALETTE.gray,
          },
          {
            name: "③ 下载缓存",
            desc: "源 = registry。pnpm store / npm cache，内容寻址 + integrity 校验",
            color: PALETTE.purple,
          },
          {
            name: "② 构建缓存",
            desc: "源 = 源码 + 构建配置。Vite 预构建缓存（node_modules/.vite）、tsc 的 .tsbuildinfo、webpack filesystem cache",
            color: PALETTE.orange,
          },
          {
            name: "① node_modules",
            desc: "源 = lockfile。安装的物化产物，增量式更新",
            color: PALETTE.blue,
          },
        ]}
      />

      <Heading level={2} title="① node_modules 层：增量赃状态与环境指纹" />
      <Paragraph>
        安装是<strong>增量式</strong>的：包管理器对比磁盘现状和
        lockfile，只打补丁。两种情况会留下赃状态：安装过程被打断（Ctrl-C、磁盘满），一半新一半旧；输入在安装之外被换了——切分支后
        lockfile 变了、rebase 回滚了依赖版本、手改了 package.json——磁盘上的树从此不再匹配任何版本的
        lockfile，而包管理器还以为它认识这块地。删除重装强制从 lockfile
        完整重放，赃状态归零——这就是「rm -rf node_modules」的高命中率来源。
      </Paragraph>
      <Paragraph>
        更隐蔽的一类是<strong>环境指纹变化没有触发失效</strong>：原生模块的编译产物绑定 Node 的 ABI
        版本（Node 22 的 ABI 号是 127，可用{" "}
        <code>node -p &quot;process.versions.modules&quot;</code> 实测）。Node 18
        下编译的二进制，切到 22 后加载直接抛 <code>NODE_MODULE_VERSION</code> 不匹配——但「切换 Node
        版本」这个动作发生在 node_modules 之外，缓存层根本感知不到，除非有机制主动比对。pnpm 的
        .modules.yaml 就是这个机制：布局版本、管理器版本、Node 版本、registry
        全部记录在案，任何一项变化自动重新物化。没有指纹机制的生态里，「换 Node
        版本必重装」就得靠人肉纪律。
      </Paragraph>

      <Heading level={2} title="② 构建缓存层：key 不完备的重灾区" />
      <Paragraph>
        Vite 的依赖预构建缓存（<code>node_modules/.vite</code>）、tsc 的 <code>.tsbuildinfo</code>
        、webpack 5 的 filesystem cache，都用「部分输入的哈希」当
        key。但输入集合可能在你没意识的时候变了：构建配置改了、某个插件版本升了、依赖提升顺序变了（npm
        下的提升顺序受安装历史影响）——输入集合变了，key
        没变，命中了不该命中的缓存，产物出现无法解释的差异。典型症状是「重装 node_modules 无效，删掉{" "}
        <code>.vite</code> 或 <code>.tsbuildinfo</code> 就好了」。
      </Paragraph>
      <Paragraph>
        这一层还有个工程卫生问题：构建缓存是<strong>本地产物</strong>
        ，放进版本库就是灾难——它随每次构建变化，持续产生 diff
        噪音，还会把一台机器的缓存状态强加给所有人（相当于替所有人「污染」②层）。凡名称带{" "}
        <code>.cache</code>、<code>.tsbuildinfo</code>、<code>.vite</code>
        的路径，都该出现在 .gitignore 里。
      </Paragraph>

      <Heading level={2} title="③ 下载缓存层：损坏会报错，滞后才静默" />
      <Paragraph>
        pnpm store 和 npm cache 都是内容寻址存储：每个文件按哈希寻址、下载后校验
        integrity——真损坏会当场报错，<strong>不会</strong>
        静默产出不同的结果。所以「缓存坏了导致打包结果不一样」这个流行归因，在下载缓存这一层基本不成立。真正静默的不一致来自更上游：
        <strong>镜像源滞后</strong>
        。团队里一半人走官方源、一半人走镜像源，镜像同步滞后的窗口期内，同一个版本区间可能解析、下载到不同的实际内容——删缓存重拉只是碰巧拿到了同一份，把
        registry 写进项目级 .npmrc 统一来源才是治本。
      </Paragraph>

      <Heading level={2} title="④ 进程内存态：最容易被记错账的一层" />
      <Paragraph>
        dev server 长时间运行后文件监听失灵、分支切换后内存里的模块图还是旧的、IDE 的 TypeScript
        服务拿着过期信息报幽灵错误——这类问题的正解是<strong>重启进程</strong>。但「删 node_modules
        重装」的操作流程里必然包含重启，于是功劳被记在了删除头上。下次遇到「玄学错误」，先重启 dev
        server 和编辑器语言服务——这是成本最低、最该先试的一步，而不是最后的「大招」。
      </Paragraph>

      <Heading level={2} title="诊断速查表：按症状定位该删哪层" />
      <Table
        label="删哪层 / triage"
        head={["症状 / 报错特征", "脱节层", "动作"]}
        rows={[
          [
            "NODE_MODULE_VERSION 不匹配（换 Node 版本后出现）",
            "① 环境指纹",
            "重装 node_modules；pnpm 的指纹机制可自动兜住",
          ],
          [
            "分支切换后行为诡异；安装曾中途被打断",
            "① 增量赃状态",
            "重装 node_modules；日常改用严格安装模式",
          ],
          [
            "重装 node_modules 无效；删 .vite / .tsbuildinfo 有效",
            "② 构建缓存",
            "删对应构建缓存目录；确认其已进 .gitignore",
          ],
          [
            "integrity 校验失败 / 找不到某版本",
            "③ registry / 镜像",
            "查镜像源同步状态；项目级 .npmrc 固化 registry",
          ],
          ["重启 dev server 或编辑器就好", "④ 进程内存态", "重启进程，别删任何东西"],
        ]}
      />
      <DoDont
        label="遇到玄学错误 / triage order"
        dont={{
          code: `$ rm -rf node_modules
$ rm -rf ~/.pnpm-store   # 连全局 store 一起轰
$ pnpm install           # 五分钟后，问题没了
# 但不知道是哪层的问题，下次还会犯`,
          note: "全家桶式清理有效但零信息量：既慢（store 全部重新下载），又放弃了定位真凶的机会",
        }}
        do={{
          code: `1. 重启 dev server / TS server   # ④ 层，10 秒
2. 删 node_modules 重装           # ① 层，1 分钟
3. 删 node_modules/.vite          # ② 层，30 秒
# 从便宜到贵逐层试，命中的那层
# 就是脱节层——顺手记下症状`,
          note: "按成本排序逐层排除：每一次「删了就好」都变成一次可复用的诊断样本",
        }}
      />
      <Callout kind="tip" title="把删除制度化">
        与其依赖肌肉记忆，不如给项目配一个语义明确的 reset 任务（如 mise.toml 里的 tasks.reset：删
        node_modules 与构建缓存 → 严格模式重装）。「核弹按钮」有名字、有边界，团队里的使用才会一致。
      </Callout>

      <MemoryCard keyword="删除 = 手动失效">
        缓存有效的前提是与数据源一致；失效机制有缺口时，「删了重装」就是最后的手动失效手段。它有效不等于缓存坏了。
      </MemoryCard>
      <MemoryCard keyword="删哪层有效 = 诊断信号" color={PALETTE.purple}>
        四层缓存各有数据源：删 node_modules 有效指向 lockfile 脱节；删构建缓存有效指向 key
        不完备；重启进程有效指向内存态。按成本从低到高逐层试。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "「删了重装」为什么几乎总能解决问题？",
            intent: "热身题——能说清「它为什么有效」的人，才不会被「缓存背锅」的流行说法带偏。",
            depth: 1,
            a: "因为它把所有本地派生状态强制归零、从真源完整重放：node_modules 按 lockfile 重物化，构建缓存重建，内存态重启后重建。相当于把「过程状态」全部丢弃、只保留「声明与事实」。这也解释了它为什么是最后手段而不是首选：它不区分哪一层脱节，代价是全部重算。",
            bonus:
              "重放能成立的前提是真源本身正确——lockfile 没脱节、配置没被误提交。真源错了，删多少遍都没用。",
          },
          {
            q: "怎么判断该删 node_modules 还是只删 node_modules/.vite？",
            intent: "考①层与②层的症状差异——这是「删哪层」诊断法的核心应用。",
            depth: 2,
            a: "看症状指向谁的数据源：报错与依赖相关（模块找不到、NODE_MODULE_VERSION 不匹配、依赖行为不对）→ ①层，重装 node_modules；重装后依旧不对、且症状与打包产物相关（预构建报错、样式错乱、transform 结果异常）→ ②层，删 node_modules/.vite 让预构建重建。顺序上先①后②，因为①便宜且常见；两个都无效再考虑③（registry）和④（重启进程）。",
            bonus:
              ".vite 缓存的 key 已包含 lockfile 哈希等输入，但配置类输入覆盖不全——所以「装了新依赖却没重新预构建」时它最常翻车。",
          },
          {
            q: "下载缓存（pnpm store / npm cache）会静默导致不一致吗？",
            intent: "辨析题——把「缓存损坏」与「镜像源滞后」分开，这是国内团队最实际的误区。",
            depth: 2,
            a: "基本不会。两者都是内容寻址存储，文件按哈希寻址、下载时校验 integrity，损坏会当场报错而不是静默产出不同结果。真正静默的不一致来自镜像源滞后：同一版本号在官方源和滞后镜像上内容不同步的窗口期内，不同人可能拿到不同字节。所以治理对象不是本地缓存，而是 registry 的一致性——项目级 .npmrc 固化来源。",
            bonus:
              "pnpm store status 可校验 store 中包的完整性；pnpm store prune 清理不再被引用的文件。",
          },
          {
            q: "「删了就好」之后，专业的下一步是什么？",
            intent:
              "压轴题，把本篇从诊断术升级为工程方法论——也是面试里区分「用过」和「精通」的地方。",
            depth: 3,
            a: "回答「哪一层的 key 漏看了哪个输入」，然后制度化修复：①层脱节 → 推严格安装模式，让增量赃状态被指纹机制或全量重放兜住；②层 key 不完备 → 升级构建工具版本（key 覆盖往往随版本改善）或把易变输入显式纳入缓存 key，同时确认构建产物已进 .gitignore；③层 → 固化 registry；④层 → 把「先重启再排查」写进团队排障手册。每一次玄学问题都应产出一条制度，而不是下一次玄学。",
            bonus:
              "团队视角：维护一份「症状 → 脱节层 → 处方」的活文档，新人的「删了重装」就从巫术变成了带检查表的工程流程。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "nvm、fnm、Volta、mise 差在哪？",
            to: "/note/frontend/engineering/package-management/version-managers",
            description:
              "①层的环境指纹问题源头是「Node 版本切换」——版本管理器就是管理这个切换的工具。",
          },
        ]}
      />
    </NoteShell>
  );
}
