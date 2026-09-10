import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo";
import {
  Callout,
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
} from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        两条通道：
        <strong>
          救急用 <code>docker save/load</code> 人工搬 tar 包，日常用仓库 push/pull
        </strong>
        。save 把镜像的完整分层和元数据打成
        tar、零基础设施依赖，但丢掉制品语义——版本谱系、来源、分发能力全没了；push/pull 以 registry
        为中心，把镜像当「制品」管理，是 CI/CD 的标准环节。多机部署里 registry
        中转站省不掉：只要不止一台机器要 pull、或流程要自动化，人工搬运就到顶了。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "Docker 的镜像、容器、仓库是什么关系？",
            to: "/note/devtools/docker/registry/image-container-registry",
          },
        ]}
      >
        传输搬运的就是镜像这个分层包：三个概念的关系是所有搬运方式的地图。
      </Prerequisite>

      <Heading level={2} title="通道一：save/load——零依赖的文件搬运" />
      <Paragraph>
        三个命令的骨架：<code>docker save</code> 把镜像打成 tar 包（一个 tar
        可以装多个镜像，大镜像可配 gzip 压体积），scp 或 U 盘物理拷到目标机，
        <code>docker load</code> 导回本地镜像库。它存在的意义是
        <strong>零依赖</strong>：目标机不需要网络可达任何仓库、不需要任何账号权限，一个 tar
        包就是全部——新环境交付、离线隔离机房、网络故障救急，都是它的主场；很多公司的内网仓库，第一批基础镜像历史上也是这么灌进去的。
      </Paragraph>
      <Paragraph>
        与 export 的分界是最常见的混淆点：<code>save/load</code> 操作<strong>镜像</strong>
        ，完整保留分层图与元数据（history、CMD、tag）；<code>export/import</code> 操作
        <strong>容器的文件系统</strong>
        ，把所有层打平成一个单层快照，history、CMD、tag 全部丢失。前者是「把镜像搬过去」，后者是
        「把这个容器当下的文件系统状态快照下来」——镜像搬运一律用 save/load（据 Docker
        官方文档对两组命令的定位）。
      </Paragraph>

      <Heading level={2} title="通道二：push/pull——以仓库为中心的制品流转" />
      <Paragraph>
        正规通道的骨架：构建机 <code>docker build</code> 完直接 <code>docker push</code> 到
        registry，部署机从同一个地址 <code>docker pull</code>。tag 与 digest 构成版本谱系（tag
        指向版本、digest 锁定唯一内容），push/pull 是标准化的 API 语义，CI
        流水线原生集成——有哪些版本、谁推的、什么时候推的，仓库服务端全部可查。
      </Paragraph>
      <FlowChart
        label="镜像两条流转通道 / image transport"
        height={400}
        data={{
          direction: "TB",
          nodes: [
            { id: "ci", label: "构建机：docker build", color: PALETTE.blue },
            {
              id: "reg",
              label: "Registry：镜像唯一的家（tag / digest / 推送记录）",
              color: PALETTE.green,
            },
            { id: "dep", label: "部署机：pull → run", color: PALETTE.blue },
            { id: "save", label: "docker save → tar 包", color: PALETTE.orange },
            { id: "scp", label: "scp / U 盘人工拷贝", color: PALETTE.orange },
            { id: "load", label: "目标机 docker load", color: PALETTE.orange },
          ],
          edges: [
            { source: "ci", target: "reg", label: "push（日常通道）" },
            { source: "reg", target: "dep", label: "pull：版本可查、可回滚" },
            { source: "ci", target: "save", label: "save（救急通道）", dashed: true },
            { source: "save", target: "scp" },
            { source: "scp", target: "load" },
            { source: "load", target: "dep", label: "导入本地，无服务端账本", dashed: true },
          ],
        }}
      />
      <Paragraph>
        两条通道的分野一目了然：上半条搬的是「文件」——tar
        包拷完即终点，没有任何服务端状态；下半条管的是「制品」——仓库有一本账：有哪些
        tag、谁推的、什么时候。把差异压进四个维度：
      </Paragraph>
      <CompareTable
        label="镜像两种流转通道 / save-load vs registry"
        left={{ title: "save / load 人工搬运", color: PALETTE.orange }}
        right={{ title: "仓库 push / pull", color: PALETTE.green }}
        rows={[
          {
            aspect: "版本管理",
            left: "tag 覆盖即丢，历史靠人记",
            right: "tag + digest 原生版本谱系，可回滚",
          },
          {
            aspect: "自动化",
            left: "脚本搬运，无标准语义",
            right: "build → push → pull 是 CI/CD 标准环节",
          },
          { aspect: "多机协作", left: "每台机人肉传一遍", right: "任何机器一条 pull 命令拉取" },
          { aspect: "适用场景", left: "救急、离线隔离环境、一次性迁移", right: "企业日常部署通道" },
        ]}
      />

      <Heading level={2} title="registry 中转站为什么省不掉" />
      <Paragraph>
        单机部署确实可以完全绕开仓库：构建机上 save，scp 到目标机 load，一步到位——这时 registry
        是纯开销。但条件稍微放宽它就失效：部署节点多于一个，每个节点都要人肉传一遍；要回滚，就得翻出历史
        tar 包对着文件名猜；要回答「线上跑的到底是哪个版本」，tar 包给不出任何凭证。
      </Paragraph>
      <Paragraph>
        多机与自动化场景里，仓库是所有能力的锚点：每个部署节点都要能 pull、CI 每次构建都要
        push、镜像来源校验（digest、签名）要以仓库为前提。所以企业部署脚本里「构建完 push
        到内网私有仓库」那个动作不是仪式，是整条通道的枢纽——单机可以直灌，多机必经仓库。
      </Paragraph>
      <MemoryCard keyword="save 搬文件，仓库管制品" color={PALETTE.green}>
        <p>
          判断用哪条通道只需一个问题：这是一次性救急，还是可重复的部署流程？救急 →
          save/load（零依赖最快）；流程 →
          push/pull（版本、自动化、审计都在服务端）。单机可以直灌，多机必经仓库。
        </p>
      </MemoryCard>

      <Heading level={2} title="边界与陷阱" />
      <DoDont
        label="同名 tag 覆盖，save 拉不回旧版本 / tag overwrite"
        dont={{
          code: `docker build -t .../cnsig-ems-ui:1.0.0 .   # 第二次构建，tag 没换
docker push .../cnsig-ems-ui:1.0.0
# 仓库里 1.0.0 已改指新内容，旧版本被覆盖
# 这时才想起 save 一份旧镜像？已经拉不回来了`,
          note: "同名 tag 重新 push 后，仓库里旧镜像被覆盖（降级为无 tag 的悬空数据），save 导出的只能是覆盖后的当前内容——想回到旧版本，从 tar 这条路已经走不通。",
        }}
        do={{
          code: `$ docker push .../cnsig-ems-ui:1.0.0
1.0.0: digest: sha256:9f2a1c... size: 1571
# push 输出的 digest 记进部署日志；需要回滚时：
$ docker pull .../cnsig-ems-ui@sha256:9f2a1c...`,
          note: "digest 由内容算出、内容变摘要必变——tag 被覆盖后它仍精确指向当时的镜像，这是同名 tag 场景下唯一可靠的历史锚点。",
        }}
      />
      <Callout kind="warning" title="tar 包不是备份">
        把 save 出的 tar 当长期备份是错觉：它没有版本谱系（哪个
        tag、什么来源、何时构建全靠文件名自觉）、没有完整性校验（无 digest
        可对）。备份的正解仍是仓库——tar 只该活在「救急的这几分钟」里。
      </Callout>

      <Heading level={2} title="追问链" />
      <DoDont
        dont={{
          code: `$ docker commit debug-container my-app:1.0
$ docker push my-app:1.0`,
          note: "commit 容器做镜像：调试残留进镜像、不可复现、层历史一团黑",
        }}
        do={{
          code: `$ docker build -t my-app:1.0 .
$ docker push my-app:1.0`,
          note: "Dockerfile 是声明式配方，任何机器都能构建出同一结果",
        }}
      />

      <QAChain
        items={[
          {
            q: "save 和 export 都能导出 tar 包，差别到底是什么？",
            intent:
              "热身题：两组命令一字之差，是镜像搬运里最经典的混淆，先确认操作对象这个根子上的区别。",
            a: "操作对象不同：save/load 针对镜像、保留分层与元数据，export/import 针对容器文件系统、打平成单层丢掉全部元数据——搬镜像永远 save/load（对照表与恢复命令的完整展开见延伸阅读《没有外网的服务器怎么拿到 Docker 镜像？》）。",
            bonus:
              "export 出的 tar 比 save 略小，正因为打平丢掉了分层——这个「小」不是优化，是信息损失。",
            depth: 1,
          },
          {
            q: "为什么 docker save 按镜像 ID 导出，load 回来 tag 就没了？",
            intent:
              "考察对「tag 是引用不是内容」的理解——能不能区分 registry 元数据与镜像数据，决定踩不踩这个坑。",
            a: "因为 tag 是 registry 元数据层的「名字 → 内容」映射，不属于镜像数据本身——按 ID 导出只有内容、没有名字，load 回来自然成了 <none>:<none>（完整机制与补救命令见延伸阅读《没有外网的服务器怎么拿到 Docker 镜像？》）。",
            bonus:
              "同一逻辑的另一半是 digest：它是按内容算出的哈希，跟着镜像数据走，所以跨机器、跨仓库校验「是不是同一个镜像」要认 digest 而不是 tag。",
            depth: 2,
          },
          {
            q: "仓库不可达（断网、registry 宕机）时，部署机怎么拿到镜像？",
            intent:
              "检验能否把「通道选择」与「仓库可用性」两个问题分开——常见错误答案是「所以要用 save/load 替代仓库」。",
            a: "分层回答：短期靠部署机本地已有镜像的缓存（之前 pull 过的层和镜像都还在）；根本解是让仓库本身高可用——proxy 预热缓存、registry 多实例与磁盘治理，而不是换通道。save/load 只在「仓库从未存在或彻底不可修复」的环境里才是正解，日常拿它当仓库的容灾方案，会把版本谱系和审计能力一起丢掉。",
            bonus:
              "Nexus 这类仓库的 proxy 缓存命中部分断网也能拉到——「离线可用」是缓存能力的副产品，前提是提前预热（断网前完整跑一遍构建）。",
            depth: 2,
          },
          {
            q: "什么条件下可以完全没有 registry？什么时候它必须回来？",
            intent: "收束题：考察能否给出有主见的边界判断，而不是「视情况而定」的和稀泥。",
            a: "三个条件同时成立时可以没有：部署节点只有一台、没有 CI 自动化诉求（人工构建人工部署）、没有版本审计诉求。任何一条被打破它就得回来——多节点 pull 靠仓库分发、CI 集成靠标准 push/pull 语义、回滚与审计靠服务端账本。所以个人玩具项目直灌没问题，公司环境里 registry 是必选项而非可选项。",
            bonus:
              "K8s 场景把这点推到极致：调度到哪个节点不确定，每个节点都要能 pull——镜像预缓存到全部节点是特例优化，不是常规方案。",
            depth: 3,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        通道清楚了，最后一块拼图是<strong>通道中转的那个仓库本身怎么挑</strong>
        ：Nexus、Harbor、Verdaccio、registry:2、Artifactory
        各站在什么位置、按什么轴做决策？而在挑工具之前，也可以先回到仓库内部，看它作为中转站是怎么分工运转的。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "没有外网的服务器怎么拿到 Docker 镜像？",
            to: "/note/devtools/docker/registry/offline-transfer",
            description:
              "save/load 通道的机制 canonical：五步流程、tag 保持细节、压缩与 ssh 直传，以及 export/import 经典考点。",
          },
          {
            title: "Nexus 是什么：为什么公司都要自建制品仓库？",
            to: "/note/devtools/docker/registry/nexus",
            description: "中转站的内部机制：proxy / hosted / group 三种角色怎么分工协作。",
          },
          {
            title: "制品仓库怎么选：Nexus 还是专项工具？",
            to: "/note/devtools/docker/registry/registry-selection",
            description: "下一个问题：五个主流工具的定位边界与「格式广度 × 安全深度」决策轴。",
          },
        ]}
      />
    </NoteShell>
  );
}
