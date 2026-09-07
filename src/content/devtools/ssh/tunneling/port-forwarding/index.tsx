import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo/FlowChart";
import { CompareTable, DoDont, MemoryCard } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        端口转发的本质是<strong>借 SSH 的加密通道访问你原本「够不着」的服务</strong>
        ：本地转发 <code>
          -L
        </code> 把远端服务「拉」到本地端口（访问内网数据库/管理后台），远程转发{" "}
        <code>-R</code> 把本地服务「推」到远端端口（临时给外部展示本机开发中的服务），动态转发{" "}
        <code>-D</code> 起一个 SOCKS5
        代理（目标地址由每个请求当场决定）。跳板机解决的是更底层的问题——
        <strong>目标机器路由不通</strong>：现代写法 <code>ssh -J jump target</code>{" "}
        一条命令完成两段转发，
        认证流量端到端加密穿透跳板机，体验等同直连。三个方向共用一个记忆锚点：
        <strong>-L 拉远到近，-R 推近到远，-J 借道中转</strong>。
      </Conclusion>

      <Heading level={2} title="隧道思想的来源：一条连接里的多条通道" />
      <Paragraph>
        篇一讲过 SSH 协议分层：最上层是连接层（SSH-CONN），它允许在
        <strong>一条加密连接里多路复用 多个逻辑通道</strong>（channel）——你的交互 shell 是一个
        channel，再开一个窗口复制文件是另一 个
        channel，彼此独立互不阻塞。端口转发只是把这个机制用在了别处：
        <strong>channel 的两端不再都接「你的 shell」，而是各接一个不同的数据源</strong>
        ——一端接本地 端口，另一端接远端能到达的某个地址。
      </Paragraph>
      <Paragraph>
        理解了这一点，三种转发模式就不用死记：它们只是「channel 两端接什么」的三种组合。数据流向统一
        成一句话：
        <strong>谁监听端口，流量就从谁那里进来；对面接谁，数据最终就到谁那里</strong>。加密
        始终只发生在 SSH 连接内部的两点之间。
      </Paragraph>

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
      <MemoryCard keyword="转发是「开在新端口的门」，加密是「门后的走廊」" color="#1677ff">
        <p>
          判断任何转发场景只问两个问题：① 我在本机（还是远端）连哪个新端口？②
          数据出了隧道后要去哪？答完 这两问，-L / -R / -D
          的命令参数自动浮出来。所有转发的前提是：你先要有一台「两头都够得着」的 SSH 服务器。
        </p>
      </MemoryCard>

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
        <code>myserver:9000</code> → 数据顺着隧道回流到你本机的 3000。相当于穷人版 ngrok，给外部
        webhook 回调联调、给同事演示本地半成品，都是它的经典用法。
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
        流量穿隧道、以服务器身份访问 ，于是「仅内网可见」的站点打开了；在不可信的公共 Wi-Fi
        上，浏览流量全部加密回家。对比记忆：
        <strong>-L 是固定线路的专用通道，-D 是出租的通用通道，去哪由乘客（每个请求）说了算</strong>
        。
      </Paragraph>

      <CompareTable
        label="三种转发选型 / -L vs -R vs -D"
        left={{
          title: "-L 本地转发（拉）",
          color: "#1677ff",
          points: [
            "方向：远端服务 → 本地新端口",
            "目标写死在参数里，一端口一服务",
            "典型：GUI 连内网数据库、看内网 Grafana",
            "本机程序无感知，当 localhost 用",
          ],
        }}
        right={{
          title: "-R 远程转发（推）与 -D 动态",
          color: "#8b5cf6",
          points: [
            "-R 方向：本地服务 → 远端新端口（外部访问回流）",
            "-R 典型：给外网展示本地开发中服务、webhook 联调",
            "-D：起 SOCKS5 代理，目标随请求变化",
            "-D 典型：一次代理访问全部内网站点、公共 Wi-Fi 加密",
          ],
        }}
      />

      <Heading level={2} title="跳板机：目标机器路由不通怎么办" />
      <Paragraph>
        前面所有转发的前提是「你至少能 SSH 到一台服务器」。但公司内网机器（10.x.x.x）连 SSH 都路由不
        到——没有公网 IP，你的包根本出不了公网到达它。此时唯一办法是借一台
        <strong>两头都通</strong>的 机器中转，它就是跳板机（jump host）：
      </Paragraph>

      <FlowChart
        label="跳板拓扑 / jump host"
        height={280}
        data={{
          direction: "LR",
          nodes: [
            { id: "laptop", label: "笔记本（家庭网络）", color: "#1677ff" },
            { id: "jump", label: "跳板机（唯一有公网 IP）", color: "#f59e0b" },
            { id: "target", label: "目标机 10.0.0.5（内网）", color: "#3fb950" },
          ],
          edges: [
            { source: "laptop", target: "jump", label: "第一段：公网可达" },
            { source: "jump", target: "target", label: "第二段：内网可达" },
          ],
        }}
      />
      <Heading level={3} title="两跳手动 vs 端到端隧道" />
      <Paragraph>
        传统方式是先登录跳板机、再从跳板机上登录目标机。能用，但有两个深层问题：
        <strong>① 你的全部流量在跳板机上以明文形态流过</strong>
        （第二段连接由跳板机发起，跳板机 root 可以看到你敲的一切）；② 体验割裂——scp、rsync、git
        都没法直接对目标机操作，每个工具都 得手动中转两遍。
      </Paragraph>
      <Paragraph>
        现代方式 <code>ssh -J jump@跳板机 deploy@10.0.0.5</code> 的本质是{" "}
        <strong>TCP 层转发</strong>：跳板机的 sshd 收到你的转发请求后，替你向 10.0.0.5 发起 TCP
        连接，然后把两条连接拼接成一条管道。你的认证和数据<strong>端到端加密穿透</strong>
        跳板机，跳板机只看到不透明的加密字节流——体验完全等同直连，所有工具透明工作。
      </Paragraph>

      <ShellBlock>{`# 一条命令直达（跳板机、目标机的认证各自独立）
ssh -J jump@jump.example.com deploy@10.0.0.5

# 写进 ~/.ssh/config 后：ssh target 即达
Host target
  HostName 10.0.0.5
  User deploy
  ProxyJump jump@jump.example.com   # 借道跳板机

# 多级跳板空格分隔：ssh -J jump1,jump2 target`}</ShellBlock>
      <MemoryCard keyword="两种信任模型：流量路过 ≠ 流量可见" color="#f59e0b">
        <p>
          两跳手动：跳板机是<strong>流量的终点和起点</strong>
          ，能看到一切（对审计产品是特性，对个人是 隐患）。ProxyJump：跳板机只是
          <strong>管道的拼接点</strong>，只看到加密字节流。选哪种取决于
          你要「可控的中转」还是「透明的通路」——商业堡垒机选前者（为了录像），个人跳板选后者（为了
          体验）。
        </p>
      </MemoryCard>

      <Heading level={2} title="自建简易跳板机的加固清单" />
      <Paragraph>
        没有预算上堡垒机产品时，一台加固过的跳板机足以覆盖小团队需求。核心思路：
        <strong>跳板机只做转发这一件事，其余能力全部关闭</strong>
        ——它是你内网的唯一入口，也是最贵的 攻击目标，一旦沦陷等于整个内网沦陷。
      </Paragraph>

      <DoDont
        label="跳板机 sshd_config / hardening"
        dont={{
          code: `# 默认配置直接暴露公网
#PermitRootLogin prohibit-password
#PasswordAuthentication yes
#AllowTcpForwarding yes
#X11Forwarding no
# → root 可登、密码可爆破、
#   任何账号都能转发、还开了 X11`,
          note: "裸奔的跳板机等于把内网大门焊在公网上：爆破脚本 7×24 小时不断，一旦弱口令失守，攻击者以此为跳板横向扫描整个内网。",
        }}
        do={{
          code: `# /etc/ssh/sshd_config（跳板机专用）
PermitRootLogin no
PasswordAuthentication no      # 只允许密钥
AllowTcpForwarding yes         # 转发是它的本职
AllowAgentForwarding no        # 防密钥被服务器借用
X11Forwarding no
AllowUsers jumpuser            # 只留一个受限账号`,
          note: "原则：关闭一切与「转发」无关的能力。配合 fail2ban 防爆破、防火墙只放行 SSH 端口、系统精简不跑业务、补丁及时打。",
        }}
      />
      <Paragraph>
        清单之外还有两条认知：其一，<strong>跳板机是单点</strong>
        ——它挂了所有人都进不去内网，重要环境要么准备第二台，要么接受这个风险写进预案；其二，简易跳板
        机没有<strong>审计能力</strong>
        （谁在什么时候连了哪台机器、干了什么），这正是它与堡垒机产品 的分界线——下一讲的起点。
      </Paragraph>

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "-L 3306:localhost:3306 里两个 3306 分别是谁的端口？写成 -L 3306:internal-db:5432 又是什么意思？",
            intent: "热身题：端口转发翻车第一名就是没分清「监听端口」和「目标地址」的归属视角。",
            a: "第一个 3306 是你本机的监听端口（转发入口），冒号后面的 localhost:3306 是「从服务器视角解析」的目标地址——本例指服务器自己的 3306。所以 -L 3306:internal-db:5432 的意思是：本机开 3306，数据出隧道后由服务器去连它内网的 internal-db 的 5432——一跃穿透到服务器能到达、而你到不了的第三台机器。记忆：本地端口:目标地址:目标端口，目标按服务器视角解析。",
            bonus:
              "同理 -R 9000:localhost:3000 的 localhost 是「从谁登录的客户端视角」解析——回流最终到达你本机的 3000。两个方向的目标地址视角相反。",
            depth: 1,
          },
          {
            q: "内网服务器上跑了个 Web 服务，你在本地浏览器直接转发访问了。现在外网同事也要看，为什么 -R 转发后他访问不了？",
            intent:
              "考察对 sshd 安全默认值（GatewayPorts / bind 地址）的理解，-R 最常见的「不生效」。",
            a: "sshd 出于安全默认只把 -R 请求的端口绑定在服务器的 localhost（回环地址）上——同事从外网访问服务器的公网 IP 根本到不了那个端口，它只对服务器本机可见。解法是在服务器 sshd_config 里设 GatewayPorts yes（或 clientspecified）并重启 sshd，让远程端口绑定在 0.0.0.0 对外监听；更稳妥的替代是不开这个选项，在服务器上再用一层 -L 或反向 nginx 转发出去。",
            bonus:
              "GatewayPorts 全局打开有风险：任何能登录的用户都能把内网服务暴露到公网。生产服务器更推荐 clientspecified + 防火墙白名单精确控制哪些端口可对外。",
            depth: 2,
          },
          {
            q: "ProxyJump 和在跳板机上手动再 ssh 一次，对跳板机而言看到的流量有什么本质区别？为什么说这是「两种信任模型」？",
            intent:
              "区分「TCP 转发」与「会话终结」两个层次——这也是理解下一讲堡垒机录像原理的伏笔。",
            a: "两跳手动时，你的第二段连接由跳板机发起，明文在跳板机内存里组装——root 可以看到你的全部命令与数据，跳板机是流量的「终点和起点」。ProxyJump 是纯 TCP 层转发：跳板机只负责把两条 TCP 连接拼成管道，你的认证与数据端到端加密穿透，跳板机只见加密字节流。这是「可见的中转」与「透明的通路」两种信任模型：堡垒机产品为了审计录像必须选前者，个人跳板为了体验和安全选后者。",
            bonus:
              "ProxyJump（OpenSSH 7.3+）等价于旧的 ProxyCommand ssh -W %h:%p jump，但更简洁且自动处理好密钥代理问题——看到老文档里的 ProxyCommand 写法知道它们同源即可。",
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
        到这里你已经能借隧道到达任何「够得着一台跳板」的机器。但换个视角：跳板机知道你连了哪台机器
        （ProxyJump）甚至看到了你的一切（两跳手动），而公司需要的是<strong>反过来</strong>
        ——让机器
        的每一次访问都受控、留痕、可追责。把「跳板」从一个人的工具变成一个组织的安全设施，就是{" "}
        <strong>堡垒机</strong>；再把「进门查一次」升级成「每次访问都验证身份与设备」，就是{" "}
        <strong>零信任</strong>——沿这条线继续走。
      </Paragraph>
    </NoteShell>
  );
}

function ShellBlock({ children }: { children: string }) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg bg-[#0d1117] p-4">
      <pre className="font-mono text-xs leading-relaxed whitespace-pre text-[#e6edf3]">
        {children.trim()}
      </pre>
    </div>
  );
}
