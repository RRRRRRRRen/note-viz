import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { Callout, CrossRef, DoDont, MemoryCard, Prerequisite, Table } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Prerequisite
        notes={[
          {
            title: "Nexus 是什么：为什么公司都要自建制品仓库？",
            to: "/note/devtools/docker/registry/nexus",
          },
        ]}
      >
        选型前先知道私有仓库是什么、三种仓库角色怎么分工——本篇只回答「挑哪个」。
      </Prerequisite>

      <Conclusion>
        一条决策轴：<strong>先数制品种类，再定安全深度</strong>
        。只有 npm 用 Verdaccio；只要镜像存储，个人用 registry:2、团队用 Harbor；两种以上生态用
        Nexus 一台全包；K8s 重度、要扫描签名准入时补 Harbor；企业级合规与多站点复制才轮到
        Artifactory。没有万能赢家，只有「最小满足」。
      </Conclusion>

      <Heading level={2} title="五个工具各自站在哪" />
      <Paragraph>
        <strong>Nexus</strong>（Sonatype
        出品）是「一台管所有格式」的多面手：npm、Maven、Docker、PyPI、Go、Helm 等 20
        多种格式统一入口，社区版 OSS 免费自建。<strong>Harbor</strong>{" "}
        是容器专属的云原生镜像仓库、CNCF 毕业项目：OCI 镜像与 Helm Chart
        之外什么都不管，换来的是安全纵深——Trivy 漏洞扫描、镜像签名、
        「未签名镜像不准上生产」的策略门禁。<strong>Verdaccio</strong> 是极简 npm
        私服：零配置启动、无需数据库，上游代理缓存 npmjs（据 verdaccio.org 官方定位），但出了 npm
        生态就无能为力。<strong>registry:2</strong> 是 Docker 官方的最小
        Distribution：一个纯镜像存储进程，无 UI、无权限、无清理策略。
        <strong>JFrog Artifactory</strong> 是企业级通用制品平台：全格式之外卖的是治理——Xray
        深度扫描、多站点复制、合规审计与商业支持。
      </Paragraph>
      <Table
        label="制品仓库选型速查"
        head={["工具", "定位", "管什么", "什么时候选它"]}
        rows={[
          [
            "Nexus",
            "多格式制品仓库",
            "npm / Maven / Docker / PyPI / Go 等 20+ 格式",
            "多技术栈要统一入口；OSS 版免费，一台全包",
          ],
          [
            "Harbor",
            "云原生镜像仓库（CNCF 毕业项目）",
            "OCI 镜像、Helm Chart",
            "K8s 重度场景，要漏洞扫描、镜像签名、部署策略门禁",
          ],
          ["Verdaccio", "轻量 npm 私服", "仅 npm", "前端小团队快速起步，零配置启动"],
          [
            "registry:2",
            "Docker 官方最小 Registry",
            "仅镜像",
            "只要纯镜像存储，不需要 UI 与权限管控",
          ],
          [
            "JFrog Artifactory",
            "企业级通用制品平台",
            "全格式 + 商业支持",
            "大规模企业的合规审计、多站点复制、深度扫描",
          ],
        ]}
      />
      <Paragraph>
        registry:2 和 Verdaccio 的共同点值得点破：它们都是<strong>单一生态的最小实现</strong>
        ——这正是它们轻的原因，也是边界所在。生态一旦越界（Verdaccio 碰镜像、registry:2
        碰权限治理），就该换位置的信号就出现了。
      </Paragraph>

      <Heading level={2} title="决策轴：格式广度 × 安全深度" />
      <Paragraph>
        <strong>轴一：格式广度。</strong>
        先盘点公司要管哪些制品。只有 npm → Verdaccio 足够；只有镜像 → 个人实验 registry:2、团队或
        K8s 场景用 Harbor；两种以上生态（前端 npm + Java Maven + 运维镜像，几乎是公司的标配组合）→
        Nexus 起步，一个入口管全部，省掉 N 套工具的运维。
      </Paragraph>
      <Paragraph>
        <strong>轴二：安全深度。</strong>
        只要「依赖入口收口」→ Nexus OSS 的三角色就够；要漏洞扫描、镜像签名、不准未签名镜像上生产 →
        Harbor（或商业路线 Artifactory + Xray）。两轴都拉满时，答案往往是
        <strong>并存而非二选一</strong>
        ：大厂常见 Harbor 专管镜像（运行时分发 + 安全纵深），Nexus 或 Artifactory
        管其余格式（企业治理）——分开部署，各自站在最优区间。
      </Paragraph>
      <MemoryCard keyword="先数制品，再看安全" color={PALETTE.blue}>
        <p>
          选型只问两件事：①要管几种制品？决定「专项工具还是全家桶」；②安全要多深？决定「开源 OSS
          够不够、要不要 Harbor 或商业版」。两问的答案直接落在工具格子里——不看出身，不看名气。
        </p>
      </MemoryCard>

      <Heading level={2} title="边界与陷阱" />
      <DoDont
        label="按名气选型 / by brand"
        dont={{
          code: "大厂都用 Artifactory，我们也上",
          note: "企业级平台的运维与授权成本对小团队是反噬——它在为合规审计、多站点复制这些你还没有的问题付费。",
        }}
        do={{
          code: "先盘点：npm？镜像？Maven？",
          note: "按制品种类选：单一生态用专项工具，多生态用 Nexus 一台全包起步，规模到了再加码。",
        }}
      />
      <DoDont
        label="registry:2 当企业仓库 / minimal trap"
        dont={{
          code: "docker run -d -p 5000:5000 registry:2",
          note: "无 UI、无权限、无清理策略——镜像谁都能推、磁盘满了没人知道。它只适合个人实验。",
        }}
        do={{
          code: "企业及格线 = 权限 + 可视 + 清理",
          note: "多用户、多项目环境至少选带认证、界面与磁盘治理的工具（Nexus / Harbor）。",
        }}
      />
      <Callout kind="warning" title="有仓库 ≠ 有安全">
        Harbor 的扫描、签名、准入是<strong>能力上限</strong>
        ，不是装完默认生效——策略不配照样裸奔；Nexus OSS
        同样不带镜像漏洞扫描。把「我们有自己的仓库了」当成安全达标，是选型环节最后的错觉。
      </Callout>

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "Verdaccio 零配置又免费，为什么不能顺手拿来管 Docker 镜像？",
            intent:
              "热身题：确认「工具绑定生态协议」这个根子——不是功能多少的问题，是协议实现的问题。",
            a: "因为 Verdaccio 是 npm 生态的专用实现，说 npm 的协议（tarball 分发、npm publish/packument 语义）；Docker 镜像走的是另一套分发协议（OCI distribution spec，manifest + blob 拉取）。两者从存储结构到客户端交互完全不同——不是 Verdaccio「不想」管镜像，是 docker 客户端根本不会跟它对话。管镜像的最小实现是 registry:2，不是它。",
            bonus:
              "OCI（Open Container Initiative）distribution 规范是镜像仓库的通用语言：Harbor、registry:2、Nexus 的 Docker 仓库、云厂商镜像服务都说这门语言，所以 docker 客户端可以无差别对接。",
            depth: 1,
          },
          {
            q: "同样都「有 UI、有权限」，Harbor 和 Nexus 的能力分界在哪？",
            intent:
              "考察能否超越「都是仓库」的表面相似，说出两者各自的最优区间——这是两轴决策法能不能落地的关键。",
            a: "分界在管什么与深到哪：Harbor 容器专属但安全纵深强——Trivy 扫描、镜像签名、部署策略门禁是原生能力；Nexus 格式广（20+ 生态一个入口）但 OSS 版不带镜像漏洞扫描。所以容器占绝对大头、K8s 重度 → Harbor；多生态要统一入口 → Nexus；两头都要 → 并存。",
            bonus:
              "Nexus 的镜像扫描在商业版里（Pro 层），开源团队常用组合是 Nexus 管包 + 外挂 trivy 在 CI 里扫镜像——用流水线补齐 Harbor 式能力。",
            depth: 2,
          },
          {
            q: "为什么很多大厂让 Harbor 和 Artifactory 并存，而不是统一成一家？",
            intent:
              "收束题：考察能否理解「组合优于单一」背后的决策逻辑——统一入口的收益 vs 单点工具的深度损失。",
            a: "因为两者的最优区间不重叠：容器运行时分发要的是扫描、签名、准入策略（Harbor 的主场），全格式企业治理要的是合规审计、多站点复制、统一权限（Artifactory 的主场）。强行统一成一家，必然有一头退化为「凑合能用」——统一入口省下的运维成本，抵不过深度能力损失的坑。并存时两者各有清晰职责，边界反而更干净。",
            bonus:
              "中小团队的对应折中是 Nexus 一台全包：放弃 Harbor 的安全纵深，换取「只运维一套」的简单——决策轴没变，只是权重不同。",
            depth: 3,
          },
          {
            q: "团队已用 Nexus OSS 管镜像，现在要扫描、签名、准入——从 Nexus 迁到 Harbor 的稳妥路径是什么？",
            intent:
              "实战收束：选型不是一次性决策——考察能否给出带迁移成本的演进路径，而不是「推倒重来」或「永远凑合」两个极端。",
            a: "按「新版本只进新仓库、旧版本按需迁移」四步走：① Harbor 建好项目与权限后，把 CI 的 push 目标切到 Harbor，新版本只进新仓库；② 在用的存量 tag 用 skopeo copy 搬进 Harbor，历史版本留在 Nexus 只读归档、不搬；③ 迁移期运行侧双仓库并行，等 Pod 随滚动更新自然改指 Harbor 后，把 Nexus 的 Docker hosted 关掉发布权限、降级为归档；④ npm/Maven 等其余格式原地不动——迁移只发生在「安全深度不够」的镜像这条线上，格式广度的职责仍在 Nexus。这正是决策轴的用法：安全深度缺口归 Harbor，多格式收口留 Nexus。",
            bonus:
              "镜像搬运优先用 skopeo copy 而非 pull→push：不经本地 Docker 守护进程、不落盘，且完整保留架构信息与 digest——跨仓库同步是它的本职。",
            depth: 4,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        选型至此收口。最好的验证是动手：把 Nexus 用 <code>docker run</code> 跑起来（官方镜像{" "}
        <code>sonatype/nexus3</code>，数据挂 volume），建一个 hosted、一个 proxy、一个 group
        ，把自己的前端镜像 push/pull
        走一遍——三角色怎么协作、通道怎么跑，两个姊妹篇正好是操作时的对照手册。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "Nexus 是什么：为什么公司都要自建制品仓库？",
            to: "/note/devtools/docker/registry/nexus",
            description: "选出来的这台服务器内部怎么运转：proxy / hosted / group 三角色协作拓扑。",
          },
          {
            title: "镜像怎么从构建机到部署机？",
            to: "/note/devtools/docker/registry/image-transport",
            description: "仓库在部署链路里的位置：save/load 与 push/pull 两条通道的取舍。",
          },
        ]}
      />
    </NoteShell>
  );
}
