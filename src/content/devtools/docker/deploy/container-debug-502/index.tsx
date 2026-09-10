import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { Exercise, FlowChart, ShellBlock } from "@/components/demo";
import { Callout, CrossRef, DoDont, MemoryCard, SpecQuote, Table } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        排障的钥匙是理解 502 的本义——<strong>nginx 活着，但它身后的服务死了或答非所问</strong>
        （它作为网关从上游拿到了无效响应）。所以排查方向永远是<strong>从 nginx 往回游</strong>
        ：先确认容器层面谁在跑（<code>docker ps -a</code>），再听主进程的口供（
        <code>docker logs</code>
        ），然后钻进 nginx 容器直接探测后端（<code>docker exec ... curl 后端:端口</code>
        ）。三条典型故障各有起点：<strong>502 查后端连通</strong>、<strong>容器秒退查 logs</strong>
        、<strong>页面 404 或欢迎页查配置生效</strong>（root 与 COPY 的暗约定、conf
        是否真的被覆盖）。
        一句纪律压轴：在容器里改动验证出来的"正常"都是假阳性，配置必须进镜像才算数。
      </Conclusion>

      <Heading level={2} title="前置：请求是怎么到达容器的（-p 端口映射）" />
      <Paragraph>排查访问问题前，先建立端口模型。容器默认并不对宿主机以外暴露任何端口：</Paragraph>
      <SpecQuote source="Docker Docs · Network overview">
        Use the --publish or -p flag to make a port available outside the host, and to containers in
        other bridge networks.
      </SpecQuote>
      <Paragraph>
        <code>docker run -d -p 8080:80 镜像</code> 的含义是<strong>宿主机 8080 → 容器 80</strong>
        （冒号左边是宿主机，右边是容器，nginx 在容器里监听的是 80）。用户访问 host:8080，Docker
        把流量转进容器的 80。K8s 里同构的概念是 Service 的端口映射（NodePort/LB）——模型一致，
        命令不同。凡「连接被拒/超时」，第一件事是看映射是否存在：
      </Paragraph>
      <ShellBlock>{`$ docker ps
CONTAINER ID   IMAGE                          ...   PORTS
b3f2c1aa90e2   cnsig-ems-ui:1.0.0             ...   0.0.0.0:8080->80/tcp
                                        ↑ 有映射：宿主机 8080 → 容器 80
# PORTS 列为空 = 没发布端口：容器内服务只有
# 宿主机和同网络容器能访问，外部一律连不上`}</ShellBlock>

      <Heading level={2} title="工具四件套：每条命令回答一个问题" />
      <Paragraph>排障命令不在多，在知道「哪句话问谁」。四件套正好覆盖容器的四个侧面：</Paragraph>

      <Table
        label="排障四件套 / the big four"
        head={["命令", "回答的问题", "一行示例"]}
        rows={[
          [
            "docker ps -a",
            "谁在跑？谁退了？退出码是多少？",
            "docker ps -a --format table（看 STATUS 列：Up / Exited (1)）",
          ],
          ["docker logs", "主进程说了什么（stdout/stderr）？", "docker logs --tail 100 -f 容器名"],
          ["docker exec", "进到容器里现场验证", "docker exec -it 容器名 sh"],
          [
            "docker inspect",
            "容器的配置真相（端口/挂载/镜像 ID）",
            "docker inspect 容器名 | grep -A5 Ports",
          ],
        ]}
      />

      <ShellBlock>{`# 状态：Up（活着）与 Exited (1)（退出，退出码 1）
$ docker ps -a
CONTAINER ID   STATUS                     NAMES
b3f2c1aa90e2   Up 3 minutes               cnsig-ems-ui
71c9d0e4f5a1   Exited (1) 5 seconds ago   cnsig-ems-ui-old

# 口供：nginx 容器的日志（访问日志+错误日志都在这）
$ docker logs --tail 3 cnsig-ems-ui
10.244.0.11 - - "GET /admin-api/user HTTP/1.1" 502 559
2026/09/08 10:22:31 [error] 31#31: connect() failed (111: Connection refused)
while connecting to upstream, client: 10.244.0.11, server: localhost,
request: "GET /admin-api/user HTTP/1.1", upstream: "http://10.96.3.7:21080/admin-api/user"`}</ShellBlock>
      <Paragraph>
        这几行口供信息量极大：nginx 把请求转给上游 <code>cnsig-ems-boot:21080</code> 时收到
        <strong>Connection refused</strong>——连接被拒绝，所以给浏览器回了 502。注意错误信息里
        upstream 的地址被解析成了具体 IP：nginx 启动时就把容器名解析好了。看懂一条 error
        日志，排查就完成了大半。
      </Paragraph>

      <Heading level={2} title="故障一：502 —— nginx 活着，身后死了" />
      <Paragraph>502 的权威定义来自 HTTP 规范：</Paragraph>
      <SpecQuote source="RFC 9110 §15.6.2">
        The 502 (Bad Gateway) status code indicates that the server, while acting as a gateway or
        proxy, received an invalid response from an inbound server it accessed while attempting to
        fulfill the request.
      </SpecQuote>
      <Paragraph>
        翻译到本架构：nginx 收到了浏览器的请求（所以它活着），但作为代理去连后端{" "}
        <code>cnsig-ems-boot:21080</code> 时失败了（连不上，或拿到无效响应）。可能性按概率排：
        后端容器挂了、后端服务没起来（端口没监听）、后端容器名写错（DNS 解析不到）。决策树：
      </Paragraph>

      <FlowChart
        label="502 排查决策树 / 502 triage"
        data={{
          direction: "TB",
          nodes: [
            { id: "start", label: "页面 502", color: "#f85149" },
            { id: "probe", label: "exec 进 nginx 容器探后端", color: "#1677ff" },
            { id: "ok", label: "curl 后端:端口 通", color: "#3fb950" },
            { id: "fail", label: "Connection refused / 不通", color: "#f59e0b" },
            { id: "app", label: "查后端应用日志与自身健康", color: "#1677ff" },
            { id: "alive", label: "查后端容器状态与名字解析", color: "#f59e0b" },
          ],
          edges: [
            { source: "start", target: "probe", label: "docker exec" },
            { source: "probe", target: "ok", label: "网络是通的" },
            { source: "probe", target: "fail", label: "拒绝/超时" },
            { source: "ok", target: "app", label: "问题在后端应用层" },
            { source: "fail", target: "alive", label: "问题在容器/网络层" },
          ],
        }}
      />

      <Paragraph>
        探测命令一行——从 nginx 容器内部直接打后端（同网络的容器可以用容器名互相访问，这是 Docker
        内置 DNS 的能力）：
      </Paragraph>
      <ShellBlock>{`$ docker exec cnsig-ems-ui wget -qO- --timeout=3 \\
    http://cnsig-ems-boot:21080/admin-api/actuator/health
wget: server returned error: HTTP/1.1 503
# 或 BusyBox 无 curl 时用 wget；通了说明网络层无恙，
# 问题在后端应用（看它的日志），不通就看它的容器还在不在`}</ShellBlock>

      <Heading level={2} title="故障二：容器秒退（起了就死 / 重启循环）" />
      <Paragraph>
        另一类问题走不到 502——nginx 自己就没活下来。<code>docker ps</code> 里看不到它，
        <code>docker ps -a</code> 里看到 <code>Exited (1)</code> 或 K8s 里的
        CrashLoopBackOff。口供永远是第一步：
      </Paragraph>
      <ShellBlock>{`$ docker logs cnsig-ems-ui
nginx: [emerg] unknown directive "provxy_pass" in
/etc/nginx/nginx.conf:30

# 典型口供对照：
# [emerg] unknown directive   → 配置打错字/版本不支持该指令
# [emerg] open() "/etc/nginx/.../cert.pem" failed   → 证书文件没进镜像
# [emerg] host not found in upstream "cnsig-ems-boot" → 启动时解析不到后端`}</ShellBlock>
      <Paragraph>
        nginx 对配置是<strong>零容错</strong>
        的：一条指令拼错，进程拒绝启动，容器随之秒退。预防手段是上线前做语法预检——
        用一次性容器验证挂进去的配置，通过再构建正式镜像：
      </Paragraph>
      <ShellBlock>{`$ docker run --rm -v "$PWD/conf/nginx.conf:/etc/nginx/nginx.conf:ro" \\
    nginx:stable-alpine nginx -t
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful`}</ShellBlock>

      <Heading level={2} title="故障三：容器活着，页面 404 或显示欢迎页" />
      <Paragraph>
        最迷惑的一类：容器健康、请求 200，但页面不对。两种形态对应两个诊断：<strong>404</strong>
        ——root 指的目录里没有 index.html，查 Dockerfile 的 COPY 目标与 nginx.conf 的 root
        是否一致（系列里反复出现的暗约定）；<strong>Welcome to nginx</strong>{" "}
        ——看到的是官方默认欢迎页，说明你的 nginx.conf 根本没被加载（COPY 目标写错、没覆盖成功）。
        现场验证只需一条命令——直接看容器里的配置长什么样：
      </Paragraph>
      <ShellBlock>{`$ docker exec cnsig-ems-ui head -30 /etc/nginx/nginx.conf
worker_processes  1;
...
location / {
    root   /home/cnsig/cnsig-ems-ui;   ← 是你的配置，还是官方默认？
}
# 再验证文件真的在：
$ docker exec cnsig-ems-ui ls /home/cnsig/cnsig-ems-ui
index.html  assets/`}</ShellBlock>

      <MemoryCard keyword="三层排查：容器层 → 网络层 → 配置层" color="#1677ff">
        <p>
          <strong>容器层</strong>：<code>ps -a</code> 看生死与退出码，<code>logs</code>{" "}
          听口供（秒退原因几乎全在日志第一屏）。<strong>网络层</strong>：<code>exec</code> 进 nginx
          容器探后端（容器名即域名），502=身后死了、504=身后太慢。
          <strong>配置层</strong>：<code>cat</code> 容器里的 conf 对照暗约定（root↔COPY），欢迎页 =
          配置未生效。
        </p>
      </MemoryCard>

      <Heading level={2} title="边界与陷阱" />
      <Paragraph>排障本身的三个坑——都发生在「以为验证过了」的时刻。</Paragraph>

      <Heading level={3} title="坑 1：exec 改配置 + restart 验证，得到的正常是假阳性" />
      <DoDont
        label="坑 1 · 假阳性 / writable layer survives restart"
        dont={{
          code: `$ docker exec -it cnsig-ems-ui vi /etc/nginx/nginx.conf
$ docker restart cnsig-ems-ui
# 页面正常了！下班。
# ——两周后节点重建/换机部署：改动蒸发，事故复发`,
          note: "restart 只是重启主进程，容器的可写层原样保留——exec 改的文件还在。rm + run（或换节点调度）才是真实环境，那时配置回到镜像里的旧版。",
        }}
        do={{
          code: `# 临时验证后，立刻把改动固化进镜像：
$ vi conf/nginx.conf          # 同样的改动写进源文件
$ docker build -t .../cnsig-ems-ui:1.0.2 .
$ docker push ... && 更新容器
# 从此任何节点拉起的容器都带着这份配置`,
          note: "exec+restart 只能证明「这段配置能修问题」，不能证明「问题已修复」。配置生效的唯一凭证是它进了镜像。",
        }}
      />

      <Heading level={3} title="坑 2：-p 冒号两侧写反" />
      <DoDont
        label="坑 2 · 端口顺序 / host:container"
        dont={{
          code: `$ docker run -d -p 80:8080 cnsig-ems-ui:1.0.0
# 本意：宿主机 8080 → 容器 80
# 实际：宿主机 80   → 容器 8080
# 访问 8080 → Connection refused
# （容器里 nginx 只听 80，8080 无人监听）`,
          note: "-p 的顺序是「宿主机:容器」。写反后连接到达的是容器里没人监听的端口，症状是拒绝连接而非 502——因为请求根本没碰到 nginx。",
        }}
        do={{
          code: `$ docker run -d -p 8080:80 cnsig-ems-ui:1.0.0
$ docker ps
PORTS: 0.0.0.0:8080->80/tcp
# 记法：从外到内读——先宿主机，后容器`,
          note: "验收靠 docker ps 的 PORTS 列：箭头左边是宿主机端口（你访问的），右边是容器端口（nginx 监听的）。",
        }}
      />

      <Heading level={3} title="坑 3：进容器装 curl 排障，等于给现场镀金" />
      <DoDont
        label="坑 3 · 排障污染 / debug pollution"
        dont={{
          code: `$ docker exec -it cnsig-ems-ui sh
/# apk add curl      # 现场装工具
/# curl http://boot:21080/health
# 排障结束。次日另一节点上的同版本容器：
# 没有 curl，步骤复现不了`,
          note: "exec 里的安装写进该容器的可写层——它不可复制、不可追溯，还让「线上到底跑了什么」失去准头。",
        }}
        do={{
          code: `# 用镜像自带的工具（alpine 自带 BusyBox wget）：
$ docker exec cnsig-ems-ui wget -qO- http://boot:21080/health
# 或起一个一次性排障容器，用完即焚：
$ docker run --rm --network container:cnsig-ems-ui \\
    curlimages/curl http://localhost:80/health`,
          note: "排障工具不进业务容器——要么用现成的，要么用一次性容器共享目标容器的网络栈，用完 --rm 消失。",
        }}
      />

      <Callout kind="info" title="K8s 环境的对照命令">
        这套四件套在 K8s 里一一对应：<code>docker ps</code> ≈ <code>kubectl get pods</code>
        （CrashLoopBackOff 就是「秒退重启循环」）、<code>docker logs</code> ≈{" "}
        <code>kubectl logs</code>、<code>docker exec</code> ≈ <code>kubectl exec -it</code>、
        <code>docker inspect</code> ≈ <code>kubectl describe pod</code>
        。-p 端口映射的角色由 Service 接管。学完 Docker 层的排查，K8s 层只是换了套动词。
      </Callout>

      <Heading level={2} title="动手练习" />
      <Exercise
        tags={["端口映射", "docker ps"]}
        hint="看 PORTS 列：箭头方向与数字。"
        question={
          <>
            <code>docker ps</code> 显示某容器 PORTS 列为空，浏览器访问宿主机 8080
            被拒绝。给出诊断与两种修复命令。
          </>
        }
        answer={
          <Paragraph>
            诊断：容器启动时没有发布端口（漏了 -p），按默认规则只有宿主机和同网络容器能访问它，外部
            全部拒绝。修复二选一：① 重新 run 并带上 <code>-p 8080:80</code>
            （容器不能事后追加端口映射， 只能重建）；② K8s 场景检查 Service 的 port/targetPort
            配置。另注意 8080:80 与 80:8080 的方向——拒绝连接时用 <code>docker exec</code> 确认 nginx
            实际监听的端口。
          </Paragraph>
        }
      />
      <Exercise
        tags={["502", "排查顺序"]}
        hint="502 说明 nginx 活着——问题只在它身后。"
        question={
          <>
            页面 502。按顺序写出你会执行的前三条命令（每条注明「想确认什么」），以及{" "}
            <code>docker logs</code> 里出现 <code>connect() failed (111: Connection refused)</code>
            时你的结论。
          </>
        }
        answer={
          <Paragraph>
            ① <code>docker ps</code>——nginx 容器与后端容器谁在跑（想确认后端是否活着）； ②{" "}
            <code>docker logs --tail 50 nginx 容器</code>——看 upstream 错误详情（想确认失败环节是
            连接还是响应）；③ <code>docker exec nginx 容器 wget -qO- 后端:21080/health</code>
            ——从网络层直接探测（想区分「容器死了」还是「服务没监听」）。日志出现 Connection refused
            的结论：nginx 到后端的连接被拒绝，通常是后端进程没在监听（挂了或没起来）——网络通、DNS
            通，去后端容器查应用日志。
          </Paragraph>
        }
      />

      <Heading level={2} title="追问链" />
      <QAChain
        intro="五问从命令语义问到排障方法论的边界。"
        items={[
          {
            q: "docker ps 和 docker ps -a 的区别是什么？Exited (1) 里的 1 是什么？",
            intent: "热身题：确认四件套第一件的语义——退出码是主进程留给你的第一个线索。",
            a: "ps 只显示运行中的容器，ps -a 显示全部（含已退出）。Exited (1) 的 1 是主进程的退出码：nginx 配置错误时进程以 1 退出并带走容器。退出码是惯例语言——0 正常退出，非 0 异常，这与 shell 脚本的 set -e 判断的是同一套编码。",
            bonus:
              "docker inspect 容器名 的 State 字段还有 ExitCode、Error、OOMKilled 等细节，比 ps 更完整。",
            depth: 1,
          },
          {
            q: "docker logs 看到的日志是从哪来的？为什么 nginx 的访问日志也能用它看？",
            intent:
              "考察「容器日志 = PID 1 的标准输出」模型——理解了它，才能解释日志驱动、日志轮转等一系列问题。",
            a: "docker logs 读取的是容器主进程（PID 1）及其子进程写到 stdout/stderr 的内容，Docker 把它们落成 JSON 文件按需回放。nginx 官方镜像把 /var/log/nginx/access.log 软链到 /dev/stdout、error.log 软链到 /dev/stderr——nginx 写日志文件时实际写进了标准输出流，于是被 Docker 收编。这是容器日志最佳实践（只写 stdout）的实物示范。",
            bonus:
              "logs 默认不跟随，-f 等价 tail -f；文件驱动默认无轮转，久了会撑爆磁盘，生产要配 logging 选项或专门的日志采集。",
            depth: 2,
          },
          {
            q: "502 和 504 都是 nginx 给的，分别对应后端的什么状态？排查动作有什么不同？",
            intent: "检验错误码语义的精确性：连接拒绝与上游超时是两种病，开的药方完全不同。",
            a: "502 = nginx 连上了后端但拿到无效响应，或干脆连接被拒（connect refused 时 nginx 也回 502）——指向后端死了/没监听/协议不对，排查方向是后端进程与端口。504 = 连接成功但后端在超时时间内没回话——指向后端太慢或 nginx 的 proxy_read_timeout 太短，排查方向是后端耗时与超时配置。一个是「没有人接电话」，一个是「接了电话不说话」。",
            bonus:
              "网关类错误码都出自代理层：看到 502/504，先确认它是不是 nginx 发的（响应头 Server 字段），再决定往哪边查。",
            depth: 3,
          },
          {
            q: "K8s 里这套排查怎么对应？CrashLoopBackOff 大概率对应本篇的哪个故障？",
            intent:
              "迁移题：Docker 排障模型原样平移到 K8s，只换命令动词——检验模型是否已经抽象到工具无关。",
            a: "一一对应：docker ps → kubectl get pods；docker logs → kubectl logs；docker exec → kubectl exec -it；docker inspect → kubectl describe pod。-p 端口映射由 Service 承担。CrashLoopBackOff 就是本篇「容器秒退」的集群形态：主进程反复退出，kubelet 按退避策略不断重启——排查动作完全相同：kubectl logs 看口供（往往第一屏就是 nginx: [emerg] 配置错误）。",
            bonus:
              "describe pod 的 Events 段会告诉你镜像拉取失败、探针失败等非应用层原因——它比 inspect 更会「说话」。",
            depth: 3,
          },
          {
            q: "排障时 exec 进容器装了个 curl，问题解决了但隐患埋下了——这套操作的根本问题是什么？",
            intent:
              "压轴题：从操作上升到「不可变基础设施」方法论——排障行为与交付纪律的边界在哪里。",
            a: "根本问题：容器被当成了持久的机器而非不可变交付物。exec 安装写进可写层——它不在镜像里，任何重建/迁移/扩容都拿不到这份「修复」；同时它让线上容器的真实内容偏离镜像，审计与复现全部失真。正确姿势：临时探测用容器自带工具或一次性排障容器；定位根因后把修复落到配置/代码，走构建出镜像，让「修复」通过分发系统到达所有节点。",
            bonus:
              "这套纪律的名字叫不可变基础设施（immutable infrastructure）：东西只被替换、不被修改——与镜像 immutable 的设计动机一脉相承。",
            depth: 4,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        至此 Docker 部署系列闭环：三对象与镜像名 → 全景链路 → Dockerfile 装配 → 上下文与缓存 →
        继承与钩子 → 离线搬运 → nginx.conf → 部署脚本 → 运行排障。再往上一层是把这些环节串成自动化的
        CI/CD（git push 触发构建、流水线接管本系列的所有 docker 命令、K8s
        滚动更新）——那需要一个真实流水线素材做骨架，值得等素材齐了独立成篇。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "部署脚本 deploy.sh 每一步在做什么？",
            to: "/note/devtools/docker/deploy/deploy-script-anatomy",
            description: "前置：跑在本篇容器之前的那个脚本，set -e 与骨架精读。",
          },
          {
            title: "Docker 的镜像、容器、仓库是什么关系？",
            to: "/note/devtools/docker/registry/image-container-registry",
            description: "回到起点：系列第一篇的三对象，如今每个都有血肉了。",
          },
        ]}
      />
    </NoteShell>
  );
}

/** 命令类代码块：站内 CodeBlock 仅支持 JS/TS 高亮，命令类内容用此本地块呈现 */
