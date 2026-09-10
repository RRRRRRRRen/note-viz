import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo";
import {
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  Timeline,
} from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        「零」掉的是一件事：<strong>按网络位置发放的默认信任</strong>
        ——不再有「进了内网就是自己人」。零信任不是更严的防火墙，而是换锚点：信任依据从「你从哪个网络来
        」换成「你是谁（身份）、你用什么设备（posture）、当前上下文是否正常」，并且
        <strong>每次访问都验证、会话中持续验证</strong>。配套的三个技术支柱：
        <strong>默认拒绝</strong>——未授权资源对你不可见；<strong>连接器只出不进</strong>
        ——资源不监听公网端口（SDP/暗网络）；<strong>短期凭证</strong>——证书/JWT/OIDC
        到期自灭。运行时模型高度收敛：
        <strong>核实身份 → 签发短期凭证 → 代理层验证 → 全程审计 → 凭证到期自灭</strong>。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "堡垒机为什么看得到加密流量？",
            to: "/note/devtools/ssh/security/bastion-audit",
          },
          {
            title: "SSH 证书和普通密钥差在哪？",
            to: "/note/devtools/ssh/security/ssh-certificates",
          },
        ]}
      >
        零信任是这条演化线的终点形态：堡垒机的「受控入口」与证书的「短期凭证」都在这里被推广到全部资源。
      </Prerequisite>

      <Heading level={2} title="边界模型为什么失效" />
      <Paragraph>
        堡垒机再强，仍是「边界模型」：内网被假定为可信的，守住入口就行。这个假设在今天全面失效——人在
        家里（远程办公），资源在云端（服务器、SaaS），边界内部也不可信：钓鱼攻陷一台内网机器后，攻击者
        靠「内网默认互信」横向移动，2010 年 Google 遭遇的 Aurora
        攻击正是这个路径，它直接催生了零信任 最著名的工程实践——Google 的 BeyondCorp：员工不连
        VPN，凭身份与设备状态直接访问任何资源， 内网与外网在信任模型上不再有区别。
      </Paragraph>
      <Paragraph>
        换句话说，边界模型的根本缺陷是把<strong>「网络位置」当成了身份的代理</strong>
        ：内网 IP =
        自己人。而位置是可窃取的、粗粒度的、与业务无关的属性。零信任的核心不是「更严格」， 而是
        <strong>换锚点</strong>——把位置从信任依据里删掉，直接验证真正相关的属性。
      </Paragraph>

      <CompareTable
        label="三代访问模型 / vpn vs bastion vs zt"
        left={{
          title: "VPN → 堡垒机（边界模型）",
          color: PALETTE.blue,
          points: [
            "VPN：连上即全网可达，粒度最粗",
            "堡垒机：入口收敛 + 录像，进门查一次",
            "信任依据：网络位置 + 一次性认证",
            "凭证：长期账号 / 长期密钥",
            "攻击面：网关或堡垒机单点沦陷 = 沦陷",
          ],
        }}
        right={{
          title: "零信任",
          color: PALETTE.green,
          points: [
            "粒度到单个应用/资源，无「进入网络」概念",
            "持续验证：身份 + 设备健康 + 行为上下文",
            "凭证：短期证书/令牌，自动过期",
            "未授权资源对你不可见（无端口可扫描）",
            "代价：每条路径接入策略、用户装 Agent",
          ],
        }}
      />

      <Heading level={2} title="默认拒绝与暗网络：连接器只出不进" />
      <Paragraph>
        零信任架构里，资源端运行着<strong>连接器</strong>（connector）：一个只向外主动连云端
        、不监听任何入站端口的进程。外部请求到达云端的代理后，顺着连接器已建立的加密长连接「倒流」进内网
        。这个模式与 CDN/反向代理的<strong>回源链路</strong>同构——源站不暴露公网，由出站连接承载全部
        请求——区别只在回源的对象换成了身份平台。好处是结构性的：内网不需要开任何入站防火墙规则，源站
        零暴露，扫描者连 TCP SYN 都得不到响应。这就是「软件定义边界（SDP）」或「暗网络」的含义：
        <strong>资源不是被拒绝了，而是对你不存在</strong>。
      </Paragraph>

      <FlowChart
        label="零信任运行时模型 / zt runtime"
        height={330}
        data={{
          direction: "LR",
          nodes: [
            { id: "id", label: "身份系统：SSO + MFA", color: PALETTE.blue },
            { id: "cred", label: "短期凭证：证书 / JWT / Cookie", color: PALETTE.purple },
            { id: "pep", label: "执行点：代理验证（身份+设备+策略）", color: PALETTE.orange },
            { id: "res", label: "资源：应用 / DB / 服务器", color: PALETTE.green },
          ],
          edges: [
            { source: "id", target: "cred", label: "核身通过 → 签发" },
            { source: "cred", target: "pep", label: "携带凭证访问" },
            { source: "pep", target: "res", label: "放行后经连接器转发", dashed: true },
            { source: "pep", target: "id", label: "会话中持续重估", dashed: true },
          ],
        }}
      />
      <MemoryCard keyword="短期凭证是整个体系的支点" color={PALETTE.green}>
        <p>
          默认拒绝管「看不见」，代理验证管「进不来」，而<strong>短期凭证管「拿到了也没用」</strong>
          ：凭证限定身份、资源、时长，把「凭证泄露」从灾难降级为小时级事故，把「离职收权限」从运维工程
          变成自然过期。SSH 证书、CI 的 OIDC 换发、会话 Cookie，都是这一个模式。
        </p>
      </MemoryCard>

      <Heading level={2} title="设备 posture 与持续验证" />
      <Paragraph>
        身份只回答「你是谁」，零信任还要回答「你用的设备可信吗」。设备 posture 由安装在终端上的
        Agent 采集并上报：磁盘加密是否开启、系统补丁版本、终端杀软是否在运行、是否越狱/root——
        策略引擎把这些信号与身份一起评估，任一不达标就拒绝签发凭证。更关键的是
        <strong>持续验证</strong>
        ：会话中途设备掉出合规状态（关了杀软、系统被降级）、或行为上下文异常
        （半夜批量下载、异地并发登录），会话可被当场吊销——「进门查一次」升级成「全程在查」。
      </Paragraph>

      <Heading level={2} title="三个真实场景的端到端流程" />
      <Paragraph>
        设定：公司已建成零信任体系——统一登录用飞书/企微 SSO（带手机验证码），内网有 Grafana
        监控页、MySQL、一批部署服务器；内网部署了连接器，资源全部注册进零信任管理后台。
      </Paragraph>

      <Heading level={3} title="场景一：在家访问内网的 Grafana 页面" />
      <Paragraph>
        日常操作：浏览器输入 <code>grafana.corp.com</code> → 跳飞书登录 → 手机确认 → 页面出来，约 20
        秒。底层的八步：
      </Paragraph>

      <Timeline
        label="外网访问内网页面 / web access"
        steps={[
          { label: "请求云端代理", sub: "域名解析到代理而非源站", color: PALETTE.blue },
          { label: "302 → SSO", sub: "无会话则跳飞书登录", color: PALETTE.blue },
          { label: "MFA 验证", sub: "账号密码 + 手机确认", color: PALETTE.blue },
          { label: "设备检查", sub: "Agent 上报健康状态", color: PALETTE.purple },
          { label: "策略判定", sub: "身份✓ 研发组✓ 设备✓", color: PALETTE.orange },
          { label: "发会话 Cookie", sub: "一小时有效", color: PALETTE.orange },
          { label: "隧道进内网", sub: "经连接器到 10.0.1.10", color: PALETTE.green },
          { label: "页面返回", sub: "Grafana 无感知", color: PALETTE.green },
        ]}
      />
      <Paragraph>
        两个设计精髓：其一，<strong>连接器只出不进</strong>——内网零入站规则，源站零暴露；其二，
        <strong>认证从应用里被抽走了</strong>——Grafana 收到的只是一个普通 HTTP
        请求，它完全不知道零信任的存在（高级玩法是代理注入 <code>X-User-Email</code> 身份头，连
        Grafana 自己的账号体系都省了）。一小时后 Cookie 过期要重新过 SSO——持续验证的最小体现 。
      </Paragraph>

      <Heading level={3} title="场景二：连内网数据库查数据" />
      <Paragraph>
        日常操作：后台点「申请数据库访问」→ 审批通过（或按策略自动放行）→ 用平时的 MySQL 客户端照常
        连 <code>mysql.corp.com:3306</code> → 30 分钟后自动断。与传统模式的关键差异在
        <strong>数据库里没有你的账号</strong>
        ：简单版是代理持有一个服务账号，你的短期证书只是「进门的票
        」；动态账号版是每次会话开始时代理临时 <code>CREATE USER</code> 授权、结束 <code>DROP</code>
        ——你离开后数据库里查无此人。所有 SQL 经代理全量记录，删表类高危语句可在代理 层实时拦截（SQL
        有逐句结构，这是堡垒机一篇讲过的「结构化才有拦截」）。补充一个变体：服务与
        数据库之间的调用用同一思想的 mTLS 双向证书，不靠「都在内网就裸连」。
      </Paragraph>

      <Heading level={3} title="场景三：CI 部署服务到内网服务器" />
      <Paragraph>
        常规部署走流水线：合并代码 → 测试、构建镜像 → 部署 → 企微通知，全程不碰服务器。安全机制藏在
        流水线内部：<strong>CI 里不存任何 SSH 私钥</strong>。流水线向零信任平台出示自己的 OIDC
        令牌（「我是 main 分支的这次运行」——由 CI 平台向平台端点签发、含仓库与分支声明），平台验证
        OIDC 签名后签发一张 <strong>15 分钟有效</strong>的部署证书，且证书里写死了只能连 prod-web、
        只能用 deploy 账号——就算流水线日志泄露了凭证，它也已经是一张废纸。全程留痕：谁触发、什么
        commit、部署到哪些机器。人工救火走审批流：后台发起临时访问申请（选机器、选 2 小时）→
        主管手机批准 → 平台签发 2 小时 SSH 证书 → 直连上机排查 → 到期自动失效，连接全程会话录制。
      </Paragraph>

      <Heading level={2} title="源端执行：策略在发包处生效" />
      <Paragraph>
        零信任的执行点可以推到极致——放在<strong>发包设备本身</strong>。设备组网型方案（如
        Tailscale）把 ACL 规则实时下发到每台设备的出口处：发往未授权目标的数据包在离开本机前就被丢弃
        。体感上最有辨识度的差别：对未授权机器 <code>ping</code> 的现象是<strong>超时</strong>（请求
        根本没有发出、也没有任何响应）而不是 <code>connection refused</code>（对端明确拒绝）。前者是
        「你的设备拒绝放行」，后者是「对方拒绝你」——拒绝语义从对端移到了源端，攻击者连「这里有个服务
        被我惹恼了」的信息都拿不到。
      </Paragraph>

      <Heading level={2} title="边界与陷阱" />
      <DoDont
        label="把零信任当细粒度 VPN / auth once"
        dont={{
          code: `# 早八登录一次 SSO，之后一整天畅通无阻
08:00  SSO + MFA 登录
08:01  访问 Grafana / DB / 服务器 …
18:00  笔记本早已借给同事装软件
       —— 会话依然有效`,
          note: "「一次认证、长期有效」的零信任是 VPN 换皮：持续验证才是零信任的区分性特征。凭证时长、设备复检、行为基线至少要有其一，否则只是换了入口的边界模型。",
        }}
        do={{
          code: `# 会话短 + 中途重估
# Cookie 1h；DB 证书 30min；部署证书 15min
# Agent 持续上报 posture，掉合规即断会话
# 敏感资源访问触发二次 MFA`,
          note: "验证频率与资源敏感度对齐：普通页面小时级，生产数据分钟级。持续验证的成本靠「分级」控制，而不是一刀切地全勤 MFA。",
        }}
      />
      <DoDont
        label="身份到位、设备裸奔 / no posture"
        dont={{
          code: `# 只接了 SSO，没有设备 Agent
# 政策：有公司账号就能登录
# → 攻击者钓鱼拿到账号密码 +
#   在自己的设备上完成 MFA 疲劳轰炸
# → 以「合法身份」登进资源`,
          note: "身份不是唯一的信任锚：账号可被钓，设备难以伪造。缺了 posture 信号，零信任退化成「带 SSO 的 VPN」，凭证钓鱼的攻击面原样保留。",
        }}
        do={{
          code: `# 策略条件 = 身份 AND 设备
- account: dev@corp.com
  device_trust: managed + disk_encrypted + edr_on
  resource: prod-*
# BYOD 设备走受限门户（只给 Web 只读）`,
          note: "「身份 + 设备」双因子是零信任策略的最小完备形态：身份管归因，设备管入口质量。两者都有，钓鱼账号在不同设备上自然失效。",
        }}
      />
      <DoDont
        label="残留的内网互信 / implicit trust"
        dont={{
          code: `# 应用与 MySQL 之间：同内网，直接连
# db.listen = 0.0.0.0，账号 = app/共享密码
# 一台内网机器失守 → 拿着共享密码
# 横向直连数据库——Aurora 路径复现`,
          note: "零信任改造最常见的半途而废：人到资源收敛了，服务到服务还在裸连。内网互信不清理，横向移动的路径就还在。",
        }}
        do={{
          code: `# 服务间调用同样按零信任原则改造
# ① mTLS 双向证书替代「同内网即可信」
# ② 数据库账号按服务拆分、最小授权
# ③ 出入规则白名单：只允许 app-svc → db:3306`,
          note: "零信任的对象不止「人」：服务身份（mTLS/工作负载身份）是同一原则在机器世界的投影。评估零信任落地程度，先看服务间还有多少裸连。",
        }}
      />

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "零信任是一个产品、一套协议，还是一种架构思想？「零」字到底指什么？",
            intent: "热身题：先立准概念——把零信任说成某个产品的人，选型时一定会被营销话术带偏。",
            a: "是架构思想，产品只是思想的落地形态。「零」指的是对隐式信任归零：不因「你在内网」「你连过 VPN」「你是已知网段」就给任何默认信任——每一次访问都要基于显式策略验证身份、设备与上下文。判断一个方案是否真零信任，看三点：网络位置是否还在参与授权决策、验证是否持续、资源是否默认不可见。三条都不满足，就是换了名字的边界模型。",
            bonus:
              "渊源可提一句：理念出自 Forrester 2010 年提出的零信任模型，工程化标杆是 Google BeyondCorp（2011 年启动，系列白皮书公开），标准化的尝试有 NIST SP 800-207。",
            depth: 1,
          },
          {
            q: "「连接器只出不进」为什么更安全？外部请求又是怎么顺着一条出站连接「倒流」进内网的？",
            intent:
              "机制题：检验是否理解反向连接的复用原理——这是 SDP 与传统端口暴露在结构上的分野。",
            a: "更安全的根源是攻击面方向反转：连接器不监听任何入站端口，扫描器对内网出口摸不到任何 TCP 盲区，漏洞暴露面只剩「连接器主动发起的出站连接」这一条认证过的信道。倒流的原理：连接器启动时主动与云端代理建立加密长连接并维持（有心跳保活），这条连接对内网来说是出站、对外部用户来说就是一条现成的传输管道——代理把请求封装后沿这条已建立的连接写给连接器，连接器解封装后在本机网络里转发给真正的资源。方向是逻辑上的，载体就是那条出站长连接。",
            bonus:
              "同一母题你早已见过：SSH 的 -R 远程转发（客户端主动连服务器、服务器侧开监听回流）、frp/ngrok 的内网穿透，都是「出站连接承载入站请求」。",
            depth: 2,
          },
          {
            q: "零信任里「未授权资源对你不可见」，这在技术上是怎么做到的？和防火墙「拒绝访问」有何不同？",
            intent: "区分网络层拒绝与「不可达」的层次差异，考察对 SDP/暗网络的理解。",
            a: "两层机制叠加：其一，应用不监听任何公网端口——访问经代理与连接器中转，扫描者连 TCP SYN 都得不到响应，不是「拒绝」而是「不存在」；其二，在设备组网型方案（如 Tailscale）里，ACL 规则实时下发到每台设备的出口处，发往未授权目标的数据包在离开本机前就被丢弃——是「你的设备拒绝放行」，而不是「对方拒绝你」。防火墙的拒绝仍会暴露「这里有个服务」的存在，零信任连存在性都不泄露。",
            bonus:
              "实际体验过最能建立直觉：把 Tailscale ACL 收紧后 ping 未授权机器，现象是超时而非 connection refused——包根本没出网卡。",
            depth: 3,
          },
          {
            q: "CI/CD 里为什么坚持「不存 SSH 私钥」，用 OIDC 令牌换短期凭证？两者泄露的危害差在哪？",
            intent:
              "机制+风险对照题：考察能否说清 OIDC 换发链条，以及「长期凭证 vs 短期凭证」的危害模型差异。",
            a: "危害模型不同。存私钥的 CI：凭证长期有效、无法限定用途，日志或缓存一泄露，攻击者立刻获得对部署目标的完整访问，且要逐台机器清理——本质是把长期后门放进流水线。OIDC 模式：CI 先向平台出示平台可验证的身份令牌（含仓库、分支、运行 ID 声明，由 CI 平台的密钥签名），零信任平台验证签名后当场签发 15 分钟、限定目标与账号的部署证书——泄露的凭证要么已过期，要么用途被锁死。危害从「长期全量」压缩到「短期定点」，并且每次签发都有审计记录，可归因到具体流水线运行。",
            bonus:
              "这个模式的通用名是「工作负载身份 federation」：GitHub Actions/GitLab 的 OIDC 与各大云的 IAM 角色互信是同一机制，SSH 证书只是其中一种凭证形态。",
            depth: 4,
          },
          {
            q: "公司要在 VPN、自建跳板机、堡垒机、零信任之间做选择，你的决策框架是什么？",
            intent:
              "开放收束题：考察能否按规模、合规、成本三个维度给出有主见的选型建议，而不是「各有利弊」的和稀泥。",
            a: "按约束条件递进：个人或 5 人以下小团队，一台加固跳板机 + ssh config + 密钥认证足够，成本几乎为零；有合规要求（等保、客户审计）或 10 人以上多人运维，直接上堡垒机产品——开源 JumpServer 够中小团队，Teleport 更现代化（SSH 证书体系原生、支持数据库和 K8s）；远程办公为主、资源大量在 SaaS/云端，优先零信任方案——轻量起步用 Tailscale/Cloudflare Access 这类托管服务，不要自建。反过来的危险信号：拿 VPN 当唯一手段（粒度太粗）、拿跳板机应付合规检查（无审计）、小团队强上零信任（运维成本反噬）。",
            bonus:
              "现实中的正确路径多是混合渐进：核心生产系统先进堡垒机（拿到审计能力），开发测试先 Tailscale（体验零信任），老系统留在 VPN——BeyondCorp 在 Google 也迁移了五六年，混合态不是失败而是常态。",
            depth: 5,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        从 ssh/sshd
        的分工，到密钥认证、隧道转发、跳板与堡垒，再到把信任锚点彻底换成身份与设备的零信任 ，SSH
        这条线串起了「远程访问安全」的完整光谱。三条收束线：动手侧，用 <code>ssh-keygen -s</code>{" "}
        手搭一套证书签发体会短期凭证；架构侧，把三个安全篇的信任模型对照着 复述一遍（透传 vs 终结 vs
        换锚点）；应用侧，同一套 SSH 机制在 Git 远程仓库里的用法见延伸阅读。
      </Paragraph>
      <CrossRef
        notes={[
          {
            title: "SSH 证书和普通密钥差在哪？",
            to: "/note/devtools/ssh/security/ssh-certificates",
            description: "零信任凭证层的 SSH 实现：签发制与短有效期如何替掉名单制与长期密钥。",
          },
          {
            title: "堡垒机为什么看得到加密流量？",
            to: "/note/devtools/ssh/security/bastion-audit",
            description: "零信任之前的最后一个边界形态：会话终结、审计回放与 4A 模型。",
          },
        ]}
      />
    </NoteShell>
  );
}
