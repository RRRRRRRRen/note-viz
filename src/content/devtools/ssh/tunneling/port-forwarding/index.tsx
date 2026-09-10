import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo";
import { CrossRef, DoDont, MemoryCard, Prerequisite, Table } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        <code>ssh -L 3306:localhost:3306</code> 的两个 3306 分属两台机器：
        <strong>第一个是你本机的监听端口</strong>（转发入口），冒号后的 <code>localhost:3306</code>{" "}
        是「<strong>从服务器视角解析</strong>」的目标地址——本例指服务器 自己的
        3306。记住这个视角，-L/-R/-D 三种转发就通了：本地转发 <code>-L</code>{" "}
        把远端服务拉到本地端口，远程转发 <code>-R</code> 把本地服务推到远端端口（注意 sshd
        默认只绑回环，对外暴露需 <code>GatewayPorts</code>），动态转发 <code>-D</code> 起 SOCKS5
        代理、目标由每个请求当场决定。技术对照：-L/-R ≈ nginx
        反向代理的一条条静态路由（一个端口固定一个 upstream），-D ≈ SOCKS
        层的动态代理（目标写在每个请求里）。数据流向统一一句话：
        <strong>谁监听端口，流量就从谁进来；对面接谁，数据最终到谁那里</strong>。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "SSH 是怎么保证远程登录安全的？",
            to: "/note/devtools/ssh/fundamentals/remote-access",
          },
        ]}
      >
        端口转发是 SSH
        连接层（SSH-CONN）能力的延伸——先有「一条加密连接」的模型，隧道才有挂靠的地方。
      </Prerequisite>

      <Heading level={2} title="隧道思想的来源：一条连接里的多条通道" />
      <Paragraph>
        SSH 协议分层里最上层是连接层（SSH-CONN），它允许在
        <strong>一条加密连接里多路复用多个逻辑通道</strong>（channel）——你的交互 shell 是一个
        channel，再开一个窗口复制文件是另一个
        channel，彼此独立互不阻塞。端口转发只是把这个机制用在了别处：
        <strong>channel 的两端不再都接「你的 shell」，而是各接一个不同的数据源</strong>
        ——一端接本地端口，另一端接远端能到达的某个地址。
      </Paragraph>
      <Paragraph>
        理解了这一点，三种转发模式就不用死记：它们只是「channel 两端接什么」的三种组合。数据流向统一
        成一句话：
        <strong>谁监听端口，流量就从谁那里进来；对面接谁，数据最终就到谁那里</strong>。加密
        始终只发生在 SSH 连接内部的两点之间。
      </Paragraph>
      <MemoryCard keyword="谁监听端口流量就从谁进，对面接谁数据就到谁" color="#1677ff">
        <p>
          判断任何转发场景只问两个问题：① 我在本机（还是远端）连哪个新端口？②
          数据出了隧道后要去哪？答完这两问，-L / -R / -D
          的命令参数自动浮出来。所有转发的前提是：你先要有一台「两头都够得着」的 SSH 服务器。
        </p>
      </MemoryCard>

      <FlowChart
        label="本地转发的数据流向 / ssh -L"
        height={300}
        data={{
          direction: "LR",
          nodes: [
            { id: "gui", label: "本机数据库客户端", color: "#1677ff" },
            { id: "localport", label: "本机 localhost:3306（-L 监听）", color: "#8b5cf6" },
            { id: "tunnel", label: "SSH 加密隧道", color: "#f59e0b" },
            { id: "mysql", label: "服务器本机的 MySQL:3306", color: "#3fb950" },
          ],
          edges: [
            { source: "gui", target: "localport", label: "连 localhost:3306" },
            { source: "localport", target: "tunnel", label: "进入 channel" },
            { source: "tunnel", target: "mysql", label: "服务器侧解出并连接" },
          ],
        }}
      />

      <Heading level={2} title="三种转发：拉远到近、推近到远、动态代理" />
      <Heading level={3} title="本地转发 -L：把远端服务拉到本地" />
      <Paragraph>
        最常用的场景：公司数据库禁止公网直连，只允许从服务器本机访问，但你手头有数据库 GUI 想连它。
        <code>ssh -L 3306:localhost:3306 myserver</code> 之后，本机 3306 被「接到」服务器的
        3306——GUI 里填 <code>localhost:3306</code>
        ，数据流向是 本机 → 加密隧道 → 服务器 → 服务器本机的
        MySQL。数据库全程以为有人在服务器上本机访问它，安全规则没有被破坏。
      </Paragraph>
      <Paragraph>
        目标地址写 <code>localhost</code> 是「从服务器的视角」解析的——所以也可以写成内网地址：
        <code>ssh -L 5432:internal-db:5432 myserver</code>{" "}
        穿透到「服务器能到达、但你到不了」的第二台机器（内网 PostgreSQL）。GPU 服务器上跑的
        Jupyter、内网 Grafana，都是同一个套路的常客。
      </Paragraph>

      <Heading level={3} title="远程转发 -R：把本地服务推到远端" />
      <Paragraph>
        方向反过来：你在本机开发了一个 Web 服务（localhost:3000），想让外网的人临时访问到。
        <code>ssh -R 9000:localhost:3000 myserver</code> 让服务器监听自己的 9000 端口，外部访问
        <code>myserver:9000</code> → 数据顺着隧道回流到你本机的 3000。相当于自建版的 ngrok/frp
        反向隧道，给外部 webhook 回调联调、给同事演示本地半成品，都是它的经典用法。
      </Paragraph>
      <Paragraph>
        注意一个默认行为：sshd 出于安全默认只把 -R 的端口绑在服务器的 localhost 上——外网真正访问
        不到，需要在服务器 sshd_config 里开 <code>GatewayPorts</code> 才对外监听。第一次用 -R
        「不生效」大概率是这里。
      </Paragraph>

      <Heading level={2} title="SOCKS 动态代理 -D：去哪由每个请求决定" />
      <Paragraph>
        -L 转发的是<strong>写死的</strong>目标（3306 就是 3306），要访问十个内网站点就得开十条转发。
        <code>ssh -D 1080 myserver</code> 换了一种模式：本机 1080 端口变成一个{" "}
        <strong>SOCKS5 代理服务器</strong>
        ，目标地址不再由命令行指定，而是由每个使用它的程序当场决定。
      </Paragraph>

      <FlowChart
        label="动态代理：目标由请求决定 / ssh -D"
        height={320}
        data={{
          direction: "TB",
          nodes: [
            { id: "browser", label: "浏览器（代理设置 → localhost:1080）", color: "#1677ff" },
            { id: "socks", label: "SOCKS5 入口（本机 1080）", color: "#8b5cf6" },
            { id: "tunnel", label: "SSH 加密隧道 → 服务器", color: "#f59e0b" },
            { id: "wiki", label: "internal.wiki.com（仅内网可达）", color: "#3fb950" },
            { id: "grafana", label: "grafana.internal（仅内网可达）", color: "#3fb950" },
          ],
          edges: [
            { source: "browser", target: "socks", label: "每个请求携带目标地址" },
            { source: "socks", target: "tunnel", label: "打包进隧道" },
            { source: "tunnel", target: "wiki", label: "请求 ①" },
            { source: "tunnel", target: "grafana", label: "请求 ②" },
          ],
        }}
      />
      <Paragraph>
        把浏览器代理指向 <code>localhost:1080</code> 后：访问内网 Wiki →
        流量穿隧道、以服务器身份访问，于是「仅内网可见」的站点打开了；在不可信的公共 Wi-Fi
        上，浏览流量全部加密回家。技术对照把三种模式一次分清：
        <strong>
          -L/-R 是 nginx 反向代理式的静态路由——一个端口写死一个 upstream；-D 是 SOCKS
          层的动态代理——upstream 写在每个请求报文里，由发起方当场决定
        </strong>
        。
      </Paragraph>

      <Table
        label="三种转发速查 / -L vs -R vs -D"
        head={["模式", "谁监听新端口", "数据出隧道后到哪", "典型场景"]}
        rows={[
          [
            <code>-L 3306:db:3306</code>,
            "本机 3306",
            "由服务器去连 db:3306（服务器视角解析）",
            "GUI 连内网数据库、看内网 Grafana",
          ],
          [
            <code>-R 9000:localhost:3000</code>,
            "服务器 9000",
            "回流到你本机 3000（客户端视角解析）",
            "给外网展示本地开发中服务、webhook 联调",
          ],
          [
            <code>-D 1080</code>,
            "本机 1080（SOCKS5）",
            "由每个请求的目标决定",
            "一次代理访问全部内网站点、公共 Wi-Fi 加密",
          ],
        ]}
      />
      <Paragraph>
        配套两个小但重要的选项：<code>-N</code> 表示「只建隧道不开 shell」（纯转发时脚本里必配）；
        <code>-f</code> 把 ssh 放进后台，终端不被占用——两者常连用为 <code>ssh -fN -L ...</code>。
      </Paragraph>

      <Heading level={2} title="边界与陷阱" />
      <DoDont
        label="-R 暴露面的控制 / GatewayPorts"
        dont={{
          code: `# /etc/ssh/sshd_config（服务器）
GatewayPorts yes
# 任何能登录的用户执行：
$ ssh -R 0.0.0.0:9000:localhost:3000 myserver
# → 本地开发服务直接暴露在公网 0.0.0.0:9000`,
          note: "GatewayPorts yes 允许远程端口绑 0.0.0.0：内网任何一台服务器的 SSH 账号失守，攻击者都能用 -R 把内网服务搬到公网。",
        }}
        do={{
          code: `# 默认 no：-R 端口只绑服务器 localhost
GatewayPorts clientspecified   # 需要时由客户端显式指定绑定地址
# 搭配防火墙白名单，只放行明确要对外的端口
# ufw allow from 203.0.113.0/24 to any port 9000`,
          note: "保持默认 no 最稳；确有对外需求用 clientspecified + 防火墙精确放行，让「谁能暴露、暴露给谁」成为显式决策。",
        }}
      />
      <DoDont
        label="后台隧道忘断 / -fN leak"
        dont={{
          code: `$ ssh -fN -L 3306:db:3306 myserver
# 用完了忘了关——进程还活着
$ lsof -iTCP:3306 -sTCP:LISTEN
ssh 12345 user  (LISTEN)
# 端口一直被占，几周后忘了它是谁`,
          note: "后台转发的生命周期没有管理界面：不关就一直占着本地端口、挂着一条连接。长期累积的「僵尸隧道」还会让人误判端口归属。",
        }}
        do={{
          code: `$ ssh -fN -L 3306:db:3306 myserver
# 用完即关：按监听端口找进程
$ kill $(lsof -tiTCP:3306 -sTCP:LISTEN)
# 或给隧道起专用别名，管理有据：
# ~/.ssh/config 里 Host db-tunnel 配 LocalForward，用后 Ctrl+C`,
          note: "后台隧道当一次性资源用：建立时记下端口，用完按端口 kill。常用隧道写进 config 用前台跑，Ctrl+C 即断，生命周期清晰。",
        }}
      />
      <DoDont
        label="目标地址的视角 / whose localhost"
        dont={{
          code: `# 笔记本上想连「服务器上的」MySQL：
$ ssh -L 3306:localhost:3306 myserver
# 想连「本机笔记本上的」MySQL 时也写它——错
# localhost 是从 myserver 视角解析的`,
          note: "-L 冒号后的地址按「服务器视角」解析：localhost 指服务器自己，不是你的笔记本。视角搞反，隧道通到的往往是意料之外的那台机器。",
        }}
        do={{
          code: `# 连服务器本机服务：localhost 没问题
$ ssh -L 3306:localhost:3306 myserver
# 连「服务器能到、本机到不了」的第三台：
$ ssh -L 5432:internal-db.internal:5432 myserver
# 记忆：目标永远描述「服务器往哪连」`,
          note: "写 -L 前先自问：数据出了隧道，由谁去连哪个地址？答案永远是「服务器去连」，目标地址就按服务器的网络环境写。",
        }}
      />

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "-L 3306:localhost:3306 里两个 3306 分别是谁的端口？写成 -L 3306:internal-db:5432 又是什么意思？",
            intent: "热身题：端口转发翻车第一名就是没分清「监听端口」和「目标地址」的归属视角。",
            a: "第一个 3306 是你本机的监听端口（转发入口），冒号后面的 localhost:3306 是「从服务器视角解析」的目标地址——本例指服务器自己的 3306。所以 -L 3306:internal-db:5432 的意思是：本机开 3306，数据出隧道后由服务器去连它内网的 internal-db 的 5432——一跃穿透到服务器能到达、而你到不了的第三台机器。记忆：本地端口:目标地址:目标端口，目标按服务器视角解析。",
            bonus:
              "同理 -R 9000:localhost:3000 的 localhost 是「从发起登录的客户端视角」解析——回流最终到达你本机的 3000。两个方向的目标地址视角相反。",
            depth: 1,
          },
          {
            q: "内网服务器上跑了个 Web 服务，你转发着访问没问题。现在外网同事也要看，为什么 -R 转发后他访问不了？",
            intent:
              "考察对 sshd 安全默认值（GatewayPorts / bind 地址）的理解，-R 最常见的「不生效」。",
            a: "sshd 出于安全默认只把 -R 请求的端口绑定在服务器的 localhost（回环地址）上——同事从外网访问服务器的公网 IP 根本到不了那个端口，它只对服务器本机可见。解法是在服务器 sshd_config 里设 GatewayPorts yes（或 clientspecified）并重启 sshd，让远程端口绑定在 0.0.0.0 对外监听；更稳妥的替代是不开这个选项，在服务器上再用一层 -L 或 nginx 反代转出去。",
            bonus:
              "GatewayPorts 全局打开有风险：任何能登录的用户都能把内网服务暴露到公网。生产服务器更推荐 clientspecified + 防火墙白名单精确控制哪些端口可对外。",
            depth: 2,
          },
          {
            q: "ssh -D 的 SOCKS 代理和公司 VPN 有什么本质区别？为什么浏览器配了 -D，只有浏览器流量走隧道？",
            intent:
              "技术对照题：检验能否区分「应用层按请求代理」与「网络层接管全部流量」两种隧道形态——这是选型 VPN 还是 -D 的分界线。",
            a: "两层机制不同。-D 是 SOCKS 层的动态代理：只有「显式配置了代理设置」的程序（浏览器、curl --socks5）把请求交给本机 1080 端口，每个请求自带目标地址，出隧道后由服务器代为访问——粒度按应用、按请求，其他程序毫无感知。VPN 在网络层接管：虚拟网卡 + 路由表把整机的（或全网的）IP 包收进隧道，应用无感、无法按应用分流。所以 -D 适合「我要精确控制哪些流量回家」，VPN 适合「这台机器的所有流量都要走内网」。",
            bonus:
              "-D 只代理 TCP（SOCKS5 的 UDP ASSOCIATE 多数 SSH 实现不支持），所以浏览器配 -D 时 DNS 解析要走代理的远端解析（SOCKS5h）才不漏——细节没配对会出现「网页开了但 DNS 查询走本地」的半加密状态。",
            depth: 3,
          },
          {
            q: "端口转发让「够不着的服务」变得可达，这本身是不是一个安全漏洞？企业环境该怎么治理？",
            intent: "安全视角收束题：考察能否从工具使用上升到攻击面治理，区分「能力」与「风险」。",
            a: "它是一把双刃剑，本质是「任何能 SSH 登录的人，都自动获得了以服务器视角访问其内网的能力」——这正是内网横向移动的经典路径之一：攻陷一台边缘服务器后，攻击者用 -L 把整个内网一步步拖出来。治理手段三层：服务器侧 sshd_config 设 AllowTcpForwarding no 关闭不需要转发的主机；网关层防火墙限制服务器对外/对内的连接目标；更彻底的是零信任体系里由代理统一接管转发并审计——隧道可以建，但每一跳都留痕可控。",
            bonus:
              "一个反直觉的事实：-R 反向转发能绕过入站防火墙（连接是你主动发起的出站），所以「服务器禁止入站」并不等于「内网服务出不去」——出站方向的控制同样重要。",
            depth: 4,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        三种转发都建立在一个前提上：你至少能 SSH 到一台「两头够得着」的服务器。当目标机器连 SSH
        都路由不到、必须借道中转时，「跳板机」登场——它的本质也是转发的一种特例，但信任模型和访问控制
        是全新的一层。延伸阅读见下。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "跳板机是怎么控制访问的？",
            to: "/note/devtools/ssh/tunneling/jump-host",
            description: "ssh -J 与 ProxyJump 的端到端穿透、跳板只见密文的信任模型与自建加固清单。",
          },
          {
            title: "SSH 是怎么保证远程登录安全的？",
            to: "/note/devtools/ssh/fundamentals/remote-access",
            description:
              "转发的地基：SSH 连接七步与 channel 所在的协议分层，加密为什么只发生在连接两端。",
          },
        ]}
      />
    </NoteShell>
  );
}
