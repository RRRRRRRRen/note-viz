import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo/FlowChart";
import {
  Callout,
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
} from "@/components/viz";
import { ShellBlock } from "@/components/demo/ShellBlock";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        差在信任的组织方式：普通密钥是<strong>名单制</strong>——每台服务器的{" "}
        <code>authorized_keys</code> 存每个人的公钥，「发」和「收」都是几百台机器的工程；SSH 证书是
        <strong>签发制</strong>——证书 = 用户公钥 + 元数据（principal、有效期、序列号）+ CA 签名，
        服务器只配一行 <code>TrustedUserCAKeys</code> 存一把 CA
        公钥，登录时本地三查：验签、principal 对账号、时间窗。最关键的元数据是
        <strong>短有效期</strong>：撤销问题被「到期自动失效」消解—— 与短效 JWT、ACME 90
        天证书是同一个设计母题。注意精确边界：
        <strong>principal 限定的是能登录哪些账号</strong>
        ，「能连哪些机器」由签发侧的策略决定，不是证书字段。host 证书则让客户端用一把 CA
        公钥替代逐台指纹核对，消灭 TOFU 首连提示。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "SSH 是怎么保证远程登录安全的？",
            to: "/note/devtools/ssh/fundamentals/remote-access",
          },
        ]}
      >
        证书没有换掉公钥认证的签名挑战模型——它换的是「服务器的公钥名单怎么维护」。
      </Prerequisite>

      <Heading level={2} title="普通密钥的运维死结：发与收" />
      <Paragraph>
        传统密钥认证的机制本身很干净（签名挑战、私钥不出门），死结在<strong>运维面</strong>
        。「发」：新同事入职，要把他的公钥分发到他能用的每台服务器——几十台手工{" "}
        <code>ssh-copy-id</code>
        已经很痛，几百台必须上自动化；「收」：私钥泄露或员工离职，要把他的公钥
        <strong>从每台机器的 authorized_keys 里逐台撤除</strong>
        ，漏一台就是永久后门。这个「每个端点各存一份完整名单」的形态你在很多地方见过：每个数据库各养一套
        用户表、每个 Git 仓库各存一份协作者名单——名单制的通病是
        <strong>名单越多，一致性越贵，而安全恰恰取决于最旧的那份名单</strong>。
      </Paragraph>

      <Heading level={2} title="证书模型：从名单到签名" />
      <Paragraph>
        SSH 证书把名单问题变成签名问题：引入一个<strong>团队 CA</strong>
        （就是一对密钥），用户公钥不再直接贴到服务器，而是拿去找 CA 签一张「证书」——内容是用户公钥 +
        元数据（可用账号、有效期、序列号）+ CA
        签名。服务器不再认识「每一个用户」，只信任「签发者」：
        <code>sshd_config</code> 里一行 <code>TrustedUserCAKeys</code> 指向 CA
        公钥，此后名单的增删只发生在 CA 一个地方。
      </Paragraph>

      <ShellBlock>{`# ① 生成团队 CA（一次性的动作，私钥严格保管）
ssh-keygen -t ed25519 -f team_user_ca

# ② 给用户公钥签发证书：principal 限定 deploy 账号，有效期 8 小时
ssh-keygen -s team_user_ca -I "ren@laptop" -n deploy -V +8h ~/.ssh/id_ed25519.pub
# → 生成 ~/.ssh/id_ed25519-cert.pub，登录时与私钥一同被 ssh 自动使用

# ③ 服务器侧一次性配置：只信这个签发者
# /etc/ssh/sshd_config
TrustedUserCAKeys /etc/ssh/team_user_ca.pub`}</ShellBlock>
      <Paragraph>
        登录时服务器做三个<strong>本地</strong>检查，全程不查任何名单：签名是真 CA 的吗（验签）→
        证书允许的账号（principal）里有这个登录账号吗 → 现在还在有效期内吗。用户身份的
        核实被前移到了「CA 签发的那一刻」——CA 怎么知道你是你？接 SSO、走审批流，这正是堡垒机的核心
        业务：你通过堡垒机认证后，它签一张几小时有效的证书给你。
      </Paragraph>

      <FlowChart
        label="证书签发与验证 / ssh ca"
        height={340}
        data={{
          direction: "TB",
          nodes: [
            { id: "ca", label: "团队 CA（私钥签发，公钥给服务器）", color: "#f59e0b" },
            { id: "cert", label: "证书 = 用户公钥 + 元数据 + CA 签名", color: "#8b5cf6" },
            { id: "meta", label: "元数据：principal 账号 / 有效期 / 序列号", color: "#8b5cf6" },
            { id: "server", label: "服务器：只存一把 CA 公钥", color: "#1677ff" },
            { id: "verify", label: "登录时三查：验签 / principal / 时间窗", color: "#3fb950" },
          ],
          edges: [
            { source: "ca", target: "cert", label: "签名" },
            { source: "cert", target: "meta", label: "包含" },
            { source: "ca", target: "server", label: "一次性分发" },
            { source: "server", target: "verify", label: "本地验证，不查任何名单" },
          ],
        }}
      />

      <Heading level={3} title="principal 到底限定什么" />
      <Paragraph>
        这里要校准一个常见的说法——「principal 限定了这张证书能连哪些机器」。不精确。
        <strong>principal 限定的是账号（用户名）</strong>：<code>-n deploy</code>{" "}
        的意思是这张证书只能用于登录目标机上名为 deploy 的账号，root、admin 都不行。
        <strong>「能连哪些机器」不在证书字段里</strong>
        ——证书本身是跨所有服务器通用的，一台机器放不放行，取决于 它的 sshd 信不信任这个
        CA、以及签发侧愿不愿意给你签。所以机器粒度的控制是
        <strong>签发策略</strong>的事：签发系统按「你申请的是 prod-web 的访问」决定签不签、签多久，
        这正是堡垒机的授权逻辑所在。证书管「你是谁、能用哪个账号、到什么时候」，签发流程管「你该到哪去」。
      </Paragraph>

      <MemoryCard keyword="用短生命周期代替撤销机制" color="#3fb950">
        <p>
          传统公钥的难题是「泄露了怎么从几百台机器撤下来」；证书直接让这个问题不存在——有效期 8
          小时，最坏损失 8
          小时，员工离职什么都不用做，到期自动失效。堡垒机下发临时凭证、零信任的会话 Cookie、CI
          的部署凭证，全是这一个模式：身份系统核发 → 短期有效 → 到期自动作废。
        </p>
      </MemoryCard>

      <Heading level={2} title="短有效期代替撤销：为什么 SSH 没有 CRL" />
      <Paragraph>
        证书体系在 TLS 世界里配套了撤销基础设施（CRL / OCSP），SSH 生态为什么没有？因为做不划算：
        SSH 的部署形态是<strong>成百上千台互不隶属的服务器</strong>
        ，没有一个「所有 sshd
        都会来查询」的撤销服务，吊销列表（KRL）也只能在单机内生效，几百台机器同步
        一份实时名单，等于把名单制的死结原样请回来。SSH 证书的答案是绕开撤销：
        <strong>把有效期压短，让「撤销」退化为「等它过期」</strong>
        。这个设计母题你在其他协议里见过： OAuth 的 access token 短效 + refresh token 换发、ACME
        证书 90 天周期强制自动续签——
        <strong>分布式系统里，让坏状态自动消亡，往往好过维护一份精确的「坏人名单」</strong>。
      </Paragraph>
      <CompareTable
        label="名单制与签发制的运维对照 / keys vs certs"
        left={{ title: "普通密钥（名单制）", color: "#1677ff" }}
        right={{ title: "SSH 证书（签发制）", color: "#8b5cf6" }}
        rows={[
          { aspect: "服务器保存什么", left: "每个用户的公钥（名单）", right: "一把 CA 公钥" },
          { aspect: "新用户接入", left: "逐台分发公钥", right: "CA 签一次，全服务器生效" },
          {
            aspect: "密钥泄露 / 离职",
            left: "逐台删 authorized_keys 行",
            right: "不签发新证书即可",
          },
          { aspect: "账号权限", left: "公钥落在哪个账号名下", right: "证书 principal 字段" },
          { aspect: "撤销方式", left: "人工清理所有端点", right: "有效期自然过期" },
          {
            aspect: "信任建立成本",
            left: "低（一条公钥即可）",
            right: "高（需要 CA 运营与签发系统）",
          },
        ]}
      />

      <Heading level={2} title="host 证书：服务器也要身份证" />
      <Paragraph>
        证书机制同样可以反过来用在服务器身上。客户端那边的痛点：首次连接每台服务器都要人工核对指纹并
        <code>yes</code>（TOFU），指纹管理一塌糊涂的团队实际上是「永远无脑 yes」——中间人防护名存实亡
        。host 证书的解法：用一把 <strong>host CA</strong> 给每台服务器的 host key 签证书，客户端的{" "}
        <code>known_hosts</code> 里只放一行 <code>@cert-authority</code> 规则——此后连接该域下任何
        新机器，客户端自动验证「host key 是否有 CA 签名」，首连提示直接消失。
      </Paragraph>

      <ShellBlock>{`# 给服务器 host key 签发证书（-h 表示签的是 host 证书）
ssh-keygen -s team_host_ca -h -I "prod-web" \\
  -n prod-web.corp.com,10.0.1.20 -V +52w \\
  /etc/ssh/ssh_host_ed25519_key.pub

# 服务器 sshd_config 声明自己的证书
HostCertificate /etc/ssh/ssh_host_ed25519_key-cert.pub

# 客户端 known_hosts：一行替代全公司指纹名单
@cert-authority *.corp.com ssh-ed25519 AAAA...corp-host-ca`}</ShellBlock>

      <Heading level={2} title="边界与陷阱" />
      <DoDont
        label="过期锁死 / cert expiry"
        dont={{
          code: `$ ssh prod-web
ssh: Connection refused by cert:
   cert has expired
# 凌晨三点，证书过期、签发系统也在内网
# 没有任何备用登录方式`,
          note: "短有效期是双刃剑：签发链路一断（签发系统宕机、SSO 故障、网络分区），所有人同时被锁在门外。用证书前先设计「签发不可用时的应急路径」。",
        }}
        do={{
          code: `# 常态：签发系统自动续签，agent 只负责持有
$ ssh-add ~/.ssh/id_ed25519   # 私钥与 -cert.pub 一起进 agent
# 应急：break-glass 账号保留一把长期密钥，
#       物理隔离存放 + 每次使用告警
# 监控：对「即将过期仍无续签」提前告警`,
          note: "工程标配：自动续签让「过期」在正常情况下不可感知；break-glass 应急账号应对签发系统自身故障——应急钥匙也要有审计，只是走另一条通道。",
        }}
      />
      <DoDont
        label="CA 私钥的保护 / ca blast radius"
        dont={{
          code: `# CA 私钥和签发脚本放在同一台跳板机上
$ ls jump:~/ca/
team_user_ca        # ← 泄露即全灭
# 任何拿到它的人 = 可登录所有
# 信任该 CA 的服务器的任何人`,
          note: "CA 私钥的影响面是「全部服务器 × 全部账号」：单用户密钥泄露是一场事故，CA 泄露是整个信任域沦陷。保护等级必须按后者设计。",
        }}
        do={{
          code: `# ① CA 私钥离线/专用机保存，签发走 API 轮换
# ② 按环境拆分：dev-ca / prod-ca 互不相干
# ③ prod CA 签发需审批，签发动作全审计
# ④ KRL 记录已知失陷证书序列号（单机兜底）`,
          note: "限制爆炸半径：环境隔离让 dev CA 泄露不伤 prod；离线保存让攻击者拿不到「印钞机」。CA 体系的安全等于对 CA 私钥的保护水平。",
        }}
      />
      <DoDont
        label="principal 滥发 / least privilege"
        dont={{
          code: `# 图省事：不指定 principal、 validity 拉满一年
$ ssh-keygen -s team_user_ca -I "ren" \\
    -V +52w id_ed25519.pub
# 该证书可在任何信任此 CA 的机器上
# 登录任意账号，有效期一年`,
          note: "省略 -n 等于放弃账号限定，超长有效期等于回到「短有效期代替撤销」之前的世界——证书的两大安全增益同时归零。",
        }}
        do={{
          code: `# principal 最小化、有效期与用途对齐
$ ssh-keygen -s team_user_ca -I "ren@laptop" \\
    -n deploy -V +8h id_ed25519.pub
# 需要更宽权限 → 走签发系统的
# 审批，而不是放宽证书模板`,
          note: "签发模板是权限体系的边界：principal 按需最小、有效期按任务长度给。审批解决「例外」，模板守住「常态」。",
        }}
      />

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "用证书登录和用普通密钥登录，流程上到底差了哪一步？签名挑战模型变了吗？",
            intent: "热身题：确认理解「证书没有换掉公钥认证」，只是换掉了服务器侧的验证依据。",
            a: "签名挑战模型一模一样：服务器发随机挑战、本机私钥签名、服务器验签。变的只有验签依据——普通密钥模式下服务器拿你的公钥去 authorized_keys 里查名单；证书模式下服务器拿 CA 公钥验证书上的签名，再检查 principal 与有效期。用户侧多出的动作是「先去 CA 拿一张证书」，之后 ssh 自动把证书和私钥一起用上，日常无感。",
            bonus:
              "证书的文件名约定：私钥 id_ed25519 对应证书 id_ed25519-cert.pub，ssh 发现同名 -cert.pub 就自动携带——这就是为什么签发后无需改任何 ssh 配置。",
            depth: 1,
          },
          {
            q: "principal 字段限定的是什么？「这张证书只能连 prod-web」这种说法哪里不对？",
            intent:
              "精确性考题：很多资料把 principal 说成机器粒度的权限，检验你是否真的拆过证书字段与签发策略的分工。",
            a: "principal 限定的是账号：-n deploy 表示这张证书只能登录目标机上的 deploy 账号，与哪台机器无关。证书本身对「所有信任这个 CA 的服务器」通用——「只能连 prod-web」的控制发生在签发侧：签发系统按你申请的目标决定签不签、签什么 principal、签多久。也就是说，证书字段回答「你是谁、能用哪个账号、到何时」，而「你该到哪去」由签发策略（往往就是堡垒机的授权模块）控制。把机器粒度说成证书字段的能力，会直接导致错误的安全评估。",
            bonus:
              "一个精确的例外：签发时可以给 host 证书限定 -n 主机名/地址，那是 host 证书（验证服务器身份）的字段语义，与用户证书的 principal 别混。",
            depth: 2,
          },
          {
            q: "TLS 有 CRL/OCSP 撤销体系，SSH 证书为什么选择了「不做撤销、靠短有效期」？KRL 不是撤销机制吗？",
            intent:
              "递进题：考察能否从部署形态推导设计取舍——「为什么不做」比「做什么」更能检验对分布式系统的理解。",
            a: "SSH 的部署形态决定的：成百上千台互不隶属的 sshd，没有一个统一查询点，CRL 需要「所有端点都能及时取到最新名单」，这在 SSH 世界等于重建一个中心化基础设施，成本与名单制无异。KRL 确实存在，但它只能作用于单台机器（本机拒绝已列序列号的证书），几百台机器各自维护同步 KRL 的工程量让它在实践中几乎没人用。所以 SSH 证书的实际答案是：撤销问题用短有效期消解——8 小时后自动失效，应急场景配合签发侧「停止续签」即可。",
            bonus:
              "对照 TLS 的现实：OCSP 软失败（查询不通就放行）让撤销本来就不完全可靠，Let's Encrypt 干脆用「90 天短周期 + CT 日志」逼近同一个结论——殊途同归。",
            depth: 3,
          },
          {
            q: "为什么说短期凭证「消解」了密钥管理难题，而不是「更好地解决」了它？",
            intent: "考察对核心设计决策的理解深度：区分「优化撤销流程」与「让撤销问题不复存在」。",
            a: "长期凭证的安全模型里，撤销是一等公民难题：泄露、离职、换设备都要求「找到每一处部署点并撤除」，几百台机器规模下必然有遗漏，遗漏就是永久后门。短期凭证不优化撤销——它让撤销失去意义：有效期 8 小时，最坏损失 8 小时；离职什么都不用做，到期自然失效；凭证泄露的应急从「全面清查」降级为「等它过期」。代价是签发必须足够方便（自动化、无感），所以必须有身份系统与自动化签发基础设施配套——这也是证书体系落地成本的主要来源。",
            bonus:
              "这一思想在其他领域的对应物：OAuth access token 短效 + refresh token 换发、Kubernetes 的 ServiceAccount 令牌轮转、ACME 证书 90 天周期——「短生命周期代替撤销」是分布式安全的通用模式。",
            depth: 4,
          },
          {
            q: "host 证书消灭了 TOFU 首连提示，这防住中间人了吗？大规模下你会怎么组织 CA 和堡垒机的关系？",
            intent:
              "压轴题：检验 host 证书与用户证书能否串成完整信任链，以及能否给出有主见的架构组织方式。",
            a: "防住了「首连」这一段：客户端不再依赖人工核对指纹，而是自动验证服务器 host key 有无 CA 签名——中间人拿不到 CA 签名，伪装在第一次连接就会被拒绝；TOFU 的「首次不设防」窗口被彻底关闭。组织方式上，现代访问体系通常是这样串的：host CA 管服务器身份（客户端零指纹名单），用户 CA 管人（服务器零 authorized_keys 名单），两个 CA 的私钥都在签发服务手里，而签发服务就是堡垒机的授权模块——用户过 SSO/MFA 认证后拿到短期用户证书，目标机的 sshd 只信任堡垒机 CA。信任链收敛到一点：服务器不认人、客户端不认机、双方都认 CA。",
            bonus:
              "推论：这套体系里堡垒机即使不代理流量（保持端到端），仅作为签发与审计中枢也成立——「签发型」与「终结型」是堡垒机的两种形态，前者保体验、后者保录像，选型取决于审计合规要求。",
            depth: 5,
          },
        ]}
      />

      <Callout kind="info" title="动手体感">
        一台 Linux 虚拟机就能手工体验完整链路：<code>ssh-keygen</code> 造 CA、<code>-s</code> 签一张
        10 分钟的用户证书，再把有效期改成 1 分钟观察「到期自动失效」——比读十遍文章更能建立
        「短有效期代替撤销」的直觉。
      </Callout>

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        证书把「服务器的名单」变成了「一个签发者」，堡垒机因此能代表组织签发身份。但这条路走到头仍是
        「守入口」的边界模型——把信任锚点从网络位置彻底换成身份与设备，让「内网」这个概念本身消失，
        是零信任要回答的问题。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "堡垒机为什么看得到加密流量？",
            to: "/note/devtools/ssh/security/bastion-audit",
            description: "签发服务的最大客户：会话终结与审计录像如何建立在证书信任之上。",
          },
          {
            title: "零信任网络到底「零」了什么？",
            to: "/note/devtools/ssh/security/zero-trust",
            description: "短期凭证思想推广到所有资源：默认拒绝、连接器只出不进、设备持续验证。",
          },
        ]}
      />
    </NoteShell>
  );
}
