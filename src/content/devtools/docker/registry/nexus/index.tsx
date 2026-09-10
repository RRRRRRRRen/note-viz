import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo";
import { Callout, CrossRef, DoDont, MemoryCard, SpecQuote } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        Nexus 是一台<strong>自建的私有制品仓库服务器</strong>
        ：把 npm registry、Docker Hub、Maven Central
        这类公共仓库的能力搬进公司内网，一台服务同时充当 npm 私服、Maven 仓库和 Docker
        Registry，官方支持 20 多种包格式（据 Sonatype
        官方文档）。公司要自建它，是因为公共源在规模面前有四个绕不开的问题：外网依赖慢且抖、私包没处放、依赖入口不可控、制品不可追溯。而理解这台服务器只需要抓住三种仓库角色：
        <strong>proxy</strong> 缓存外网公共源、<strong>hosted</strong>{" "}
        存放自家制品（发布的唯一目的地）、<strong>group</strong> 把前两者拼成对外的统一 URL。
      </Conclusion>

      <Heading level={2} title="为什么需要私有仓库" />
      <Paragraph>
        每次 <code>npm install</code>，包来自 registry.npmjs.org；每次 <code>docker pull</code>
        ，镜像来自 Docker Hub。个人项目这样没问题，但换到公司场景，公共源有四个绕不开的问题：
      </Paragraph>
      <List
        items={[
          <>
            <strong>外网依赖慢且抖</strong>
            ——几百个开发者每天重复下载同一批包，公共源限流、网络抖动、服务故障，任何一样都会让全公司
            CI 排队干等。
          </>,
          <>
            <strong>私包没处放</strong>
            ——内部工具库、未开源的业务镜像不能发公共源（内部私有包发到公共源等于公开源码，Docker Hub
            私有仓库有配额限制），总不能靠拷贝目录传包。
          </>,
          <>
            <strong>依赖入口不可控</strong>
            ——每台开发机各自直连外网，供应链攻击面就是所有机器；哪个包是谁在什么时候引入的，无从审计。
          </>,
          <>
            <strong>制品不可追溯</strong>
            ——线上跑的镜像是哪个版本、从哪台机器构建的、依赖里有没有被动过手脚，公共源体系回答不了。
          </>,
        ]}
      />
      <Paragraph>
        解法是把「仓库」收口成公司内网的一台服务器：所有人的下载和发布只跟它打交道。Nexus（Sonatype
        出品，社区版 OSS 免费）就是干这个的软件——公司里
        Java、前端、运维各用各的生态，它一台全接住：npm、Maven、Docker、PyPI、Go、Helm 等 20
        多种格式（据 help.sonatype.com 的支持格式列表）。它本身也常以 Docker
        容器的形式部署（官方镜像 <code>sonatype/nexus3</code>），数据挂 volume。
      </Paragraph>

      <Heading level={2} title="三种仓库角色：proxy · hosted · group" />
      <Paragraph>
        Nexus 里的「仓库」是一个可以任意新建的实例，而不是一个生态一个池子：你可以建 3 个 npm
        仓库、2 个 Docker
        仓库，每个实例都必须是三种角色之一。这三个词是整台服务器的骨架，官方定义如下：
      </Paragraph>
      <SpecQuote source="Sonatype Nexus Repository 官方文档 · Repository Types">
        <p>&quot;A proxy repository caches content from a remote repository.&quot;</p>
        <p>
          &quot;A hosted repository is a repository that stores components in Nexus Repository as
          the authoritative location.&quot;
        </p>
        <p>
          &quot;A group repository combines multiple repositories, including other repository
          groups, into a single repository.&quot;
        </p>
      </SpecQuote>

      <Heading level={3} title="proxy：外网源的缓存与收口" />
      <Paragraph>
        proxy 缓存外网公共源：有人第一次要 <code>lodash</code>，它去 npmjs
        拉一份存下来；之后全公司所有人要 <code>lodash</code>{" "}
        都直接命中缓存，不再出外网。机制上可以拿 HTTP
        缓存来对照（=给外网仓库加了一层带过期策略的浏览器缓存/CDN）：本地有且未过期就直出，过期了拿版本信息回源核对——Nexus
        里的 Maximum Component Age / Maximum Metadata Age
        配置就是「缓存多久后需要回源检查」的过期语义（据官方文档 Repository Types）。
      </Paragraph>
      <Paragraph>
        两个价值：一是<strong>快和稳</strong>——同一个包的回源从几百人次收敛成 1
        次，公共源抖动不再传导到每一次构建；二是<strong>收口</strong>
        ——外网依赖有了唯一进口，审计、白名单、断网构建这些能力都从这里才谈得上。注意 proxy
        是只读的，使用方不能向它发布任何东西。
      </Paragraph>

      <Heading level={3} title="hosted：自家制品的权威存放点" />
      <Paragraph>
        hosted 是自家制品的<strong>权威存放点</strong>（官方措辞 authoritative
        location）：内部工具库 <code>npm publish</code> 到这里，业务镜像 <code>docker push</code>{" "}
        到这里。还有一种容易被忽略的用途——存放公共源没有、或不允许二次分发的东西，官方文档给的例子是商业数据库驱动：买来的
        jar 包不能随意转发到外网，得有个内网地方统一存放、统一分发。
      </Paragraph>

      <Heading level={3} title="group：使用方看到的统一门面" />
      <Paragraph>
        group 本身不存任何东西，是一个<strong>组合视图</strong>：把若干 proxy 和 hosted 拼成一个
        URL，查找时按成员列表顺序依次检索（官方文档明确 search order
        按成员顺序）。经典布局是给使用方一个 <code>npm-public</code> 组：成员先后是
        npm-internal（hosted）和 npm-proxy（proxy）——<code>npm install</code> 只配 group
        这一个源地址，先命中内网私包、再落缓存、最后才是 proxy 回源，使用方完全不用关心
        「这个包到底在哪个仓库」。
      </Paragraph>

      <FlowChart
        label="三种角色协作拓扑 / nexus repo types"
        height={380}
        data={{
          direction: "TB",
          nodes: [
            { id: "client", label: "开发机 / CI：只配一个源地址", color: "#1677ff" },
            { id: "group", label: "group 统一门面（不存数据）", color: "#8b5cf6" },
            { id: "hosted", label: "hosted：内部私包 / 业务镜像", color: "#3fb950" },
            { id: "proxy", label: "proxy：外网源缓存（只读）", color: "#f59e0b" },
            { id: "remote", label: "npmjs / Docker Hub（外网）", color: "#9ca3af" },
          ],
          edges: [
            { source: "client", target: "group", label: "install / pull（拉取）" },
            {
              source: "client",
              target: "hosted",
              label: "publish / push（发布直达）",
              dashed: true,
            },
            { source: "group", target: "hosted", label: "① 先查内部" },
            { source: "group", target: "proxy", label: "② 未命中走代理" },
            { source: "proxy", target: "remote", label: "③ 仍未命中则回源", dashed: true },
          ],
        }}
      />
      <Paragraph>
        一次 <code>npm install</code> 的寻址顺序就是这张图自上而下：group 先查
        hosted（内部包优先，防止被同名包覆盖），未命中交给 proxy，proxy
        缓存有就直出、没有才出外网——外网流量被收敛成「缓存未命中的那一次」。发布（publish/push）则绕过
        group 直达 hosted，因为自家制品的权威存放点只能有一个。
      </Paragraph>
      <MemoryCard keyword="proxy 收口、hosted 权威、group 组合" color="#1677ff">
        <p>
          三个词覆盖 Nexus 90% 的日常问题：「包从哪来」→ proxy（外网缓存）；「包发到哪」→
          hosted（权威存放）；「源地址填哪个」→
          group（统一门面）。其余能力（权限、清理、扫描）都是挂在这三种角色上的运维配置。
        </p>
      </MemoryCard>

      <Heading level={2} title="边界与陷阱" />
      <DoDont
        label="Docker 仓库端口陷阱 / connector port"
        dont={{
          code: "docker login nexus.corp.com:8081",
          note: "8081 是 Nexus 主端口，按 /repository/仓库名/ 路径区分仓库——而 Docker 客户端不允许 URL 里带仓库路径，登录与拉取全部失败。",
        }}
        do={{
          code: "docker login nexus.corp.com:8082",
          note: "每个 Docker 仓库配独立的「连接器」端口（8082 → docker-hosted），或用子域名连接器按域名分流（据官方文档 Docker Registry）。",
        }}
      />
      <Paragraph>
        为什么会这样：npm、Maven 的仓库地址可以带路径（<code>域名/repository/npm-public/</code>
        ），Docker 客户端却把 registry 地址写死为「根路径 + 命名空间/镜像名」——同一个端口装不下多个
        Docker 仓库，Nexus 只好用端口（或子域名）来区分。这是自建 Nexus 后最常撞的第一堵墙：docker
        login 打到 8081 报错，查半天以为自己配错了仓库。
      </Paragraph>
      <DoDont
        label="proxy ≠ 安全体检 / supply chain"
        dont={{
          code: "依赖只从 proxy 进 = 供应链安全达标",
          note: "收口只是入口管理，不含体检——一个被投毒的包一旦进入缓存，会被分发给全公司。",
        }}
        do={{
          code: "proxy 收口 + 扫描与白名单策略",
          note: "在入口之上叠加漏洞扫描、来源白名单、发布审批，收口是前提不是全部。",
        }}
      />
      <DoDont
        label="仓库不是备份 / storage ops"
        dont={{
          code: "镜像 push 上去就永久在了",
          note: "Nexus 依赖所在磁盘 / volume：磁盘满 = 全公司构建瘫痪；proxy 缓存默认只增不减。",
        }}
        do={{
          code: "独立 volume + 磁盘监控 + 清理策略",
          note: "按仓库配清理任务（如只保留最近 N 个快照版本），把磁盘水位当核心监控项。",
        }}
      />
      <Callout kind="warning" title="断网 ≠ 全部可用">
        proxy 的「离线构建」能力有前提：只有<strong>缓存命中</strong>
        的组件才离线可用，缓存未命中的包在断网时照样拉不到。真要对外网故障免疫，得靠提前预热缓存（断网前完整跑一遍全量构建），而不是装上
        proxy 就完事。
      </Callout>

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "hosted 和 proxy 仓库各自放什么？",
            intent: "热身题：三种角色是一台 Nexus 的骨架，先确认最基本的分工有没有建立起来。",
            a: "hosted 放自家制品，是内部包和业务镜像的权威存放点，publish/push 打到这里；proxy 放外网公共源的缓存，只读、不能发布。判断方法很简单：看东西的源头是自己还是外网——是自己就进 hosted，是外网的就是 proxy 的缓存。",
            bonus:
              "group 不是存储实体，不存任何组件，只是把多个仓库拼成一个 URL 的组合视图——它不能替代前两者的任何功能。",
            depth: 1,
          },
          {
            q: "为什么 npm 仓库共用一个端口就行，Docker 仓库却要每个单独配端口？",
            intent:
              "考察对 Docker 客户端 URL 约束的理解——这是自建 registry 最常撞的墙，答得出「客户端不允许路径路由」说明真读懂了。",
            a: "因为 Docker 客户端不允许 registry 地址里带仓库路径：它把地址写死为「根路径 + 命名空间/镜像名」，而 Nexus 默认靠 /repository/仓库名/ 这样的路径区分仓库，两者天然冲突。npm、Maven 的客户端支持路径式地址，所以全走 8081 主端口；Docker 只能另开通道——每个 Docker 仓库配独立的端口连接器（或子域名连接器），按端口把流量导到对应仓库。",
            bonus:
              "Nexus 3.83.0 起新增了 Docker 的路径路由支持，但同一部署里混用多种路由类型不被支持；存量运维口径仍是「一个 Docker 仓库一个端口」。",
            depth: 2,
          },
          {
            q: "CI 构建出的镜像，docker push 应该打到 group、hosted 还是 proxy？",
            intent:
              "承接上一题的连接器分工，看能否把「读走 group、写走 hosted」的语义准确落到发布动作上。",
            a: "打到 hosted（发布目标是权威存放点，自家制品的「家」只能有一个）。proxy 是只读缓存，语义上不可能接收发布；group 的本职是给拉取方一个统一 URL，发布永远落到其成员 hosted。",
            bonus:
              "新版 Nexus 文档化了「推送到 Docker group」的能力（由 group 路由到目标成员仓库；Pro 功能，OSS 社区版发布仍直达 hosted），但团队约定仍建议发布直达 hosted：少一层路由语义，权限边界也更清晰。",
            depth: 3,
          },
          {
            q: "proxy 缓存被投毒了怎么办？一个带恶意代码的上游版本被 Nexus 缓存后，如何止损、如何防复发？",
            intent:
              "进阶题：把「收口」反转成风险面——proxy 放大了好包的分发效率，也放大了坏包的；考察能否给出止损与防复发的完整动作链。",
            a: "止损三步：① 摘除——删除该恶意版本（hosted 可直接删，proxy 缓存用 Invalidate cache 强制丢弃，回源时该版本若已被上游下架即拉不到）；② 钉住——依赖以 lockfile 钉到已知良好版本，CI 拒绝 lockfile 之外的浮动升级；③ 排查——按 Nexus 访问记录找出投毒窗口内拉过该版本的构建与制品，评估波及面。防复发是另一层：proxy 只指向官方上游（不配来路不明的源）、CI 里叠加依赖审计（npm audit、外挂漏洞扫描）——收口解决的是「入口唯一」，安全还要求「入口有检查」。",
            bonus:
              "判断波及面的一条线索是 Nexus 的访问记录：谁在何时拉过被投毒的版本——这正是「制品不可追溯」痛点在私服上被解掉的部分。",
            depth: 4,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        到这里，「这台服务器是什么、里面怎么分工」已经清楚。下一个自然的问题是：
        <strong>镜像到底怎么沿着通道从构建机流转到部署机</strong>
        ——救急时为什么用 save/load 人工搬 tar 包，日常为什么必须走仓库
        push/pull？那条通道上，本篇的仓库正是中转站。通道走通之后，还可以追问一句：这类仓库工具之间（Nexus、Harbor、Verdaccio……）该怎么挑。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "镜像怎么从构建机到部署机？",
            to: "/note/devtools/docker/registry/image-transport",
            description:
              "下一个问题：save/load 与 push/pull 两条通道的机制与取舍——仓库正是正规通道的中转站。",
          },
          {
            title: "制品仓库怎么选：Nexus 还是专项工具？",
            to: "/note/devtools/docker/registry/registry-selection",
            description: "通道走通后的追问：五个主流工具的定位边界与选型决策轴。",
          },
        ]}
      />
    </NoteShell>
  );
}
