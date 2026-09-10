import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { Exercise } from "@/components/demo/Exercise";
import { BarChart, CrossRef, DoDont, MemoryCard, Table, Timeline } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        一条链路五个动作：
        <strong>
          pnpm build 产出 dist → docker build 把 dist 装进 nginx 镜像 → docker push 推上镜像仓库 →
          运行集群 docker pull 拉取 → 按新镜像重建容器
        </strong>
        。链路上的三个角色各司其职：<strong>构建机</strong>负责产出与装配、<strong>镜像仓库</strong>
        是所有 机器都能到达的中转站、<strong>运行集群</strong>
        只管拉镜像把容器跑起来。前端产物本质是静态文件， 所以部署的全部内容就是：让 nginx 托管
        dist，并把接口请求反代给后端——同域部署顺带消灭了 CORS。
      </Conclusion>

      <Heading level={2} title="五步链路：每个动作产出下一动作的原料" />
      <Paragraph>
        把一次典型的前端容器部署摊开，数据流是这样的——每一步的输出恰好是下一步的输入，断在哪一步，
        排查就只需要看那一步：
      </Paragraph>

      <Timeline
        label="前端容器部署全景 / deploy pipeline"
        steps={[
          { label: "代码仓库", sub: "git push / 手动打包触发", color: "#9ca3af" },
          { label: "构建机：pnpm build", sub: "产出 dist/", color: "#f59e0b" },
          { label: "docker build", sub: "COPY dist 装配成镜像", color: "#1677ff" },
          { label: "镜像仓库（私服）", sub: "docker push 中转", color: "#8b5cf6" },
          { label: "K8s 集群", sub: "docker pull + 更新 Pod", color: "#3fb950" },
          { label: "用户浏览器", sub: "HTTP :80/:443 拿到页面", color: "#1677ff" },
        ]}
      />

      <Paragraph>
        逐段走读：<code>pnpm build</code> 在构建机里产出 <code>dist/</code>（按环境可能是 dist-prod
        / dist-fat）；<code>docker build</code> 依据 Dockerfile 把 dist 与 nginx.conf
        装配成镜像、打上版本 tag；<code>docker push</code> 把镜像推上内网私服； 运行侧（K8s
        Deployment 的滚动更新或一台服务器上的 <code>docker run</code>）拉取新镜像、
        用它重建容器；最后浏览器拿到 nginx 托管的页面。前两步产出"内容"，后三步完成"分发与运行"。
      </Paragraph>
      <Paragraph>
        一个容易忽略的事实：<strong>push 完成不等于部署完成</strong>
        。镜像进了仓库只是到了中转站， 运行侧还差两步——K8s 场景是更新工作负载的镜像版本（或对同名
        tag 强制滚动重启），单机场景是 <code>docker pull</code>{" "}
        后用新镜像重建容器。部署脚本报"推送成功"之后 线上没变化，先检查的就是这半截链路。
      </Paragraph>

      <Heading level={2} title="三角色拓扑：构建机、仓库、运行集群" />
      <Paragraph>
        把五步按机器归位，就是三个角色。它们的职责边界非常清晰，
        <strong>没有任何一个角色既构建又运行</strong>
        ——构建机不需要能访问数据库，运行集群不需要装 Node，仓库只做存取：
      </Paragraph>

      <Table
        label="三角色分工 / roles"
        head={["角色", "职责", "关键命令", "典型形态"]}
        rows={[
          [
            "构建机",
            "产出 dist、装配镜像并推送",
            "pnpm build → docker build → docker push",
            "CI Runner、跳板服务器或开发机",
          ],
          [
            "镜像仓库",
            "集中存取镜像，全链路中转站",
            "docker login / push / pull",
            "内网 Nexus / Harbor（如 112.26.45.227:10001）",
          ],
          [
            "运行集群",
            "拉镜像并保持容器按期望运行",
            "kubectl rollout restart（或 docker run）",
            "K8s / k3s 集群，Deployment 定义副本",
          ],
        ]}
      />

      <Paragraph>
        <strong>仓库是唯一省不掉的角色</strong>。原因有二：其一，<strong>可达性</strong>
        ——运行集群往往是
        多台机器，镜像必须放在所有节点都能到达的位置，"直接把镜像拷到每台机器"在规模一大后就不可维护；
        其二，<strong>信任边界</strong>——集群侧可以只允许运行来自私服的镜像，仓库因此成为准入关卡：
        外来镜像、未扫描镜像一律进不来。加上私服里的每个镜像都有不可变的 digest
        摘要（内容算出的指纹），"这个版本到底是什么"从此有据可查。仓库服务的存取协议对所有 Docker
        都一样，所以自建 Nexus / Harbor 还是云托管，对部署脚本完全透明。
      </Paragraph>
      <Paragraph>
        构建发生在哪一台机器上，决定了两套常见的通道形态：<strong>CI 通道</strong>（git push
        触发流水线， CI 机器完成 build + push）和<strong>服务器通道</strong>（把 dist
        传上一台跳板服务器，在服务器上 执行 build + push
        的部署脚本）。产物一致的前提下两者等价，差别在环境一致性（CI
        从干净检出构建）与权限管理（私服凭证只发给 CI
        或跳板机）——这也是成熟团队逐步把服务器通道收编进 CI 的原因。两套通道用的是同一批 docker
        命令，学会一条就等于学会两条。
      </Paragraph>

      <Heading level={2} title="为什么 dist + nginx 就是前端部署的全部" />
      <Paragraph>
        SPA 构建产物 <code>dist/</code> 是纯粹的静态文件：一个 index.html 加若干 js/css
        资源。它不需要 Node、不需要进程管理，缺的只是一个 HTTP 服务把请求映射到这些文件——这就是
        nginx 在链路里承担的第一个角色（静态托管）。第二个角色是<strong>反向代理</strong>
        ：前端代码里接口地址写成
        <code>/admin-api</code> 这样的相对路径，请求先落到同域的 nginx，再由 nginx
        转发给后端服务。浏览器视角下页面和接口永远同源，<strong>跨域问题从根上不存在</strong>
        ——不需要 后端配 CORS 响应头，也不需要开发期代理的线上替代品。这两个角色如何由一份 nginx.conf
        精确落地，是部署实战篇的主角。
      </Paragraph>
      <Paragraph>
        基础镜像选 <code>nginx:stable-alpine</code> 而不是默认的 <code>nginx:latest</code>
        ，看一眼解压后的体积就有直觉了（具体数值随版本浮动，仅供量级感受）：
      </Paragraph>

      <BarChart
        label="基础镜像体积对比 / image size"
        title="解压后体积（MB）· 仅供直觉"
        items={[
          { label: "nginx:latest（Debian）", value: 190, color: "#f85149", suffix: "MB" },
          { label: "nginx:stable-alpine", value: 45, color: "#3fb950", suffix: "MB" },
          { label: "其中 alpine 底座", value: 8, color: "#9ca3af", suffix: "MB" },
        ]}
      />

      <Paragraph>
        小镜像的收益是三重的：push / pull
        传输量小一个数量级（集群滚动更新时每个节点都要拉一次）；磁盘占用
        小（一个节点上常年堆着多个版本）；攻击面小（alpine 砍掉了 Debian
        里上百个用不到的包，能藏问题的 地方更少）。alpine 的代价是它用 musl 而非 glibc，极少数依赖
        glibc 特性的二进制会不兼容——纯静态 托管场景完全碰不到，所以前端镜像放心用。
      </Paragraph>

      <MemoryCard keyword="五步链路：build → build → push → pull → run" color="#1677ff">
        <p>
          <code>pnpm build</code> 产 dist（内容）；<code>docker build</code> 装 成镜像（装配）；
          <code>docker push</code> 推私服（分发）；集群 <code>pull</code> +
          重建容器（运行）。三个角色：构建机管产出、仓库管中转（可达性 +
          信任边界，省不掉）、集群管运行。
          <strong>push 成功 ≠ 部署完成</strong>——后半截 pull 与重建容器没做完，线上就是旧版本。
        </p>
      </MemoryCard>

      <Heading level={2} title="边界与陷阱" />
      <Paragraph>
        链路上的三个高频翻车点，分别出现在"内容生产""镜像不可变""分发闭环"三个环节。
      </Paragraph>

      <Heading level={3} title="坑 1：接口地址写死完整域名，同域反代白做了" />
      <DoDont
        label="坑 1 · 写死后端域名 / hardcoded API origin"
        dont={{
          code: `# .env.production
VITE_GLOB_API_URL=https://api.corp.example.com
# 页面部署在 web.corp.example.com
# 浏览器发起跨域请求 → CORS 拦截`,
          note: "接口地址写死另一个源，浏览器每次请求都要面对同源策略——后端被迫配 CORS，配置一多就是事故源。",
        }}
        do={{
          code: `# .env.production：只留路径前缀
VITE_GLOB_API_URL=/admin-api
# nginx.conf：同域路径转发给后端
location /admin-api/ {
  proxy_pass http://cnsig-ems-boot:21080/admin-api/;
}`,
          note: "页面与接口同域，请求在浏览器眼里没有跨域这回事；转发是 nginx 在服务端做的，不受同源策略约束。",
        }}
      />

      <Heading level={3} title="坑 2：在宿主机上替换 dist，容器纹丝不动" />
      <DoDont
        label="坑 2 · 绕过镜像改文件 / host file swap"
        dont={{
          code: `# 服务器上直接覆盖旧目录
$ scp -r dist/* root@node:/home/app/cnsig-ems-ui/
$ docker restart my-app
# 页面还是旧的——容器读的是镜像里的文件，
# 不是宿主机目录`,
          note: "镜像 immutable，容器启动后读的是自己文件系统里的那份拷贝。宿主机目录只是当年 COPY 的原料，改它对已运行的容器毫无作用。",
        }}
        do={{
          code: `$ docker build -t .../cnsig-ems-ui:1.0.1 .
$ docker push .../cnsig-ems-ui:1.0.1
# 然后让运行侧用新镜像重建容器
$ kubectl rollout restart deployment/cnsig-ems-ui`,
          note: "想换内容就换镜像：重建 → 推送 → 滚动更新。这条纪律同时保住了「线上版本可追溯」。",
        }}
      />

      <Heading level={3} title="坑 3：把「推送成功」当「部署完成」" />
      <DoDont
        label="坑 3 · 断在半截的链路 / push ≠ deploy"
        dont={{
          code: `$ ./deploy.sh -n cnsig-ems-ui -v 1.2.0
[INFO] 镜像推送成功！
# 看线上：还是 1.1.x 的页面
# ——集群还在跑旧容器，没人 pull 新镜像`,
          note: "私服只是中转站。运行侧没有触发 pull + 重建，新镜像就只是躺在仓库里，线上跑的仍是旧容器。",
        }}
        do={{
          code: `# K8s：改 Deployment 的镜像 tag 后
$ kubectl rollout restart deployment/cnsig-ems-ui
$ kubectl rollout status deployment/cnsig-ems-ui
Waiting for deployment ... successfully rolled out`,
          note: "部署的完成标志是滚动更新成功（rollout status 通过），或单机场景新容器已用新镜像跑起来。验证要在运行侧做，不看推送日志。",
        }}
      />

      <Heading level={2} title="动手练习" />
      <Exercise
        tags={["链路", "排查"]}
        hint="五个动作，每一步的输出是下一步的输入；断点在哪一步，就去那台机器上看哪条命令。"
        question={
          <>
            线上页面仍是旧版本，但 <code>deploy.sh</code> 输出了「镜像推送成功」。把这五个环节
            （pnpm build / docker build / docker push / pull / 重建容器）按"逐个验证成本从低到高"
            排一个排查顺序，并指出最可能断在哪一环。
          </>
        }
        answer={
          <Paragraph>
            顺序：① 查 <code>docker images</code> 确认私服上（或构建机本地）有新版本 tag ——排除
            build / push 断裂；② 到运行节点 <code>docker images</code>（或 kubectl describe pod
            看镜像）确认新镜像有没有被 pull 下来——定位是分发断裂还是重建断裂；③ 查运行侧
            容器的创建时间与镜像 ID——确认有没有用新镜像重建。推送已报成功时，最常见断点是
            <strong>最后一环</strong>：没人触发 pull / 滚动更新，容器还是老的。
          </Paragraph>
        }
      />
      <Exercise
        tags={["同域反代", "CORS"]}
        hint="同源策略只管浏览器；服务端转发没有这个约束。"
        question={
          <>
            团队把前端部署到 <code>web.corp.com</code>，后端只有 <code>api.corp.com</code>
            ，且后端无法改造加 CORS 头。用本篇的两个角色（静态托管 + 反向代理）
            设计一条让页面正常调接口的方案。
          </>
        }
        answer={
          <Paragraph>
            把接口收敛到前端自己的域名下：前端代码里接口地址只写路径前缀（如 <code>/admin-api</code>
            ），打包进 dist；nginx.conf 增加一条 <code>location /admin-api/</code> 把该前缀
            <code>proxy_pass</code> 给 <code>api.corp.com</code>。浏览器只见
            web.corp.com→web.corp.com 的同源请求，跨域无从谈起；真正出站到 api.corp.com 的请求由
            nginx 在服务端完成，同源策略管不到它。
          </Paragraph>
        }
      />

      <Heading level={2} title="追问链" />
      <QAChain
        intro="五问沿链路铺开，从两阶段构建问到镜像版本一致性。"
        items={[
          {
            q: "pnpm build 和 docker build 都叫构建，它们各产出什么？",
            intent:
              "热身题：区分「前端构建」与「镜像构建」这两个阶段——把两者混为一谈的人，读 Dockerfile 时会一直别扭。",
            a: "pnpm build 是前端构建：源码 → dist 静态产物；docker build 是镜像构建：按 Dockerfile 把（已有的）dist、nginx.conf 和基础镜像装配成一个镜像文件。前者是后者的原料供应商，顺序固定：先 pnpm build 后 docker build。",
            bonus:
              "两阶段可以拆在两台机器上做——CI 上 pnpm build，跳板机上 docker build；它们唯一的交接物就是 dist 目录。",
            depth: 1,
          },
          {
            q: "K8s 里 Deployment 的镜像 tag 没变（还是 1.0.0），执行 rollout restart 后新 Pod 一定用的是新镜像吗？",
            intent:
              "考察分发环节的隐藏陷阱：镜像拉取策略与 tag 指向的关系——这是「推了新镜像但线上不生效」的高发根因。",
            a: "不一定。K8s 默认 imagePullPolicy 是 IfNotPresent：节点上已存在同名同 tag 的镜像时不再去仓库拉取。如果旧 Pod 所在节点缓存过旧的 1.0.0，rollout restart 重建的 Pod 会直接复用本地那份旧镜像。可靠做法是镜像 tag 用不可重复的版本（每次构建新 tag），或把策略设为 Always 强制每次都去仓库核对。",
            bonus:
              "tag 每次都换新版本号时，IfNotPresent 反而是最优解——未变化的节点不浪费拉取时间；这是「版本号唯一性」比「拉取策略」更根本的原因。",
            depth: 3,
          },
          {
            q: "为什么接口地址只写 /admin-api 这样的相对路径，跨域就消失了？",
            intent:
              "检验同域反代的原理层：同源策略的作用范围（浏览器侧）与服务端转发的关系，而非背「配了 nginx 就不跨域」的结论。",
            a: "同源策略是浏览器的安全机制，只约束「页面里的脚本向别的源发请求」。接口地址写成相对路径时，请求的源与页面完全相同（同协议同域名同端口），浏览器按同源请求放行；至于这个请求在 nginx 收到后再转发到哪个后端，那是服务器之间的行为，浏览器不知情也不管辖。跨域不是被「解决」了，而是被「绕到浏览器看不见的地方」了。",
            bonus:
              "反过来说：如果某些请求必须由浏览器直连第三方域（如 OAuth 跳转），同源策略依然生效——反代方案覆盖不到浏览器直连的场景。",
            depth: 3,
          },
          {
            q: "从「开发机也能装 Docker」推出「人人都可以本地构建生产镜像」，这步推理哪里有问题？",
            intent:
              "工程判断题：考察对两套部署通道（本地/服务器 vs CI）取舍的理解——能说出环境一致性与凭证边界才算及格。",
            a: "问题在三点：其一，本地工作区不干净——未提交的改动、本地环境变量会被打进镜像，产物不可复现；其二，凭证面扩大——私服 push 权限发放到每台开发机，泄露面与审计难度同步扩大；其三，平台差异——macOS 上构建的镜像架构（arm64）与线上节点（amd64）可能不一致。所以规范通道是 CI 从干净检出构建，本地构建只用于自测。",
            bonus:
              "确需本地构建跨架构镜像时用 docker buildx --platform linux/amd64，它模拟目标架构——能用，但比 CI 原生构建慢得多。",
            depth: 4,
          },
          {
            q: "这条链路里，如果运行集群连私服的 10001 端口都不通（完全隔离的内网），五步链路还能走通吗？",
            intent:
              "压轴题：检验是否真正理解「仓库是中转站」——中转站不可达时，分发环节可以整体替换为别的搬运方式。",
            a: "能，但分发环节要整体替换：在能同时访问私服与隔离网的机器上 docker save 把镜像导出成 tar 包，物理拷贝（或内部 FTP）进隔离网，目标机器 docker load 导入本地镜像库，后续重建容器不变。代价是失去仓库的版本管理与自动分发能力，每次更新都要人工搬运——这正是完全隔离环境用「离线搬运」的原因，也是私服存在价值的反面印证。",
            bonus:
              "tar 包保留全部镜像数据，load 后镜像与 push/pull 得到的完全一致；两台机器间也可以用 ssh 管道直传：docker save 镜像 | ssh 目标机 docker load。",
            depth: 4,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        链路走通之后，往里钻一层：<strong>第二步 docker build 的内部</strong>——一份 5 行的
        Dockerfile 怎么把 dist 和 nginx 装配成镜像、构建上下文与层缓存怎么决定 build
        的快慢。链路里出现的 nginx.conf（静态托管 + 反向代理的那份配置）会在部署实战篇逐行拆解；
        离线搬运（最后一问的 save/load）也有独立一篇。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "Docker 的镜像、容器、仓库是什么关系？",
            to: "/note/devtools/docker/registry/image-container-registry",
            description: "系列第一篇：三对象与镜像名三段式，本篇链路里每个环节都用到了它们。",
          },
          {
            title: "5 行的 Dockerfile 是怎么变成镜像的？",
            to: "/note/devtools/docker/dockerfile/build-anatomy",
            description: "系列下一篇：进入 docker build 内部，看四条指令怎么装配出前端镜像。",
          },
        ]}
      />
    </NoteShell>
  );
}
