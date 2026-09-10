import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart, ShellBlock } from "@/components/demo";
import { CompareTable, CrossRef, DoDont, MemoryCard, Prerequisite } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        跳板机（jump host）解决的是<strong>路由不通</strong>：目标机器没有公网 IP，唯一两头都通的
        SSH 服务器就是跳板。现代写法 <code>ssh -J jump target</code>（OpenSSH 7.3+，等价于 config
        里的 <code>ProxyJump</code>，与旧写法 <code>ProxyCommand ssh -W %h:%p</code>{" "}
        同源）一条命令完成两段连接——它的本质是 <strong>TCP 层转发</strong>
        ：跳板机把两条 TCP 连接拼成管道，你的认证与数据
        <strong>端到端加密穿透</strong>，跳板机只见密文。这决定了它的信任模型：
        <strong>流量路过 ≠ 流量可见</strong>（技术对照：nginx stream/L4 透传，而非 TLS
        终结网关）。控制访问面靠三件事：专用受限账号、sshd_config 只留转发能力、
        <code>PermitOpen</code> 目标白名单。它的天花板是没有审计——谁连了哪台、干了什么
        不可知，这正是堡垒机的起点。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "ssh -L 的两个端口号分别是谁的？",
            to: "/note/devtools/ssh/tunneling/port-forwarding",
          },
        ]}
      >
        跳板机是端口转发的一种特例：把「转发目标」从某个服务换成「另一台机器的 22 端口」。
      </Prerequisite>

      <Heading level={2} title="为什么需要跳板机：路由不通" />
      <Paragraph>
        端口转发的前提是「你至少能 SSH 到一台服务器」。但公司内网机器（10.x.x.x）连 SSH 都路由不
        到——没有公网 IP，你的包根本出不了公网到达它。此时唯一办法是借一台
        <strong>两头都通</strong>的机器中转，它就是跳板机（jump host）：
        一块网卡在公网、一块网卡（或路由）通内网，对内网而言它是唯一入口。
      </Paragraph>

      <FlowChart
        label="跳板拓扑 / jump host"
        height={280}
        data={{
          direction: "LR",
          nodes: [
            { id: "laptop", label: "笔记本（家庭网络）", color: PALETTE.blue },
            { id: "jump", label: "跳板机（唯一有公网 IP）", color: PALETTE.orange },
            { id: "target", label: "目标机 10.0.0.5（内网）", color: PALETTE.green },
          ],
          edges: [
            { source: "laptop", target: "jump", label: "第一段：公网可达" },
            { source: "jump", target: "target", label: "第二段：内网可达" },
          ],
        }}
      />
      <Paragraph>
        注意跳板机与端口转发三种模式的关系：-L 转发的目标是「服务器侧的某个服务端口」，而跳板
        转发的目标是「另一台机器的 22 端口」——数据结构完全一样（direct-tcpip channel），变的只是
        目标。这也是为什么配好跳板之后，scp、rsync、git 对内网机器全都透明可用：它们都只是搭同一条
        ssh 通道的客户端。
      </Paragraph>

      <Heading level={2} title="两跳手动 vs 端到端穿透" />
      <Paragraph>
        传统方式是先登录跳板机、再从跳板机上 <code>ssh 10.0.0.5</code>
        。能用，但有两个深层问题：
        <strong>① 你的全部流量在跳板机上以明文形态流过</strong>
        （第二段连接由跳板机发起、由跳板机解密再加密，跳板机 root 可以看到你敲的一切）；② 体验割裂
        ——scp、rsync、git 都没法直接对目标机操作，每个工具都得手动中转两遍。
      </Paragraph>
      <Paragraph>
        现代方式 <code>ssh -J jump@jump.example.com deploy@10.0.0.5</code> 的本质是{" "}
        <strong>TCP 层转发</strong>：跳板机的 sshd 收到你的转发请求后，替你向 10.0.0.5:22 发起 TCP
        连接，然后把两条连接拼接成一条管道。你的认证和数据
        <strong>端到端加密穿透</strong>跳板机——两段 SSH
        认证各自独立完成，跳板机只看到不透明的加密字节流 。技术对照：
        <strong>这是 nginx stream 模块式的 L4 透传，不是 TLS 终结网关</strong>
        ——代理只搬运字节，不解包内容。
      </Paragraph>

      <ShellBlock>{`# 一条命令直达（跳板机、目标机的认证各自独立）
ssh -J jump@jump.example.com deploy@10.0.0.5

# 写进 ~/.ssh/config 后：ssh target 即达，scp/rsync/git 同样生效
Host jump
  HostName jump.example.com
  User jumpuser

Host target
  HostName 10.0.0.5
  User deploy
  ProxyJump jump          # 借道跳板机（OpenSSH 7.3+）

# 多级跳板逗号分隔：ssh -J jump1,jump2 target
# 旧写法同源：ProxyCommand ssh -W %h:%p jump`}</ShellBlock>
      <MemoryCard keyword="两种信任模型：流量路过 ≠ 流量可见" color={PALETTE.blue}>
        <p>
          两跳手动：跳板机是<strong>流量的终点和起点</strong>
          ，能看到一切（对审计产品是特性，对个人是隐患）。ProxyJump：跳板机只是
          <strong>管道的拼接点</strong>，只看到加密字节流。选哪种取决于
          你要「可控的中转」还是「透明的通路」——商业堡垒机选前者（为了录像审计），个人跳板选后者（为了
          体验与安全）。
        </p>
      </MemoryCard>
      <Paragraph>
        即使是端到端穿透，也要诚实地区分「内容」与「元数据」：跳板机看不到你敲的命令和传输的文件内容，
        但<strong>看得见连接元数据</strong>——你在什么时间连了哪台目标机、连接持续多久、流量多大。
        「只见密文」不等于「隐身」，这正是它仍有访问控制话题的原因。
      </Paragraph>

      <Heading level={2} title="控制访问面：跳板机的加固清单" />
      <Paragraph>
        没有预算上堡垒机产品时，一台加固过的跳板机足以覆盖小团队需求。核心思路：
        <strong>跳板机只做转发这一件事，其余能力全部关闭</strong>
        ——它是你内网的唯一入口，也是最贵的攻击目标，一旦沦陷等于整个内网沦陷。
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
PermitTTY no                   # 转发不需要终端
AllowUsers jumpuser            # 只留一个受限账号
Match User jumpuser
  PermitOpen 10.0.0.0/8:22 10.0.0.5:22   # 目标白名单`,
          note: "原则：关闭一切与「转发」无关的能力。PermitOpen 把可转发的目标收进白名单，配合 fail2ban 防爆破、防火墙只放行 SSH 端口、系统精简不跑业务。",
        }}
      />
      <DoDont
        label="私钥落盘跳板机 / keys on jump"
        dont={{
          code: `# 为了「二跳方便」把私钥拷上跳板机
$ scp ~/.ssh/id_ed25519 jump:~/.ssh/
$ ssh jump
jump$ ssh deploy@10.0.0.5
# 私钥躺在跳板机磁盘上`,
          note: "跳板机是暴露面最大的机器：私钥落盘 = 入口沦陷时密钥一起送出去，内网所有信任该密钥的机器同时失守。",
        }}
        do={{
          code: `# 私钥不出本机，用 ProxyJump 端到端穿透
Host target
  HostName 10.0.0.5
  ProxyJump jump
# 本机私钥对跳板、目标机两次认证
# 跳板全程只见加密字节流`,
          note: "ProxyJump 模式下认证端到端完成，私钥不需要出现在任何中间机器上。这是「方便」与「安全」难得的一致：更安全的方式恰好也是更省事的。",
        }}
      />
      <DoDont
        label="Agent 转发常开 / agent forwarding"
        dont={{
          code: `# 图省事全局开启 agent 转发
Host *
  ForwardAgent yes
$ ssh jump
jump$ echo $SSH_AUTH_SOCK
/tmp/ssh-XXXX/agent.1234
# 跳板机 root 可借用你的 agent 签名`,
          note: "Agent 转发把本机 ssh-agent 的签名能力接到跳板机：root 权限者能借你的密钥连任何信任它的机器，且不留你的痕迹——等于把私钥的「签名权」临时托管给了跳板机。",
        }}
        do={{
          code: `# 不开 agent 转发，用 ProxyJump 达成同样目标
Host target
  ProxyJump jump
# 确需 agent 转发时按主机精确开：
Host trusted-only
  ForwardAgent yes`,
          note: "ProxyJump 不需要 agent 转发——两段认证都由本机私钥完成。agent 转发只留给确有跳板侧拉取仓库等刚需的受信主机，且单独配置。",
        }}
      />

      <Heading level={2} title="天花板：跳板机管不了的两件事" />
      <Paragraph>
        清单之外还有两条认知：其一，<strong>跳板机是单点</strong>
        ——它挂了所有人都进不去内网，重要环境要么准备第二台，要么接受这个风险写进预案；其二，简易跳板
        机没有<strong>审计能力</strong>
        （谁在什么时候连了哪台机器、干了什么，只有元数据没有内容），权限粒度也只有「能不能登录跳板机
        」一级。把「借道」升级成「先授权、可回放、按人按机器按时段管控」，就是堡垒机的领域了。
      </Paragraph>

      <CompareTable
        label="跳板机的能力边界 / jump limits"
        left={{
          title: "跳板机能给的",
          color: PALETTE.blue,
          points: [
            "网络可达：内网机器的透明通路",
            "入口收敛：公网只暴露一台机器",
            "粗粒度控制：账号 / PermitOpen 白名单",
            "成本几乎为零：一台小机器 + sshd 配置",
          ],
        }}
        right={{
          title: "跳板机给不了的",
          color: PALETTE.orange,
          points: [
            "内容审计：看不到会话里敲了什么",
            "权限到人：无法按人/机器/时段细控",
            "审批流与临时授权",
            "事后追责的证据链（录像回放）",
          ],
        }}
      />

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "ssh -J 和端口转发 -L 是什么关系？-J 背后到底做了什么？",
            intent: "热身题：确认把跳板机放进「转发家族」的正确位置，而不是当成一个孤立功能。",
            a: "同族。-J 背后是 SSH 的 direct-tcpip channel：跳板机的 sshd 收到请求后替你向目标机 22 端口发起 TCP 连接，再把两条连接拼成管道——这与 -L 转发是同一机制，只是目标从「某个服务端口」换成「另一台机器的 SSH 端口」。-J 是 ProxyJump 配置指令的命令行快捷方式（OpenSSH 7.3 引入），而 ProxyJump 又与旧写法 ProxyCommand ssh -W %h:%p jump 同源，-W 就是「把 stdio 接到转发连接上」。",
            bonus:
              "推论：既然是转发家族的一员，scp/rsync/git 对配了 ProxyJump 别名的主机全部自动生效——不需要为每个工具单独配跳板。",
            depth: 1,
          },
          {
            q: "ssh -J jump target 连接要认证几次？两段的认证有什么关系？",
            intent: "检验是否真正理解「端到端」的含义——很多人以为跳板机替你认证了第二段。",
            a: "两次独立认证：先向跳板机认证（你 ↔ 跳板机建立加密连接），再通过跳板内的转发通道向目标机认证（你 ↔ 目标机，第二个 SSH 会话端到端跑在第一条连接的 channel 里）。两段的账号、密钥可以完全不同（跳板用 jumpuser、目标用 deploy），跳板机既不参与目标机的认证，也看不到你的凭据——它只搬运加密字节。",
            bonus:
              "实战推论：目标机 authorized_keys 里只需要你的公钥，不需要跳板机的任何公钥；反过来你想限制谁经过跳板，管住跳板机的 AllowUsers 即可。",
            depth: 2,
          },
          {
            q: "ProxyJump 和在跳板机上手动再 ssh 一次，对跳板机而言看到的流量有什么本质区别？为什么说这是「两种信任模型」？",
            intent: "区分「TCP 转发」与「会话终结」两个层次——这也是理解堡垒机审计原理的前置概念。",
            a: "两跳手动时，你的第二段连接由跳板机发起，明文在跳板机内存里组装——root 可以看到你的全部命令与数据，跳板机是流量的「终点和起点」。ProxyJump 是纯 TCP 层转发：跳板机只负责把两条 TCP 连接拼成管道，你的认证与数据端到端加密穿透，跳板机只见加密字节流。这是「可见的中转」与「透明的通路」两种信任模型：堡垒机产品为了审计录像必须选前者，个人跳板为了体验和安全选后者。",
            bonus:
              "技术对照：ProxyJump 相当于 nginx stream 模块的四层透传；两跳手动相当于七层代理（代理解包、处理、重新封装）。可见性与层次绑定，不是配置差异。",
            depth: 3,
          },
          {
            q: "「跳板机只见密文」是不是意味着跳板机上完全留不下我的任何痕迹？",
            intent:
              "考察对元数据与内容的区分——答出「密文之外还有元数据」才算真正理解透传模型的边界。",
            a: "不是。内容不可见（命令、文件、密钥），但元数据全部可见：sshd 日志记录着你在什么时间登录、请求向哪个目标地址哪个端口转发、连接持续多久、收发多少字节。对运维来说这些元数据足以回答「谁在什么时候经过跳板连了哪台机器」，只是回答不了「他上去干了什么」——补齐后一半就是堡垒机的会话录制。",
            bonus:
              "sshd 的 LogLevel VERBOSE 会把每次 direct-tcpip 转发的目标地址记进 auth.log——零成本的粗审计，小团队值得开着。",
            depth: 4,
          },
          {
            q: "企业里几十人共用一台跳板机，你会怎么把访问面收敛到「每个人只连他该连的机器」？收敛到头还缺什么？",
            intent:
              "开放收束题：考察能否把「一台机器的加固」上升到「组织的访问控制」，并识别出跳板机的能力天花板。",
            a: "分四层收敛：①账号层——每人独立账号进 AllowUsers，禁共享账号，出事可归因；②能力层——PermitTTY no、PermitOpen 目标白名单，转发目标收窄到业务网段的 22 端口；③网络层——跳板机自身的防火墙只放行 SSH 入站、对内网按目标分段放行；④审计层——VERBOSE 日志 + 登录告警，元数据全留痕。收敛到头，缺的仍是内容级审计（谁在目标机上敲了什么）与授权流程（临时开通、自动回收）——权限粒度只有「能/不能连」一级，这两件事是协议形态决定的，要跨过去就得把「透传」换成「会话终结」，也就是堡垒机。",
            bonus:
              "现实中的过渡形态：Teleport 这类开源方案用 SSH 证书 + 会话录制把跳板机直接升级成带审计的入口，不必一步跳到商业堡垒机。",
            depth: 5,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        跳板机把「够不着」变成「够得着」，但组织需要的是<strong>反过来</strong>
        ：每一次访问都受控、留痕、可追责。让机器的会话内容本身被录制回放，就是
        <strong>堡垒机</strong>
        的会话终结代理；再把「进门查一次」升级成「每次访问都验证身份与设备」， 就是
        <strong>零信任</strong>。沿这条线继续走：
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "堡垒机为什么看得到加密流量？",
            to: "/note/devtools/ssh/security/bastion-audit",
            description:
              "从透传到会话终结：堡垒机审计录像的机制前提，以及「经过 ≠ 可见」的最终答案。",
          },
          {
            title: "零信任网络到底「零」了什么？",
            to: "/note/devtools/ssh/security/zero-trust",
            description: "访问控制的终点形态：默认拒绝、连接器只出不进、身份与设备持续验证。",
          },
        ]}
      />
    </NoteShell>
  );
}
