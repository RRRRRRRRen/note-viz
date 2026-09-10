import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { Exercise, ShellBlock } from "@/components/demo";
import { CompareTable, CrossRef, DoDont, MemoryCard, SpecQuote, Timeline } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        镜像仓库不可达时（完全隔离的内网、连私服都不通的交付环境），唯一的分发手段是
        <strong>离线搬运</strong>：<code>docker save</code> 把镜像导出成 tar 包 → 拷贝到目标机 →
        <code>docker load</code> 恢复成镜像。两条铁律：<strong>搬镜像永远用 save/load</strong>
        ——它保留全部分层、元数据和 tag，load 回来的镜像与 pull 到的完全等价；
        <strong>save/export 是两族命令</strong>——export
        作用于容器、导出打平后的文件系统快照，丢掉分层与启动
        配置，用途是备份容器现场而非搬运镜像。与仓库的关系不是替代而是配合：私服里的第一批基础镜像，
        正是有人这样人工灌进去的。
      </Conclusion>

      <Heading level={2} title="什么时候轮到离线搬运" />
      <Paragraph>
        正常链路里镜像靠仓库分发（build → push → pull），仓库不可达的场景其实很常见：
        <strong>完全物理隔离的交付内网</strong>（政企生产环境，连内部私服都够不到）、
        <strong>私服的 初始化</strong>（私服还没灌进任何镜像，第一台构建机连基础镜像都拉不到）、以及
        <strong>备份与迁移</strong>
        （把镜像固化成文件归档）。这些场景的共同点是：网络这条分发通道断了，
        得改用"文件"这条最古老的通道。
      </Paragraph>
      <Paragraph>完整流程五个动作，中间那步"搬运"用什么手段都行（scp、U 盘、内部 FTP）：</Paragraph>

      <Timeline
        label="离线搬运五步 / offline transfer"
        steps={[
          { label: "① save 导出", sub: "有网机器：镜像 → tar 文件", color: "#1677ff" },
          { label: "② 搬运", sub: "scp / U 盘 / 内部 FTP", color: "#f59e0b" },
          { label: "③ load 导入", sub: "目标机：tar → 本地镜像", color: "#3fb950" },
          { label: "④ 验证", sub: "docker images 核对名字与 tag", color: "#9ca3af" },
          { label: "⑤ 使用", sub: "run 起容器，或 tag 后 push 进内网私服", color: "#8b5cf6" },
        ]}
      />

      <ShellBlock>{`# ① 有网机器：确认本地有镜像，导出为 tar
$ docker pull nginx:stable-alpine
$ docker save nginx:stable-alpine -o nginx-stable-alpine.tar
$ ls -lh nginx-stable-alpine.tar
-rw-r--r--  1 ren  staff  46M  9  8 10:12 nginx-stable-alpine.tar

# ② 拷到目标机器（内网 scp / U 盘均可）
$ scp nginx-stable-alpine.tar root@10.20.0.5:/tmp/

# ③ 目标机（无外网）：导入
$ docker load -i /tmp/nginx-stable-alpine.tar
Loaded image: nginx:stable-alpine

# ④ 验证：名字与 tag 原样出现
$ docker images nginx
REPOSITORY        TAG             IMAGE ID       CREATED      SIZE
nginx             stable-alpine   9cee1a8caa02   3 weeks ago  43MB`}</ShellBlock>

      <Paragraph>官方对 save 产物的描述点出了它为什么能"原样恢复"：</Paragraph>
      <SpecQuote source="Docker Docs · docker image save">
        Contains all parent layers, and all tags + versions, or specified repo:tag, for each
        argument provided.
      </SpecQuote>
      <Paragraph>
        tar 包里是<strong>完整的分层结构加上全部元数据</strong>，所以 load 回来的镜像和从仓库 pull
        到的没有任何差别——分层还在（后续构建继续共享底座）、tag 还在、启动命令还在。
      </Paragraph>

      <Heading level={2} title="三个实用细节" />
      <Paragraph>
        <strong>一个 tar 装多个镜像</strong>。save 天生支持多参数，交付一组基础镜像时不用打 N
        个包——官方示例就是两个镜像进一个归档：
      </Paragraph>
      <ShellBlock>{`$ docker save -o base-images.tar nginx:stable-alpine node:22-slim redis:7
$ docker load -i base-images.tar
Loaded image: nginx:stable-alpine
Loaded image: node:22-slim
Loaded image: redis:7`}</ShellBlock>
      <Paragraph>
        <strong>大镜像先压缩</strong>。save 默认输出未压缩 tar，配合管道可以边导出边压：导出端{" "}
        <code>docker save 镜像 | gzip &gt; x.tar.gz</code>，导入端{" "}
        <code>gunzip -c x.tar.gz | docker load</code>。几十 MB 的前端镜像没必要，几 GB
        的后端镜像能省一半传输时间。更进一步，两台机器网络互通时连落盘都省了，
        <strong>ssh 管道直传</strong>：
      </Paragraph>
      <ShellBlock>{`$ docker save nginx:stable-alpine | gzip | ssh root@10.20.0.5 'gunzip | docker load'
Loaded image: nginx:stable-alpine`}</ShellBlock>
      <Paragraph>
        <strong>tag 是否保留，取决于你 save 的时候写的是什么</strong>。用镜像名保存，tag 跟着走；用
        IMAGE ID 保存，归档里只有内容没有名字——load 出来就是一个{" "}
        <code>&lt;none&gt;:&lt;none&gt;</code> 的无名镜像，需要手动 <code>docker tag</code>
        补名。搬运交付包时永远按<strong>名字</strong>保存。
      </Paragraph>

      <Heading level={2} title="经典考点：save/load vs export/import" />
      <Paragraph>
        Docker 还有另一对长得几乎一样的命令：export / import。区别只有一个字但全是天壤——
        <strong>save 的对象是镜像，export 的对象是容器</strong>：
      </Paragraph>
      <SpecQuote source="Docker Docs · docker container export">
        Export a container's filesystem as a tar archive. The docker export command doesn't export
        the contents of volumes associated with the container.
      </SpecQuote>
      <Paragraph>
        export 导出的是<strong>某个容器此刻的文件系统快照</strong>：分层被拍平、镜像的元数据（tag、
        启动命令、环境变量）全部不在包里。它配对的也不是 load 而是 <code>docker import</code>
        ——把快照导入成一个全新的裸文件系统镜像，连默认启动命令都没有，run
        时必须显式给命令。两者的正确分工：
      </Paragraph>

      <CompareTable
        label="save/load vs export/import / classic exam"
        left={{ title: "save / load（镜像族）", color: "#3fb950" }}
        right={{ title: "export / import（容器族）", color: "#f59e0b" }}
        rows={[
          { aspect: "作用对象", left: "镜像 image", right: "容器 container（运行中或已停止均可）" },
          { aspect: "分层结构", left: "完整保留", right: "拍平为单层文件系统快照" },
          {
            aspect: "元数据与 tag",
            left: "保留（tag、启动命令、环境变量）",
            right: "丢失（import 后无 CMD，run 必须显式给命令）",
          },
          { aspect: "恢复命令", left: "docker load", right: "docker import" },
          {
            aspect: "典型用途",
            left: "镜像分发、离线部署、备份",
            right: "备份容器现场、把调试过的容器固化为新基础镜像",
          },
          {
            aspect: "类比",
            left: "把 npm 包原件拷给同事",
            right: "把跑了一半的 node_modules 目录打包带走",
          },
        ]}
      />

      <MemoryCard keyword="搬镜像用 save/load，export 只用于容器现场" color="#3fb950">
        <p>
          save 按名字导出才带 tag；tar 里是完整分层 + 元数据，load 与 pull 等价。export
          导出的是容器的打平快照（不含 volume 内容），import
          进来的是没有启动命令的裸镜像——两者用途完全 不同，
          <strong>「离线部署」四个字对应的永远是 save/load</strong>。
        </p>
      </MemoryCard>

      <Heading level={2} title="边界与陷阱" />
      <Paragraph>
        三个高频坑：一个丢名字，一个认错对象族，一个架构不符——第三个对 Mac 开发者尤其致命。
      </Paragraph>

      <Heading level={3} title="坑 1：按 IMAGE ID 导出，load 回来变成无名镜像" />
      <DoDont
        label="坑 1 · 无名镜像 / image id save"
        dont={{
          code: `$ docker images --format "{{.ID}} {{.Repository}}"
3f8a12d9b7c1 112.26.45.227:10001/cnsig-ems-ui
$ docker save 3f8a12d9b7c1 -o app.tar
$ docker load -i app.tar
Loaded image ID: sha256:3f8a12d9b7c1...
$ docker images
<none>                       <none>    3f8a12d9b7c1   ...   46MB`,
          note: "ID 只标识内容不携带名字——归档里没有 repo 与 tag，load 只能恢复出一具没有身份的镜像。",
        }}
        do={{
          code: `$ docker save 112.26.45.227:10001/cnsig-ems-ui:1.0.0 -o app.tar
$ docker load -i app.tar
Loaded image: 112.26.45.227:10001/cnsig-ems-ui:1.0.0`,
          note: "按「名字:tag」导出，名字随包走。已经变成 <none> 的也能救：docker tag 3f8a12d9b7c1 完整名:tag 补回来。",
        }}
      />

      <Heading level={3} title="坑 2：两族命令认错对象" />
      <DoDont
        label="坑 2 · 对象族 / image vs container"
        dont={{
          code: `$ docker save my-running-container -o c.tar
Error: No such image: my-running-container
$ docker export nginx:stable-alpine -o n.tar
Error: No such container: nginx:stable-alpine
# 各自只认自己一族的对象`,
          note: "save/pull/load/rmi 后面跟镜像名，export/rm/logs/exec 后面跟容器名——报 No such image / No such container 时，第一反应检查对象族。",
        }}
        do={{
          code: `# 先分清手里是什么：
$ docker ps        # 容器清单（export 的原料）
$ docker images    # 镜像清单（save 的原料）
# 容器现场想固化成镜像再搬运：
$ docker commit my-container snapshot:1.0   # 容器 → 镜像
$ docker save snapshot:1.0 -o snapshot.tar  # 镜像 → tar`,
          note: "commit 是两族之间的桥：先把容器固化为镜像，之后就能走 save/load 的正规搬运通道（应急场景再用，常规交付走构建）。",
        }}
      />

      <Heading level={3} title="坑 3：Apple Silicon 上导出的镜像，x86 服务器跑不动" />
      <DoDont
        label="坑 3 · 架构不匹配 / arch mismatch"
        dont={{
          code: `# M 系列 Mac 上：
$ docker pull nginx:stable-alpine && docker save ... -o n.tar
# 拷到 amd64 服务器 load 后 run：
exec format error
# 镜像是 arm64 架构，服务器是 amd64 CPU`,
          note: "镜像天生带架构属性。Mac（arm64）上 pull 到的默认就是 arm64 版本，save 保存的只是这一个架构。",
        }}
        do={{
          code: `# 导出前显式指定目标平台：
$ docker pull --platform linux/amd64 nginx:stable-alpine
$ docker save nginx:stable-alpine -o nginx-amd64.tar
# docker save 也支持 --platform linux/amd64（需 Docker Engine 25+）`,
          note: "交付给 x86 服务器的镜像，在有网机器上就要按 linux/amd64 拉取或导出；镜像 inspect 里的 Architecture 字段是验收依据。",
        }}
      />

      <Heading level={2} title="动手练习" />
      <Exercise
        tags={["ssh 管道", "save/load"]}
        hint="save 的输出是流——接管道即可，不必先落盘。"
        question={
          <>
            构建机可以 ssh 到内网目标机但不能用仓库。写出一条命令，把 <code>app:1.0.0</code>{" "}
            边压缩边传到目标机并完成导入（不产生中间文件）。
          </>
        }
        answer={
          <ShellBlock>{`$ docker save app:1.0.0 | gzip | \\
    ssh root@10.20.0.5 'gunzip | docker load'
Loaded image: app:1.0.0`}</ShellBlock>
        }
      />
      <Exercise
        tags={["初始灌注", "私服"]}
        hint="私服自己也需要有人把第一批镜像放进去。"
        question={
          <>
            公司新搭了一台内网私服 <code>registry.corp:5000</code>，它本身也访问不了外网。描述把
            nginx 基础镜像「灌」进去的完整步骤。
          </>
        }
        answer={
          <Paragraph>
            五步：① 在有外网的机器 <code>docker pull nginx:stable-alpine</code>（注意 --platform
            要与内网服务器架构一致）；② <code>docker save</code> 成 tar；③ 搬运进内网；④{" "}
            <code>docker load</code> 后{" "}
            <code>
              docker tag nginx:stable-alpine registry.corp:5000/library/nginx:stable-alpine
            </code>{" "}
            把名字改成私服地址形态；⑤ <code>docker login</code> 后 <code>docker push</code>
            。此后内网所有 Dockerfile 的 FROM 都指向私服地址，外网通道彻底断开也不影响构建。
          </Paragraph>
        }
      />

      <Heading level={2} title="追问链" />
      <QAChain
        intro="五问从工具分工问到分发链路的尽头。"
        items={[
          {
            q: "有了 docker save，为什么生产环境还是用私服 push/pull？",
            intent:
              "热身题：分清「能走通的手段」与「工程化的分发」，两者不是竞争关系而是不同规模的方案。",
            a: "一句话：save/load 是点对点的人工兜底，push/pull 是服务化分发——版本谱系、权限、扫描、并发拉取都在仓库侧，规模化后人工搬运不可维护（通道取舍的完整论证见延伸阅读《镜像怎么从构建机到部署机？》）。本篇只负责机制这一半：仓库不可达时，save/load 是唯一走得通的路。",
            bonus:
              "规模化的隔离环境会用「内网 registry + 人工同步」折中：tar 搬进内网后 push 进私服，集群内照常 pull。",
            depth: 1,
          },
          {
            q: "save 出来的 tar 里到底装了什么？为什么 load 回来的镜像能和 pull 的完全等价？",
            intent:
              "考察对 tar 归档构成的了解——理解了构成，才能理解为什么 tag 可能丢、为什么与 pull 等价。",
            a: "tar 里是完整镜像结构：每一层的文件内容 + 层与层之间的顺序关系 + 描述镜像的清单（元数据：入口命令、环境变量、暴露端口）+ tag 映射。pull 从仓库下载的也是同样这套数据（仓库本质就是存这些层和清单的地方），所以 load 与 pull 得到的镜像逐字节等价——分层结构保留意味着后续构建照样共享底座。",
            bonus:
              "想亲眼看看：docker save -o n.tar 后 tar -tf n.tar，能直接看到 manifest 与每一层。",
            depth: 2,
          },
          {
            q: "docker export 出来的 tar，能不能用 docker load 恢复？为什么？",
            intent:
              "经典考点：检验两族命令的归档格式互不通用——背过「save 镜像 export 容器」不够，要能解释格式差异。",
            a: "不能。load 只认镜像归档格式——里面有层清单和镜像元数据；export 的 tar 是打平的容器文件系统快照，没有这些结构，load 会直接报错。export 的产物只能配对 docker import，导入成一个全新的裸文件系统镜像：单层、无 tag、无启动命令，run 时必须显式指定要执行的命令。",
            bonus:
              "反过来，save 的 tar 也不能 docker import——import 面向的是文件系统快照语义；两对命令各自闭环，不能交叉。",
            depth: 3,
          },
          {
            q: "内网私服刚搭建、里面一个镜像都没有时，团队的 Dockerfile 写 FROM nginx:stable-alpine 会发生什么？完整的解决链路是什么？",
            intent:
              "压轴题：把「初始灌注」串成完整工程流程——它同时解释了篇①「FROM 从哪拉」与私服存在的意义。",
            a: "构建机解析 FROM 时本地无缓存、私服里也没有这个镜像，拉取失败，构建直接报 manifest not found / pull access denied。完整链路：有网机器按目标架构 pull 基础镜像 → save 成 tar → 搬运进内网 → load 后用 docker tag 把名字改成私服地址形态（如 registry.corp:5000/library/nginx:stable-alpine）→ login + push 进私服。此后全团队的 FROM 改指向私服地址，外网依赖被彻底切断。",
            bonus:
              "成熟团队会定期批量灌注并扫描这批基础镜像（升级 nginx 修复 CVE 时重复一次该链路），基础镜像的「进货」本身就是一项需要管理的工程。",
            depth: 4,
          },
          {
            q: "镜像有 5GB，连 tar 都难拷，有哪些工程化的缓解手段？",
            intent: "实战题：离线场景的性能与可运维性权衡——能列出分层选项说明真搬过大镜像。",
            a: "按成本从低到高：① 管道压缩（docker save | gzip，文本层多的镜像能省一半）；② ssh 直传免落盘，配合 rsync 断点续传；③ 分层复用——基础镜像层单独 save 一次长期不动，只定期搬业务层，目标机 load 两包合并；④ 从源头瘦身——多阶段构建、slim/alpine 基础镜像，5GB 的镜像多半是没清理的构建缓存与依赖，搬运优化之前先查镜像本身该不该这么大。",
            bonus:
              " Extreme 场景用 docker buildx 的 OCI 布局输出或 registry mirror 中转，让「搬运」重新变回「同步」，但这些需要内网有对应基础设施。",
            depth: 4,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        镜像怎么来、怎么传都通了，接下来进入实战篇的主场：
        <strong>那份让页面和接口都通的 nginx.conf</strong>——静态托管、history
        路由回退、反向代理与同域消 CORS 的逐行拆解。之后是部署脚本与容器排障。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "镜像怎么从构建机到部署机？",
            to: "/note/devtools/docker/registry/image-transport",
            description:
              "两条通道取舍的 canonical 论证：save 与 push/pull 的机制对比、「registry 中转站省不掉」的完整边界。",
          },
          {
            title: "Docker 的镜像、容器、仓库是什么关系？",
            to: "/note/devtools/docker/registry/image-container-registry",
            description: "前置：三对象与不可变镜像——本篇 save/load 的前提概念。",
          },
          {
            title: "nginx.conf 是怎么让页面和接口都通的？",
            to: "/note/devtools/docker/deploy/nginx-conf-anatomy",
            description: "系列下一篇：搬进镜像的那份配置文件逐行拆解。",
          },
        ]}
      />
    </NoteShell>
  );
}

/** 命令类代码块：站内 CodeBlock 仅支持 JS/TS 高亮，命令类内容用此本地块呈现 */
