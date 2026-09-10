import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart, ShellBlock } from "@/components/demo";
import { CompareTable, CrossRef, DoDont, MemoryCard, Timeline } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        SSH（Secure Shell）是在不安全网络上安全操作远程机器的加密协议，默认端口
        22，客户端-服务器模型：<code>ssh</code> 与 <code>sshd</code> 的分工 ≈{" "}
        <strong>curl 与 nginx：一个发起请求，一个常驻应答</strong>——所以
        <strong>只有「被别人连」的机器才需要装 sshd</strong>
        ，服务器系统通常装好即开机自启，桌面系统默认关闭。安全主线一条：
        <strong>非对称密钥做认证（私钥不出门），对称加密做传输</strong>
        ；用户认证发生在加密通道建立之后，密码与密钥签名都不走明文。认证通过后的登录状态就是那条活的
        TCP 连接本身，不需要「重新验证」直到连接断开。日常两件套：<code>ssh user@host</code> 登录、
        <code>ssh host '命令'</code> 远程执行；传文件与 <code>~/.ssh/config</code>{" "}
        是独立的工具话题（见文末延伸阅读）。
      </Conclusion>

      <Heading level={2} title="ssh 与 sshd：一个协议的两个角色" />
      <Paragraph>
        SSH 是协议标准，落地实现是两个不同的程序。最容易混淆的就是名字只差一个字母的这一对：
        <code>ssh</code> 是<strong>客户端</strong>——你想连别人时敲的命令；<code>sshd</code> 是
        <strong>服务端</strong>（结尾的 d 是 daemon，守护进程）——常驻后台监听 22
        端口，等别人来连，负责验证身份、给你开 shell。一个技术对照：
        <strong>ssh 与 sshd 的关系 ≈ curl 与 nginx——一个按需发起请求，一个常驻进程应答</strong>
        。curl 不需要开机自启，nginx 不关心谁来请求；同样，ssh 用时才跑，sshd 一直守着端口。
      </Paragraph>
      <Paragraph>
        分工决定了安装需求的不对称：<strong>你的笔记本永远只需要客户端</strong>
        （macOS/Linux 自带），哪怕它一辈子不监听任何端口；只有当一台机器要「被别人连」时才需要装
        sshd。最主流的实现叫 OpenSSH，两个角色都包含在内。
      </Paragraph>

      <CompareTable
        label="客户端与服务端 / ssh vs sshd"
        left={{
          title: "ssh（客户端）",
          color: "#1677ff",
          points: [
            "发起连接的一方，输入命令的那个人用",
            "装在你自己的笔记本 / 工作机上",
            "macOS、Linux 发行版默认自带，无需安装",
            "不监听端口、不需要开机自启",
            "Windows 10+ 可选装 OpenSSH Client",
          ],
        }}
        right={{
          title: "sshd（服务端）",
          color: "#f59e0b",
          points: [
            "接受连接的一方，被远程操作的机器运行",
            "只装在服务器上",
            "Ubuntu 需手动装 openssh-server 包",
            "装好后 systemd 默认 enable + 立即启动，开机自启",
            "桌面系统默认关闭：macOS 要开「远程登录」共享",
          ],
        }}
      />
      <Paragraph>
        所以「SSH 软件是不是系统自带、是不是开机自启」这个问题要拆开答：
        <strong>客户端永远自带且无需启动</strong>（它是用时才跑的普通程序，不是服务）；服务端在
        <strong>服务器上是装好即自启</strong>（<code>systemctl status ssh</code> 可查看状态），在
        <strong>桌面系统上默认不开启</strong>——你的 Mac 没开「远程登录」共享时就没有 sshd
        在跑，别人连不进来，这是刻意的安全默认。
      </Paragraph>

      <Heading level={2} title="一次连接的完整流程" />
      <Paragraph>
        敲下 <code>ssh user@host</code> 到看到远程提示符，中间发生了七步。理解这条链路，后面所有安全
        机制（防窃听、防中间人、防冒充）都能对号入座：
      </Paragraph>

      <Timeline
        label="SSH 连接七步 / connection setup"
        steps={[
          { label: "TCP 握手", sub: "三次握手建管道", color: "#f59e0b" },
          { label: "版本协商", sub: "交换 SSH-2.0 字符串", color: "#f59e0b" },
          { label: "算法协商", sub: "各自报清单取交集", color: "#f59e0b" },
          { label: "密钥交换", sub: "DH 协商出会话密钥", color: "#8b5cf6" },
          { label: "服务器认证", sub: "host key 验签防中间人", color: "#8b5cf6" },
          { label: "用户认证", sub: "密码或密钥签名", color: "#1677ff" },
          { label: "加密会话", sub: "后续流量全部对称加密", color: "#3fb950" },
        ]}
      />
      <Paragraph>
        前三步是例行公事：建立 TCP
        连接、交换协议版本字符串、各自亮出支持的加密算法列表取交集。真正的重头戏在中间两步——
      </Paragraph>
      <Paragraph>
        <strong>第 4 步 Diffie-Hellman 密钥交换</strong>
        解决的问题是：双方在完全公开的信道上，怎么协商出只有他俩知道的会话密钥？双方公开交换一些数字，各自计算出
        <strong>相同的</strong>共享密钥
        ，而窃听者虽然看到了全部交换过程，面对离散对数难题也算不出来。且这对密钥是每次连接临时生成的，
        即使服务器私钥日后泄露，过去的会话记录也解不开——这叫前向保密（PFS）。
      </Paragraph>
      <Paragraph>
        <strong>第 5 步服务器认证</strong>防的是中间人攻击：协商过程由服务器的 host key（主机密钥）
        签名，客户端拿 <code>~/.ssh/known_hosts</code> 里存的公钥验证。首次连接时那句「The
        authenticity of host ... 确认继续?」就是在问你：要把这台服务器的指纹记进通讯录吗？此后如果
        有人冒充这台服务器，指纹对不上，SSH 会大声报警拒绝连接。
      </Paragraph>
      <Paragraph>
        第 6 步用户认证通过后，所有流量走第 4 步协商出的对称加密（AES-GCM / ChaCha20-Poly1305 这类
        高性能算法）。注意整套设计的分工：
        <strong>
          非对称加密只用在认证和密钥交换这些「一次性」环节
          （慢但安全），真正搬运数据的加密是对称的（快）
        </strong>
        ——用完即弃的临时密钥 + 高速对称传输，兼得安全与性能。
      </Paragraph>

      <FlowChart
        label="认证与加密分工 / auth vs transport"
        height={300}
        data={{
          direction: "LR",
          nodes: [
            { id: "dh", label: "DH 密钥交换：公开信道协商秘密", color: "#8b5cf6" },
            { id: "host", label: "host key 签名：证明我是真服务器", color: "#f59e0b" },
            { id: "user", label: "用户认证：证明我是我", color: "#1677ff" },
            { id: "session", label: "对称加密会话：AES/ChaCha20", color: "#3fb950" },
          ],
          edges: [
            { source: "dh", target: "host", label: "交换结果由服务器签名" },
            { source: "host", target: "user", label: "确认服务器身份后" },
            { source: "user", target: "session", label: "认证通过 → 加密通道" },
          ],
        }}
      />

      <Heading level={2} title="密钥认证：不传秘密的身份证明" />
      <Paragraph>
        先纠正一个流传很广的说法——「密码认证会把密码暴露给抓包的人」。回看上面的流程：
        <strong>用户认证（第 6 步）发生在加密通道建立（第 4 步）之后</strong>
        ，密码是在对称加密通道内传输的，被动抓包只能看到密文，拿不到密码。密码认证的真实弱点在别处：
        其一，<strong>服务端必须保管「能验证密码的秘密」</strong>
        ，服务器数据库一泄露，你在这台机器上
        的身份就被人接管（密钥认证下服务端只有公钥，泄露无害）；其二，
        <strong>你把密码交给「你以为是真服务器」的通道终点</strong>
        ——host key 首连麻痹（指纹不对也随手 yes）等于给中间人递刀，钓鱼登录页则是让人主动把密码送给
        假端点。密钥认证换了一套模型，把这三个弱点一起拆掉：
      </Paragraph>

      <FlowChart
        label="签名挑战模型 / publickey auth"
        height={320}
        data={{
          direction: "TB",
          nodes: [
            { id: "pair", label: "本机生成密钥对：私钥 + 公钥", color: "#1677ff" },
            {
              id: "upload",
              label: "公钥追加到服务器 ~/.ssh/authorized_keys",
              color: "#8b5cf6",
            },
            { id: "challenge", label: "登录时：服务器发随机挑战串", color: "#f59e0b" },
            { id: "sign", label: "本机私钥签名挑战（私钥不出门）", color: "#1677ff" },
            { id: "verify", label: "服务器用公钥验签 → 放行", color: "#3fb950" },
          ],
          edges: [
            { source: "pair", target: "upload", label: "一次性配置" },
            { source: "upload", target: "challenge", label: "之后每次登录" },
            { source: "challenge", target: "sign", label: "挑战下发给本机" },
            { source: "sign", target: "verify", label: "只回传签名结果", dashed: true },
          ],
        }}
      />
      <Paragraph>
        服务器出题、私钥签答案、公钥对答案——
        <strong>网络上只传输签名结果，私钥从不离开你的机器</strong>
        。窃听者拿到完整流量也无法重放（挑战串每次随机），服务端数据库泄露也只泄出公钥（只能验签不能签
        名）。这就是它碾压密码认证的根本原因。
      </Paragraph>

      <Heading level={3} title="生成与部署" />
      <Paragraph>
        现代推荐 Ed25519 算法（密钥更短、签名更快、安全性更高），RSA 只在对接古董系统时才需要。两条
        命令完成部署：
      </Paragraph>

      <ShellBlock>{`# ① 生成密钥对（-C 只是备注，写邮箱便于识别）
ssh-keygen -t ed25519 -C "you@laptop"
# ~/.ssh/id_ed25519      私钥：绝不离开本机，权限必须 600
# ~/.ssh/id_ed25519.pub  公钥：随便给谁

# ② 把公钥装到服务器（本质是把公钥追加进服务器的 authorized_keys）
ssh-copy-id user@host`}</ShellBlock>
      <MemoryCard keyword="私钥不出门，公钥随便贴" color="#8b5cf6">
        <p>
          密钥对认证的全部安全模型一句话：公钥是锁、私钥是钥匙——锁可以公开挂在网上，钥匙只在你机器里。
          判断文件：「.pub」结尾的是公钥可外传；不带后缀的是私钥，泄露 =
          身份被盗，立刻在所有装过它公钥的机器上删除对应行。权限是硬约束：<code>~/.ssh</code> 要
          700，私钥和 authorized_keys 要 600，权限不对 SSH 会直接拒绝工作。
        </p>
      </MemoryCard>

      <Heading level={2} title="「登录一次一直在线」的真相：活连接" />
      <Paragraph>
        一个常见误解：「SSH 登录一次后服务器记住了我，之后访问不用再验证——类似 Cookie」。恰恰相反。
        SSH <strong>没有</strong>任何「记住你」的机制，它不需要，因为——
      </Paragraph>
      <Paragraph>
        <strong>你的登录状态就是那条活着的 TCP 连接本身。</strong>TCP 建立后是一个持续存在的双向管道
        ，直到任一方主动关闭或网络中断。认证通过时，服务端把这条连接和你的会话绑定，之后所有加密数据都从
        这条管道流过——管道一直在，就永远不需要重新证明身份。和 HTTP 对比就清楚了：HTTP 每次请求都是
        独立连接、服务端不记得你，所以才要 Cookie；SSH 是一条连接从头用到尾。
      </Paragraph>
      <Paragraph>
        代价是：<strong>TCP 一断，会话即死</strong>，SSH 没有自动重连。网络切换、Wi-Fi
        抖动、合盖休眠都可能杀掉你的前台任务。两个标准缓解：
      </Paragraph>

      <CompareTable
        label="两种保活与恢复策略 / keepalive vs tmux"
        left={{
          title: "ServerAliveInterval：防连接假死",
          color: "#1677ff",
          points: [
            "客户端定期发心跳包，防 NAT/路由器超时回收映射",
            "很多「莫名断线」其实是 NAT 超时，不是网络故障",
            "同时快速感知死连接，不再傻等",
            "写在 ~/.ssh/config 全局生效",
          ],
        }}
        right={{
          title: "tmux：断线后环境还在",
          color: "#3fb950",
          points: [
            "任务跑在服务器的 tmux 会话里，不依赖 SSH 连接",
            "SSH 断了，任务照跑、vim 照开",
            "重连后 tmux attach 无缝接回原现场",
            "远程长任务的标配组合",
          ],
        }}
      />
      <ShellBlock>{`# ~/.ssh/config 全局保活：每 60 秒发心跳，3 次无响应才断
Host *
  ServerAliveInterval 60
  ServerAliveCountMax 3`}</ShellBlock>

      <Heading level={2} title="远程执行命令：不进 shell 也能干活" />
      <Paragraph>
        <code>ssh host</code> 拿交互式 shell；引号里带命令则是
        <strong>远程执行、输出发回、立刻退出</strong>——本机不会进入远程
        shell。这是脚本化运维的基石：
      </Paragraph>

      <ShellBlock>{`ssh myserver 'df -h'                  # 看服务器磁盘使用
ssh myserver 'uptime && free -h'      # && 串多条命令
ssh host 'dmesg' | grep error         # 输出回本机，可接管道
ssh host 'cmd' && echo 部署成功        # 远程退出码会传回来，可判断成败

# 要在远程用 sudo 时需 -t 强制分配伪终端（TTY）：
ssh -t host 'sudo systemctl restart nginx'

# 引号陷阱：双引号里 $HOME 被本机先展开，单引号才用远程的值
ssh host "echo $HOME"    # 打印你本机的 HOME
ssh host 'echo $HOME'    # 打印服务器上的 HOME`}</ShellBlock>
      <Paragraph>
        这条能力与登录共用同一条加密通道与认证体系——脚本里没有任何「第二次登录」，只是在那条连接上多开
        一个会话。传文件（scp/rsync）、把连接参数固化成别名（<code>~/.ssh/config</code>
        ）这些日常工具话题已拆成独立一篇，见文末延伸阅读。
      </Paragraph>

      <Heading level={2} title="边界与陷阱" />
      <DoDont
        label="高频翻车点 / pitfalls"
        dont={{
          code: `$ ssh myserver
Permissions 0644 for '~/.ssh/id_ed25519' are too open
# 或者：改了权限能连了，却不知道为什么之前不行
# 把 ~/.ssh 设成 777「图省事」`,
          note: "SSH 对权限有硬检查：~/.ssh 700、私钥与 authorized_keys 600。权限过宽 = 私钥可能被同机其他用户读取，sshd 直接拒绝工作，这是新手第一大坑。",
        }}
        do={{
          code: `chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 600 ~/.ssh/authorized_keys
# 服务器端还要注意：家目录不能 group/other 可写
chmod go-w ~`,
          note: "一次性设置好。sshd 连 authorized_keys 所在路径上每一级目录的权限都会检查——家目录可写也会导致公钥被拒。",
        }}
      />
      <DoDont
        label="远程命令的引号 / quoting"
        dont={{
          code: `$ HOSTNAME=web-01
$ ssh host "echo $HOSTNAME"
web-01    ← 以为是服务器的主机名，
            其实是本机变量被双引号展开后
            传过去的字符串`,
          note: "双引号里的 $变量 在本机 shell 就展开了，远程拿到的是展开结果——用远程变量必须单引号。",
        }}
        do={{
          code: `$ ssh host 'echo $HOSTNAME'
db-01      ← 单引号原样传递，
             $HOSTNAME 在远程 shell 展开
# 需要混用时：外单内双或转义
$ ssh host 'echo "user=$USER home=$HOME"'`,
          note: "规则一句话：想让「谁」展开变量，就别把引号交给另一方。本地要展开用双引号，远程才展开用单引号。",
        }}
      />
      <DoDont
        label="sudo 卡死的急救 / tty"
        dont={{
          code: `$ ssh host 'sudo systemctl restart nginx'
[sudo] password for ren:
（永久卡住，没有输入终端）
Ctrl+C 后怀疑是服务器坏了`,
          note: "无 TTY 时 sudo 无法提示输密码，命令看似挂起。新手常误判为「服务器无响应」。",
        }}
        do={{
          code: `$ ssh -t host 'sudo systemctl restart nginx'
[sudo] password for ren: █
# -t 强制分配伪终端，sudo 正常交互`,
          note: "远程需要交互式程序的命令（sudo、vim、top）都加 -t。需要确认现象时先问自己：这条命令有没有 TTY？",
        }}
      />

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "SSH 登录一次后为什么不用每次都重新输密码？是服务器像 Cookie 一样记住了我吗？",
            intent: "热身题，检验是否理解「登录状态」的本质——很多人拿 HTTP 的会话概念硬套 SSH。",
            a: "不是记住，而是连接没断。SSH 的登录状态就是那条活的 TCP 连接本身：认证通过后服务端把这条连接与你的会话绑定，后续加密数据都从这条管道流过，管道在就不需要重新认证。这和 HTTP 完全不同——HTTP 每次请求独立、服务端无状态，才需要 Cookie 之类的「记住你」机制；SSH 是一条连接从头用到尾，压根不需要记住任何东西。",
            bonus:
              "推论：TCP 一断会话即死且无自动重连。想断线后环境还在，用 tmux 把任务跑在服务器上，重连后 tmux attach 接回现场。",
            depth: 1,
          },
          {
            q: "首次连接服务器时 SSH 问「是否信任该主机」，这一步在防什么？点 yes 之后再连为什么不再问了？",
            intent: "考察 host key 机制与 TOFU 模型，判断是否理解 SSH 如何防中间人攻击。",
            a: "防中间人攻击（MITM）：你第一次连的「服务器」可能根本不是真服务器，而是劫持流量的攻击者。SSH 让服务器的 host key 对密钥交换过程签名，你首次确认的指纹会记进 ~/.ssh/known_hosts，此后每次连接都自动比对——一旦指纹突变（被劫持或服务器重装），SSH 直接报警拒绝连接，而不是默默继续。首次询问、之后信任的模式叫 TOFU（Trust On First Use）。",
            bonus:
              "安全性依赖你首次比对指纹的认真程度：管理严格的机房会带外公布 host key 指纹供人工核对；known_hosts 里以 |1| 开头的条目是哈希过的主机名，防泄露你连过哪些机器。彻底消掉这个首连提示的办法是 host 证书（见延伸阅读的 SSH 证书一篇）。",
            depth: 2,
          },
          {
            q: "密码认证的密码到底经不经过网络？既然加密了，为什么还推荐密钥认证？",
            intent:
              "递进题：检验是否真正理解「认证发生在加密通道之后」这个时序，能否把威胁精确到服务端泄露与 MITM，而不是笼统说「抓包偷密码」。",
            a: "经过网络，但不是明文：用户认证排在密钥交换与服务器认证之后，密码在协商好的对称加密通道内传输，被动抓包只能看到密文。推荐密钥认证是因为密码模型有三个结构性弱点：①服务端必须保管可验证密码的秘密，库泄露即身份被盗，而密钥模型下服务端只有公钥，泄露无害；②密码把「你是谁」绑定在通道终点上，host key 首连麻痹时中间人能在自己的加密通道里收走你的密码；③钓鱼登录页直接骗人交密码。密钥认证的签名挑战模型让网络里只出现「签名结果」，以上三条一起消解。",
            bonus:
              "挑个反例加深理解：密码认证并非一无是处——磁盘加密、开机登录仍是密码形态，因为那些场景没有「本机私钥」可用；SSH 的优势在于它有天然的客户端存储可放私钥。",
            depth: 3,
          },
          {
            q: "为什么 DH 密钥交换能在窃听者眼皮底下协商出秘密？以及有了它为什么还需要 host key？",
            intent:
              "递进题：上一问讲了防中间人，这一问考察能否区分「防窃听」和「防冒充」两个独立威胁，以及理解前向保密。",
            a: "DH 的数学魔力在于：双方公开交换一些数字后各自计算出相同的共享密钥，而窃听者虽然看到全部交换数据，面对离散对数难题无法算出这个密钥——这解决的是「防窃听」。但它防不了「冒充」：中间人可以对双方各演一场独立的 DH 交换（各自达成秘密），神不知鬼不觉。所以需要 host key 对交换过程签名，确认「和我交换的人确实是那台服务器」。两者合起来才完整：DH 管保密，host key 管身份。",
            bonus:
              "会话密钥每次连接临时生成且用后即弃，意味着即使服务器 host key 日后泄露，攻击者拿历史抓包也解不开过去任何一次会话——前向保密（PFS）。这也是老协议（如早期 TLS 静态 RSA 密钥交换）被淘汰的原因。",
            depth: 4,
          },
          {
            q: "既然密钥认证更强，为什么生产环境还要禁用 root 直接登录、禁用密码认证？",
            intent:
              "收束题：考察能否从「单次认证的强度」上升到「系统性的攻击面收敛」，这是运维安全的基本功。",
            a: "密钥认证的安全在于：网络上只传签名不传秘密（不可重放）、服务端只存公钥（库泄露不伤及用户）、私钥可以设 passphrase 且不经过任何中间环节。而生产环境禁 root 直登 + 禁密码，是把这层逻辑再往外推：root 是所有攻击者都内置的默认用户名，禁掉后攻击者要同时猜对「用户名+密码」才能爆破；密码认证一开，整个密钥体系的强度就被最弱的一个密码拉平——攻击面由木桶最短板决定。sshd_config 里 PasswordAuthentication no + PermitRootLogin no 是任何暴露公网的服务器的第一课。",
            bonus:
              "禁密码后配合 fail2ban 自动封爆破 IP；改默认 22 端口只能减少扫描噪音（脚本小子级），对定向攻击无效——真安全靠密钥 + 防火墙白名单，不靠藏端口。",
            depth: 5,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        本篇解决了「安全地登录一台机器」与「不进 shell 远程执行」。但真实工作里经常要访问的是
        <strong>机器后面的服务</strong>——内网数据库、只能服务器本机访问的管理后台，或者反过来把本地
        服务临时暴露出去：这是<strong>端口转发与隧道</strong>
        的故事；目标机器还要再跳一层时，跳板机的 信任模型是下一站。延伸阅读按学习顺序列在下面。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "scp 和 rsync 怎么选？",
            to: "/note/devtools/ssh/fundamentals/file-transfer",
            description: "传文件的工具谱系：共用 ssh 底座、增量同步的 delta 算法与选型场景。",
          },
          {
            title: "ssh -L 的两个端口号分别是谁的？",
            to: "/note/devtools/ssh/tunneling/port-forwarding",
            description: "本篇加密通道的进阶用法：把够不着的服务拉到本地端口。",
          },
          {
            title: "堡垒机为什么看得到加密流量？",
            to: "/note/devtools/ssh/security/bastion-audit",
            description: "组织级入口管控：会话终结代理与审计回放的机制。",
          },
        ]}
      />
    </NoteShell>
  );
}
