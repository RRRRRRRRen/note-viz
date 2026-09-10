import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { SequenceDiagram } from "@/components/viz/SequenceDiagram";
import { Exercise, ShellBlock } from "@/components/demo";
import { CrossRef, DoDont, LayerStack, MemoryCard, SpecQuote, Table } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        <code>FROM</code> 继承的是<strong>全套家当</strong>
        ：父镜像的文件系统加上它的全部元数据（ENV、
        EXPOSE、WORKDIR、ENTRYPOINT、CMD、STOPSIGNAL……）。覆盖规则是
        <strong>同键覆盖、后写者赢</strong>
        ——用前端的话说就是浅合并 <code>{"{ ...parent, CMD: myCmd }"}</code>
        ，没写的键原样保留。容器启动时 Docker 把 <strong>ENTRYPOINT 和 CMD 拼成一条命令执行</strong>
        ；nginx 官方镜像的 ENTRYPOINT 是一个钩子脚本，先依次运行 /docker-entrypoint.d/
        下的初始化脚本、 再把控制权交给
        nginx——这就是"清单里没写启动命令，容器却自动跑起来"的完整答案。
      </Conclusion>

      <Heading level={2} title="继承的不是文件系统，是全套家当" />
      <Paragraph>
        用一份真实的清单做删除实验：把 <code>COPY conf</code> 和 <code>COPY dist</code> 都删掉，只留
        FROM——构建照样成功，容器照样启动欢迎页。文件没带进来，行为却全在： 因为随 FROM
        传下来的还有一层看不见的东西——<strong>元数据</strong>。它决定了默认环境变量、
        暴露端口、工作目录、启动命令。这不是理论推演，nginx
        官方镜像自己就是活案例——它也是分层继承的：
      </Paragraph>
      <ShellBlock>{`# nginx:stable-alpine 的清单（简化）：
FROM nginx:1.30.4-alpine-slim     ← ENTRYPOINT/CMD 不在这一层！
ENV NJS_VERSION=...

# 而 ENTRYPOINT 等定义在它的父层 alpine-slim 里：
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 80
STOPSIGNAL SIGQUIT
COPY docker-entrypoint.sh /
COPY 10-listen-on-ipv6-by-default.sh /docker-entrypoint.d/
COPY 20-envsubst-on-templates.sh /docker-entrypoint.d/
...`}</ShellBlock>
      <Paragraph>
        你的前端镜像 FROM stable-alpine，stable-alpine FROM alpine-slim——ENTRYPOINT 和 CMD
        <strong>隔着两层照样传到你手里</strong>
        。整个继承链像一摞透明的玻璃片：每一层只画自己的增量，
        从顶往下看，看到的是所有层叠加后的合并视图；某层没画的部分，露出的是底下的图案：
      </Paragraph>

      <LayerStack
        label="镜像继承链 / inheritance stack"
        title="自上而下叠加：上层遮罩同路径的下层文件，元数据后写者赢"
        layers={[
          {
            name: "你的清单（COPY conf + dist）",
            desc: "只贡献 2 个文件层，元数据一条没写 → 全盘继承",
            color: PALETTE.green,
          },
          {
            name: "nginx:1.30.4-alpine-slim 之上加装 nginx 的层",
            desc: "安装 nginx；ENTRYPOINT / CMD / EXPOSE 80 / STOPSIGNAL 在这一层声明",
            color: PALETTE.blue,
          },
          { name: "alpine 底座", desc: "约 8MB 的精简 Linux 根文件系统", color: PALETTE.gray },
        ]}
        direction="top-down"
      />

      <Paragraph>
        覆盖规则也和浅合并一致：你的清单写哪条元数据，哪条就以后写的值为准；一条不写，全部沿用父镜像。
        官方对「同键冲突」的裁决规则（LABEL 一节原文，ENV/EXPOSE 等其余元数据同规则）——
      </Paragraph>
      <SpecQuote source="Docker Docs · Dockerfile reference">
        If a label already exists but with a different value, the most-recently-applied value
        overrides any previously-set value.
      </SpecQuote>
      <Paragraph>
        用 JS 的心智模型写出来就是一行：<code>{"const child = { ...parent, CMD: myCmd }"}</code>——
        只覆盖明确给出的键，其余键（包括启动命令）原样继承。
      </Paragraph>

      <Heading level={2} title="启动命令：ENTRYPOINT 与 CMD 的分工" />
      <Paragraph>容器启动时，Docker 把两者拼成一条完整命令执行。它们的官方定位：</Paragraph>
      <SpecQuote source="Docker Docs · Dockerfile reference">
        The purpose of a CMD is to provide defaults for an executing container. There can only be
        one CMD instruction in a Dockerfile.
      </SpecQuote>
      <SpecQuote source="Docker Docs · Dockerfile reference">
        An ENTRYPOINT allows you to configure a container that will run as an executable.
      </SpecQuote>
      <Paragraph>
        分工可以记成：<strong>ENTRYPOINT 是固定主程序，CMD 是默认参数</strong>。nginx
        镜像的教科书示范：<code>ENTRYPOINT ["/docker-entrypoint.sh"]</code> +{" "}
        <code>CMD ["nginx", "-g", "daemon off;"]</code>——主程序是钩子脚本，默认参数是把 nginx
        拉起来。而 <code>docker run</code> 时在镜像名后面敲的内容，会
        <strong>顶替 CMD 的位置</strong>， ENTRYPOINT 纹丝不动：
      </Paragraph>
      <SpecQuote source="Docker Docs · Dockerfile reference">
        Command line arguments to docker run will be appended after all elements in an exec form
        ENTRYPOINT, and will override all elements specified using CMD.
      </SpecQuote>

      <Table
        label="docker run 传参对照 / who wins"
        head={["你敲的命令", "容器里实际执行", "说明"]}
        rows={[
          [
            "docker run nginx",
            "/docker-entrypoint.sh nginx -g daemon off;",
            "默认值：ENTRYPOINT + CMD 原样拼接",
          ],
          [
            "docker run nginx nginx -t",
            "/docker-entrypoint.sh nginx -t",
            "命令行参数顶替 CMD，主程序不动（验证配置的经典用法）",
          ],
          ["docker run --entrypoint sh nginx", "sh", "--entrypoint 连主程序都换掉，调试镜像时用"],
        ]}
      />

      <Heading level={2} title="启动钩子：docker-entrypoint.sh 在忙什么" />
      <Paragraph>
        nginx 镜像的启动命令主角不是 nginx，而是那个钩子脚本。它干两件事：先
        <strong>按文件名顺序</strong>
        执行 /docker-entrypoint.d/ 目录下的所有初始化脚本，最后用 <code>exec</code> 把自己替换成
        nginx。四个官方脚本各管一件事：
      </Paragraph>

      <SequenceDiagram
        label="容器启动时序 / container boot"
        actors={["Docker 引擎", "docker-entrypoint.sh", "entrypoint.d/*.sh", "nginx"]}
        messages={[
          { from: 0, to: 1, label: "启动容器：执行 ENTRYPOINT（PID 1）" },
          { from: 1, to: 2, label: "按文件名顺序执行初始化脚本", color: PALETTE.orange },
          { from: 2, to: 1, label: "10-ipv6 / 20-envsubst / 30-worker 完成", dashed: true },
          { from: 1, to: 3, label: "exec nginx -g daemon off;（进程替换）", color: PALETTE.green },
          { from: 3, to: 0, label: "前台运行，监听 80 端口", dashed: true },
        ]}
      />

      <Paragraph>
        两个细节值得盯住。<strong>其一，daemon off</strong>：nginx 默认会把自己变成后台守护进程，
        而容器的生命线是 PID 1 进程——主进程一退容器就停。所以容器里必须让 nginx
        前台运行，这条参数不是风格偏好，是容器化 nginx 的生死线。<strong>其二，exec 与信号</strong>
        ：官方用 exec 形式书写启动命令，理由官方文档说得清楚——
      </Paragraph>
      <SpecQuote source="Docker Docs · Dockerfile reference">
        Using the exec form doesn't automatically invoke a command shell. This means that normal
        shell processing, such as variable substitution, doesn't happen.
      </SpecQuote>
      <Paragraph>
        不经 shell 包裹，nginx 就是容器里的 PID 1，<code>docker stop</code>{" "}
        发出的停止信号直达它本人； nginx 镜像还声明了 <code>STOPSIGNAL SIGQUIT</code>——对 nginx
        来说这是"处理完存量请求再退"的优雅退出信号。整个停机链路：引擎发 SIGQUIT → PID
        1（nginx）收到 → 现有请求处理完 → 进程退出 → 容器停止，全程无强杀。
      </Paragraph>

      <MemoryCard keyword="完整启动命令 = ENTRYPOINT + CMD，元数据同键覆盖" color={PALETTE.purple}>
        <p>
          FROM 传家当：文件系统 + 全部元数据，覆盖规则 = <code>{"{ ...parent, ...mine }"}</code>{" "}
          浅合并。启动 = ENTRYPOINT（主程序）+ CMD（默认参数）拼接；
          <code>docker run 镜像 参数</code> 顶替 CMD，<code>--entrypoint</code> 才换主程序。nginx
          镜像的 ENTRYPOINT 是钩子脚本：先跑 /docker-entrypoint.d/*.sh 再 exec nginx；daemon off +
          exec form + STOPSIGNAL SIGQUIT 三件套保证"前台可活、停机优雅"。
        </p>
      </MemoryCard>

      <Heading level={2} title="边界与陷阱" />
      <Paragraph>
        三个高频坑都在"覆盖与信号"这条线上——覆盖了不该覆盖的元数据，或者让信号送不到该收的人手里。
      </Paragraph>

      <Heading level={3} title="坑 1：写 CMD 调试，忘了它已经顶掉 nginx" />
      <DoDont
        label="坑 1 · CMD 覆盖 / silent override"
        dont={{
          code: `# 想在镜像里保留个调试入口，加了一行：
FROM nginx:stable-alpine
COPY ./conf/nginx.conf /etc/nginx/nginx.conf
COPY ./dist /home/cnsig/cnsig-ems-ui
CMD ["sleep", "3600"]
# 推上仓库后：容器起来了，页面全挂
# —— nginx 从未被启动`,
          note: "CMD 顶替的是父镜像的默认参数，这次顶替的直接后果是「没人去启动 nginx 了」。容器活着 ≠ 服务活着。",
        }}
        do={{
          code: `# 清单里永远不写调试用 CMD；
# 临时调试用 run 参数，不进镜像：
$ docker run --rm -it --entrypoint sh my-image
/# nginx -t && ls /home/cnsig/cnsig-ems-ui`,
          note: "清单是交付物，调试是现场行为——用 --entrypoint 和 run 参数满足临时需求，镜像保持与父镜像一致的默认启动。",
        }}
      />

      <Heading level={3} title="坑 2：shell 形式的 CMD，让优雅停机失效" />
      <DoDont
        label="坑 2 · shell form / signal not delivered"
        dont={{
          code: `# 看起来等价的一行改动：
CMD nginx -g "daemon off;"
# 实际执行的是：/bin/sh -c "nginx -g ..."
# PID 1 是 sh，nginx 只是它的子进程
# docker stop → SIGQUIT 发给 sh → 被无视
# 10 秒后 SIGKILL 强杀，存量请求被腰斩`,
          note: "shell 形式会多包一层 sh -c，信号发给了不转发信号的 shell——10 秒宽限期后所有未完成的请求被硬切。",
        }}
        do={{
          code: `# exec 形式（数组写法），nginx 亲自当 PID 1：
CMD ["nginx", "-g", "daemon off;"]
# docker stop → SIGQUIT 直达 nginx
# → 处理完存量请求 → 优雅退出`,
          note: "官方镜像全部使用 exec 形式正是为了信号链路。判断口诀：看到不带数组的 CMD，先想一层「谁在当 PID 1」。",
        }}
      />

      <Heading level={3} title="坑 3：把 EXPOSE 当成端口开关" />
      <DoDont
        label="坑 3 · EXPOSE 迷信 / documentation only"
        dont={{
          code: `# 「容器访问不通，是不是清单里
#  忘了 EXPOSE 8080？」
EXPOSE 8080
# 加了这行，访问还是不通；
# 反过来删掉 EXPOSE 80，80 端口照样通`,
          note: "EXPOSE 是文档性元数据：声明「本镜像约定使用哪个端口」，供人阅读和工具提示，不建立也不封锁任何网络通路。",
        }}
        do={{
          code: `# 端口通不通由映射决定：
$ docker run -d -p 8080:80 nginx:stable-alpine
# 宿主机 8080 → 容器 80
# K8s 里则由 Service/containerPort 决定`,
          note: "排查端口问题的正确位置是运行时配置（-p / Service），不是清单里的 EXPOSE——它只是说明书的一行。",
        }}
      />

      <Heading level={2} title="动手练习" />
      <Exercise
        tags={["inspect", "拼接"]}
        hint="实际执行 = Entrypoint 数组 + Cmd 数组按顺序拼起来。"
        question={
          <>
            用 <code>docker inspect nginx:stable-alpine</code> 查到{" "}
            <code>Entrypoint: ["/docker-entrypoint.sh"]</code>、
            <code>Cmd: ["nginx", "-g", "daemon off;"]</code>
            。写出容器启动时实际执行的完整命令，并回答
            <code>docker run my-image nginx -v</code> 会执行什么、还能看到页面吗。
          </>
        }
        answer={
          <Paragraph>
            完整命令：<code>/docker-entrypoint.sh nginx -g "daemon off;"</code>（钩子脚本最终 exec
            成 nginx）。执行 <code>docker run my-image nginx -v</code>
            时，命令行参数顶替 CMD：实际执行 <code>/docker-entrypoint.sh nginx -v</code>
            ——钩子照常运行，随后 exec 成 <code>nginx -v</code> 打印版本号退出，容器随之停止。
            没有任何 nginx 服务在跑，自然也看不到页面——这是一次性的"跑完即退"。
          </Paragraph>
        }
      />
      <Exercise
        tags={["钩子", "初始化"]}
        hint="钩子机制扫描的是固定目录，按文件名顺序执行。"
        question={
          <>
            团队要求每次容器启动时先向配置中心注册自己（跑一段 <code>register.sh</code>）。不动
            ENTRYPOINT、不改官方脚本，只改自己的清单，怎么接入？
          </>
        }
        answer={
          <Paragraph>
            利用钩子机制：把脚本放进清单并丢进钩子目录——
            <code>COPY register.sh /docker-entrypoint.d/40-register.sh</code>
            。官方入口脚本会按文件名顺序执行 /docker-entrypoint.d/ 下的所有脚本，40
            号排在官方四个脚本之后、exec nginx 之前，正好完成"注册后开机"的时序。命名前缀（40-）就是
            执行顺序，这是这套机制最优雅的地方：不改任何既有文件，靠目录约定插入自己的逻辑。
          </Paragraph>
        }
      />

      <Heading level={2} title="追问链" />
      <QAChain
        intro="五问从元数据拼接到继承规则的特例。"
        items={[
          {
            q: "一份前端镜像清单 FROM 官方 nginx 后一行元数据都没写，它是怎么做到「启动即服务」的？",
            intent: "热身题，验证继承的最小结论：清单管装配，行为来自元数据，而元数据全部继承。",
            a: "启动行为由父镜像的 ENTRYPOINT 与 CMD 定义：前者是钩子脚本 /docker-entrypoint.sh，后者是 nginx -g daemon off;。子镜像一条元数据没写，浅合并后两个键原样保留，容器启动即执行钩子 → exec nginx 前台运行。清单里的两行 COPY 只是往文件系统里加了自己的文件，对行为零改动。",
            bonus:
              "docker history 能看到每一层：元数据指令表现为 0B 的层——它们不改文件，只改「身份」。",
            depth: 1,
          },
          {
            q: "docker run my-image echo hello 会不会启动 nginx？输出什么？",
            intent:
              "考察「docker run 参数顶替 CMD、保留 ENTRYPOINT」的精确语义——很多人误以为这样会整个换掉启动命令。",
            a: '不会启动 nginx。命令行参数 echo hello 顶替的是 CMD 的位置，ENTRYPOINT 保留：实际执行 /docker-entrypoint.sh echo hello。钩子脚本照常初始化，最后一行 exec "$@" 把自己替换成 echo hello，输出 hello 后进程退出、容器停止。整个过程 nginx 二进制从未运行。',
            bonus:
              "想让容器既执行自己的命令又不经过钩子脚本，用 --entrypoint echo my-image hello 直接换主程序。",
            depth: 2,
          },
          {
            q: "daemon off; 这条参数删掉会怎样？为什么容器里必须前台运行？",
            intent:
              "检验容器「生命线 = PID 1」的心智模型——这是所有服务容器化的通用约束，不只 nginx。",
            a: "nginx 默认会 fork 出后台守护进程、把控制终端交还——如果放任它这么做，容器里的 PID 1（启动脚本）执行完启动命令就退出了，PID 1 一退容器立即停止，表现为「容器启动即退出」。daemon off 禁用了守护进程化，让 nginx 本体留在前台充当常驻进程。通用法则：容器的主进程必须是前台进程，容器的寿命 = PID 1 的寿命。",
            bonus:
              "排查「容器秒退」第一件事就是 docker logs 看主进程说了什么，其次确认启动命令是不是一个会退出的短命命令。",
            depth: 3,
          },
          {
            q: "docker stop 时停止信号是谁发给谁的？写清单时怎么保证它能送到业务进程手里？",
            intent:
              "进阶题：信号链路 + exec form 的动机。答不出「shell 会挡信号」的人写出来的镜像都停不干净。",
            a: "docker stop 先向容器的 PID 1 发送 STOPSIGNAL 指定的信号（nginx 镜像配的是 SIGQUIT，对 nginx 意为优雅退出），等一个宽限期（默认 10 秒）后仍未退出才 SIGKILL 强杀。信号只能被 PID 1 接收——所以必须保证业务进程自己就是 PID 1：用 exec 形式写 CMD/ENTRYPOINT，不用 shell 形式（shell 形式下 PID 1 是 sh，它默认不转发信号给子进程）。",
            bonus:
              "必须用 shell 形式做变量展开时，在命令前加 exec（如 CMD exec nginx ...写进 sh -c 里），用 exec 替换让业务进程接管 PID 1；或调大 docker stop -t 的宽限期。",
            depth: 4,
          },
          {
            q: "「元数据继承 = 浅合并」有没有例外？子镜像写一行 ENTRYPOINT 后，父镜像的 CMD 会怎样？",
            intent:
              "压轴题：考察对官方规则的精读——ENTRYPOINT 与 CMD 之间存在一条浅合并解释不了的联动规则。",
            a: "有例外。官方规则明确：If CMD is defined from the base image, setting ENTRYPOINT will reset CMD to an empty value——子镜像一旦声明 ENTRYPOINT，父镜像的 CMD 会被清空而不是保留。原因是两者语义上要拼成一条命令：既然你换了主程序，父镜像的默认参数多半不再适配，Docker 选择清空以防「新主程序 + 旧参数」的错配。想保留参数就必须在新清单里重写 CMD。",
            bonus:
              '官方给的最佳组合：两条例子都用 exec 形式（ENTRYPOINT ["app"] + CMD ["--default"]），并用 docker run 镜像 --help 这类方式验证默认参数是否仍然适配新主程序。',
            depth: 5,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        到这里，FROM
        那一行的机制全部揭开：继承传家当、浅合并定覆盖、拼接起进程、钩子做初始化。接下来两篇
        走实战方向：<strong>离线搬运</strong>
        ——连私服都够不到的隔离内网怎么把镜像带过去；以及部署实战篇的 重头戏——
        <strong>那份让页面和接口都通的 nginx.conf</strong>。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "为什么构建上下文越大 build 越慢？",
            to: "/note/devtools/docker/dockerfile/build-context-cache",
            description: "上一篇：上下文、黑白名单与层缓存——清单之外的构建机制。",
          },
          {
            title: "没有外网的服务器怎么拿到 Docker 镜像？",
            to: "/note/devtools/docker/registry/offline-transfer",
            description: "系列下一篇：save/load 离线搬运全流程，与 export/import 的经典考点。",
          },
        ]}
      />
    </NoteShell>
  );
}

/** Dockerfile/配置类代码块：站内 CodeBlock 仅支持 JS/TS 高亮，此类内容用此本地块呈现 */
