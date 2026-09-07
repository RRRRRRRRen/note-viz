import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo/FlowChart";
import { CompareTable, MemoryCard, Timeline } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        堡垒机 = <strong>门卫 + 摄像头</strong>：建连时查一次证件（认证 +
        授权，没权限的机器连接根本建不
        起来），会话中全程录像（旁路录制而非逐条拦截），事后可追溯。它的技术根基是会话终结代理——你的
        SSH 连接<strong>终止于堡垒机</strong>
        ，它解密、录制、再重新加密转发，所以两段独立加密。零信任则把信任
        锚点从「网络位置」换成「身份 + 设备 + 上下文」：<strong>永不信任，始终验证</strong>
        ，每次访问签发 几分钟到几小时有效的短期凭证（SSH 证书、JWT、会话
        Cookie），到期自动作废——「员工离职收钥匙」这个
        老大难问题被直接消解。三个核心场景（外网访问内网页面、内网连数据库、CI
        部署服务）都是同一个运行时模型：
        <strong>核实身份 → 签发短期凭证 → 代理层拦截验证 → 全程审计 → 凭证到期自灭</strong>。
      </Conclusion>

      <Heading level={2} title="从跳板机到堡垒机：加的是什么" />
      <Paragraph>
        上一篇自建的跳板机解决了「路由不通」，但它有两个企业环境无法容忍的缺口：
        <strong>不知道谁在什么时候连进了内网</strong>（没有审计），
        <strong>权限只能粗放管理</strong>
        （能登录跳板机 = 能借道连任何内网机器）。几百台服务器的公司里，这意味着：
        运维各自在电脑上存几十把私钥（电脑丢失 =
        灾难）；有人误删了生产数据查不出是谁；离职员工的公钥散 落在几百台机器的 authorized_keys
        里收不干净。
      </Paragraph>
      <Paragraph>
        堡垒机把问题收敛成<strong>一个入口 + 一个日志中心</strong>，核心能力概括为 4A：
      </Paragraph>

      <Timeline
        label="堡垒机 4A 模型 / 4A"
        steps={[
          { label: "Authentication", sub: "认证：只对堡垒机证明身份（+MFA）", color: "#1677ff" },
          { label: "Account", sub: "账号：服务器账号由堡垒机托管映射", color: "#8b5cf6" },
          { label: "Authorization", sub: "授权：谁能连哪台、用什么账号", color: "#f59e0b" },
          { label: "Audit", sub: "审计：全程录像，可回放追责", color: "#3fb950" },
        ]}
      />
      <Paragraph>
        这解释了为什么公司安全规范写「禁止直连生产服务器」——不是折腾你，而是出了事故时堡垒机日志是唯一
        能回答「谁干的、什么时候、敲了什么」的证据链。两种叫法的侧重也不同：
        <strong>跳板机是网络架构概念</strong>（解决路由不通），
        <strong>堡垒机是安全产品概念</strong>
        （跳板机 + 权限 + 审计）。
      </Paragraph>

      <CompareTable
        label="跳板机与堡垒机 / jump vs bastion"
        left={{
          title: "跳板机（自建）",
          color: "#1677ff",
          points: [
            "解决网络可达：借道进入内网",
            "ProxyJump 端到端加密，跳板机看不到内容",
            "无审计：连了什么、干了什么不可知",
            "权限粒度 = 能不能登录跳板机",
            "适合个人与小团队",
          ],
        }}
        right={{
          title: "堡垒机（产品化）",
          color: "#f59e0b",
          points: [
            "解决受控访问：先授权后连接",
            "会话终结代理，能完整录制会话内容",
            "全程审计：命令、屏幕逐帧回放",
            "权限到人/机器/账号/时段，可配审批流",
            "合规要求（等保、金融审计）的标配",
          ],
        }}
      />

      <Heading level={2} title="会话终结代理：堡垒机为什么能看到加密流量" />
      <Paragraph>
        上一篇留了个伏笔：ProxyJump
        是端到端加密，跳板机只看到字节流，那堡垒机的「全程录像」怎么实现？ 答案是它
        <strong>主动不当透明管道</strong>：你的 SSH 连接终止于堡垒机——它先用与你的这段加密解
        出流量，录制，再以自己的身份向目标机发起第二段加密连接。两段独立加密，堡垒机是字面意义的中间人。
      </Paragraph>

      <FlowChart
        label="会话终结代理 / session proxy"
        height={280}
        data={{
          direction: "LR",
          nodes: [
            { id: "user", label: "你的终端（加密①）", color: "#1677ff" },
            { id: "bastion", label: "堡垒机：解密① → 录制 → 加密②", color: "#f59e0b" },
            { id: "target", label: "目标服务器（加密②）", color: "#3fb950" },
          ],
          edges: [
            { source: "user", target: "bastion", label: "第一段：你 ↔ 堡垒机" },
            { source: "bastion", target: "target", label: "第二段：堡垒机 ↔ 目标机" },
          ],
        }}
      />
      <Paragraph>
        代价是信任关系的重构：堡垒机必须持有目标机的信任（托管密钥，或服务器只信任堡垒机的
        CA——下一节 讲证书时展开）。同时纠正一个常见误解：
        <strong>「确认安全」发生在建连那一刻，而不是逐条命令实 时审查</strong>
        。会话开始后默认是录像旁听，你敲 rm -rf 它不会拦——威慑力来自「一切被记录」，
        而不是「有人实时盯着」。部分产品支持命令黑名单实时阻断、敏感操作二次审批，那是附加策略，不是核
        心模型。产品形态上还有更彻底的 Web
        终端：你在浏览器里敲字，堡垒机进程直接在目标机上执行，你的 机器上根本没有 SSH 连接。
      </Paragraph>

      <Heading level={2} title="SSH 证书：会过期的工牌" />
      <Paragraph>
        传统密钥的运维死结在「发」和「收」两头：服务器要保管每个人的公钥（几百台机器 =
        几百份名单）， 私钥泄露或员工离职时要<strong>从几百台机器上逐台撤除</strong>。SSH
        证书把名单问题变成签名问题：
      </Paragraph>

      <FlowChart
        label="证书签发与验证 / ssh ca"
        height={340}
        data={{
          direction: "TB",
          nodes: [
            { id: "ca", label: "团队 CA（私钥签发，公钥给服务器）", color: "#f59e0b" },
            { id: "cert", label: "证书 = 用户公钥 + 元数据 + CA 签名", color: "#8b5cf6" },
            { id: "meta", label: "元数据：可用账号 / 有效期 / 序列号", color: "#8b5cf6" },
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
      <Paragraph>
        服务器不再认识「每一个用户」，只信任「签发者」。用户身份的核实发生在 CA 签发的那一刻——CA
        怎么 知道你是你？接
        SSO、走审批流，这正是堡垒机的核心业务：你通过堡垒机认证后，它签一张几小时有效的
        证书给你。登录时服务器做三个本地检查：签名是真 CA 的吗 → 证书允许的账号（principal）里有这个
        账号吗 → 现在还在有效期内吗。全程不查任何名单。
      </Paragraph>

      <MemoryCard keyword="用短生命周期代替撤销机制" color="#3fb950">
        <p>
          传统公钥的难题是「泄露了怎么从几百台机器撤下来」；证书直接让这个问题不存在——有效期 8
          小时， 最坏损失 8
          小时，员工离职什么都不用做，到期自动失效。堡垒机下发临时密钥、零信任的会话 Cookie、CI
          的部署凭证，全是这一个模式：身份系统核发 → 短期有效 → 到期自动作废。
        </p>
      </MemoryCard>

      <Heading level={2} title="零信任：把信任锚点从位置换成身份" />
      <Paragraph>
        堡垒机仍是「边界模型」：内网是可信的，守住入口就行。这个假设在今天全面失效——人在家里（远程办
        公），资源在云端（服务器、SaaS），边界内也不可信（钓鱼攻陷一台内网机器后，攻击者靠「内网默认互
        信」横向移动，2010 年 Google 的 Aurora 攻击正是如此，它直接催生了零信任的著名实践
        BeyondCorp）。
      </Paragraph>
      <Paragraph>
        零信任的核心不是「更严格」，而是<strong>换锚点</strong>
        ：信任依据不再是你从哪个网络来（内网 IP =
        自己人），而是你是谁、你用什么设备、当前上下文是否正常。并且
        <strong>每次访问都验证，会话中 持续验证</strong>
        ——设备中途掉出合规状态（关了杀软）、行为异常（半夜批量下载），会话当场吊销。
      </Paragraph>

      <CompareTable
        label="三代访问模型 / vpn vs bastion vs zt"
        left={{
          title: "VPN → 堡垒机",
          color: "#1677ff",
          points: [
            "VPN：连上即全网可达，粒度最粗",
            "堡垒机：入口收敛 + 录像，进门查一次",
            "信任依据：网络位置 + 一次性认证",
            "凭证：长期账号 / 长期密钥",
            "攻击面：VPN 网关或堡垒机单点沦陷 = 沦陷",
          ],
        }}
        right={{
          title: "零信任",
          color: "#3fb950",
          points: [
            "粒度到单个应用/资源，无「进入网络」概念",
            "持续验证：身份 + 设备健康 + 行为上下文",
            "凭证：短期证书/令牌，自动过期",
            "未授权资源对你不可见（无端口可扫描）",
            "代价：每条路径接入策略、用户装 Agent",
          ],
        }}
      />
      <Paragraph>
        「资源不可见」值得展开：零信任里应用不暴露公网端口，访问全部经代理中转，攻击者没有可扫描的目标
        ——这叫软件定义边界（SDP）或「暗网络」。其运行时模型高度收敛，任何零信任产品都能拆进这个骨架：
      </Paragraph>

      <FlowChart
        label="零信任运行时模型 / zt runtime"
        height={330}
        data={{
          direction: "LR",
          nodes: [
            { id: "id", label: "身份系统：SSO + MFA", color: "#1677ff" },
            { id: "cred", label: "短期凭证：证书 / JWT / Cookie", color: "#8b5cf6" },
            { id: "pep", label: "执行点：代理验证（身份+设备+策略）", color: "#f59e0b" },
            { id: "res", label: "资源：应用 / DB / 服务器", color: "#3fb950" },
          ],
          edges: [
            { source: "id", target: "cred", label: "核身通过 → 签发" },
            { source: "cred", target: "pep", label: "携带凭证访问" },
            { source: "pep", target: "res", label: "放行后转发", dashed: true },
            { source: "pep", target: "id", label: "会话中持续重估", dashed: true },
          ],
        }}
      />
      <MemoryCard keyword="发卡很勤，但每张卡都有归属、范围、期限" color="#1677ff">
        <p>
          传统模式发的是永久钥匙（密码/私钥），零信任发的是限时门禁卡。短期凭证是整个体系的支点：它把
          「凭证泄露」从灾难降级为小时级事故，把「离职收权限」从运维工程变成自然过期。你之前学的 SSH
          密钥（证明你是谁）、SSH 证书（短期凭证）、堡垒机（收敛入口），都是这条路上的里程碑——零信任
          只是把这套逻辑推广到了所有资源。
        </p>
      </MemoryCard>

      <Heading level={2} title="三个真实场景的端到端流程" />
      <Paragraph>
        设定：公司已建成零信任体系——统一登录用飞书/企微 SSO（带手机验证码），内网有 Grafana
        监控页、MySQL、一批部署服务器；内网部署了<strong>连接器</strong>
        （connector：只向外主动连云端 、不监听任何入站端口的进程），资源全部注册进零信任管理后台。
      </Paragraph>

      <Heading level={3} title="场景一：在家访问内网的 Grafana 页面" />
      <Paragraph>
        日常操作：浏览器输入 <code>grafana.corp.com</code> → 跳飞书登录 → 手机确认 → 页面出来，约 20
        秒。底层的九步：
      </Paragraph>

      <Timeline
        label="外网访问内网页面 / web access"
        steps={[
          { label: "请求云端代理", sub: "域名解析到代理而非源站", color: "#1677ff" },
          { label: "302 → SSO", sub: "无会话则跳飞书登录", color: "#1677ff" },
          { label: "MFA 验证", sub: "账号密码 + 手机确认", color: "#1677ff" },
          { label: "设备检查", sub: "Agent 上报健康状态", color: "#8b5cf6" },
          { label: "策略判定", sub: "身份✓ 研发组✓ 设备✓", color: "#f59e0b" },
          { label: "发会话 Cookie", sub: "一小时有效", color: "#f59e0b" },
          { label: "隧道进内网", sub: "经连接器到 10.0.1.10", color: "#3fb950" },
          { label: "页面返回", sub: "Grafana 无感知", color: "#3fb950" },
        ]}
      />
      <Paragraph>
        两个设计精髓：其一，<strong>连接器只出不进</strong>
        ——它主动向外维持与云端的加密长连接，外部
        请求顺着已建立的连接「倒流」进内网，所以内网不需要开任何入站防火墙规则，源站零暴露（暗网络）
        ；其二，<strong>认证从应用里被抽走了</strong>——Grafana 收到的只是一个普通 HTTP
        请求，它完全不知道零信任的存在（高级玩法是代理注入 <code>X-User-Email</code> 身份头，连
        Grafana 自己的账号体系都省了）。一小时后 Cookie 过期要重新过 SSO——持续验证的最小体现。
      </Paragraph>

      <Heading level={3} title="场景二：连内网数据库查数据" />
      <Paragraph>
        日常操作：后台点「申请数据库访问」→ 审批通过（或按策略自动放行）→ 用平时的 MySQL 客户端照常
        连 <code>mysql.corp.com:3306</code> → 30 分钟后自动断。底层流程：
      </Paragraph>

      <Timeline
        label="内网数据库访问 / db access"
        steps={[
          { label: "申请访问", sub: "身份✓ 设备✓ 策略✓", color: "#1677ff" },
          { label: "签发证书", sub: "30 分钟，绑定身份+指定库", color: "#8b5cf6" },
          { label: "代理验证", sub: "验签 / 有效期 / 策略", color: "#f59e0b" },
          { label: "SQL 往返", sub: "全量审计，高危语句可实时阻断", color: "#3fb950" },
          { label: "证书过期", sub: "再访问需重新申请", color: "#f85149" },
        ]}
      />
      <Paragraph>
        与传统模式的关键差异在<strong>数据库里没有你的账号</strong>：传统做法 DBA
        要给每个人建账号发密码；零信任模式有两种替代——简单版是代理持有一个服务账号，你的证书只是「进
        门的票」；动态账号版是每次会话开始时代理临时 <code>CREATE USER</code> 授权、结束{" "}
        <code>DROP</code>——你离开后数据库里查无此人。所有 SQL
        经代理全量记录，删表类高危语句可在代理层实时拦截——这正是堡垒机「命令级管控」真正的用武之地。
        （补充：服务与数据库之间的调用是同一思想的变体——mTLS 双向证书，不靠「都在内网就裸连」。）
      </Paragraph>

      <Heading level={3} title="场景三：部署服务到内网服务器" />
      <Paragraph>
        常规部署走 CI/CD：合并代码 → 流水线跑测试、构建镜像 → 部署 → 企微通知，全程不碰服务器。安全
        机制藏在流水线内部：
        <strong>CI 里不存任何 SSH 私钥</strong>。流水线向零信任平台出示自己的 OIDC 令牌（「我是 main
        分支的流水线」），平台验证后签发一张 <strong>15 分钟有效</strong>的
        部署证书，且证书里写死了只能连 prod-web、只能用 deploy 账号——就算流水线日志泄露凭证，它也
        已经是一张废纸。全程留痕：谁触发、什么 commit、部署到哪些机器。
      </Paragraph>
      <Paragraph>
        人工救火走审批流：凌晨告警 → 后台发起临时访问申请（选机器、选 2 小时）→ 主管手机批准 →
        平台签发 2 小时 SSH 证书 → 直连上机排查 → 到期自动失效。连接经代理中转、全程会话录制；设备
        中途掉出合规状态（关了杀软），会话可被当场踢断——这就是「持续验证」的落地形态。
      </Paragraph>

      <Paragraph>
        三个场景合起来就是同一个模式的实例化：
        <strong>
          核实身份（SSO/审批）→ 签发短期凭证（限定身份+ 资源+时长）→ 代理层验证放行 → 全程审计 →
          凭证到期自灭
        </strong>
        。不同的产品只是在「身份在哪核实、发什么凭证、在哪拦截」这三个空里填了不同的答案。
      </Paragraph>

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "堡垒机会不会审查我敲的每一条命令、实时拦截危险操作？",
            intent: "热身题：纠正对堡垒机工作方式最常见的误解——它是门卫加摄像头，不是逐句审稿人。",
            a: "默认不会。「确认安全」发生在建连那一刻：认证你的身份、检查你有没有权限连这台机器——没权限的连接根本建立不起来。会话开始后默认是旁路录制（命令、输出、屏幕逐帧留痕），不拦截具体命令；你敲 rm -rf 它照样执行，威慑力来自「一切被记录、事后可追责」。部分产品提供命令黑名单实时阻断、敏感操作二次审批作为附加策略，但那不是核心模型。",
            bonus:
              "数据库网关是例外：SQL 经代理层逐句解析，高危语句（DROP TABLE、全表导出）可以实时阻断——因为那里天然存在一个「看得到每条语句」的中间人。",
            depth: 1,
          },
          {
            q: "ProxyJump 也是端到端加密，堡垒机却能看到会话内容——两者在技术上的本质差别是什么？",
            intent: "承接上一篇的伏笔，检验能否区分「TCP 转发」与「会话终结」两种中间人形态。",
            a: "本质差别：堡垒机主动终结了你的 SSH 连接。ProxyJump 是纯 TCP 层拼接，你的加密流量原样穿过；而堡垒机用它与你的第一段加密解出明文，录制后以自己的身份向目标机发起第二段加密——你的连接实际终止于堡垒机，两段独立加密。这是它必须持有目标机信任（托管密钥或服务器信任堡垒机 CA）的原因：没有信任，第二段连接建不起来，录像也无从谈起。",
            bonus:
              "信任链的枢纽是 CA：服务器 sshd 只配一行 TrustedUserCAKeys 指向堡垒机 CA 公钥，之后所有用户登录都靠堡垒机签发的证书——这就是「服务器侧零名单」的实现。",
            depth: 2,
          },
          {
            q: "为什么说短期凭证「消解」了密钥管理难题，而不是「更好地解决」了它？",
            intent:
              "考察对零信任核心设计决策的理解深度：区分「优化撤销流程」与「让撤销问题不复存在」。",
            a: "长期凭证的安全模型里，撤销是一等公民难题：泄露、离职、换设备都要求「找到每一处部署点并撤除」，几百台机器规模下必然有遗漏，遗漏就是永久后门。短期凭证不优化撤销——它让撤销失去意义：有效期 8 小时，最坏损失 8 小时；离职什么都不用做，到期自然失效；凭证泄露的应急从「全面清查」降级为「等它过期」。代价是签发必须足够方便（自动化、无感），所以必须有身份系统与自动化签发基础设施配套——这也是零信任落地成本的主要来源。",
            bonus:
              "这一思想在其他领域的对应物：OAuth access token 短效 + refresh token 换发、Kubernetes 的 ServiceAccount 令牌轮转、ACME 证书 90 天周期——「短生命周期代替撤销」是分布式安全的通用模式。",
            depth: 3,
          },
          {
            q: "零信任里「未授权资源对你不可见」，这在技术上是怎么做到的？和防火墙「拒绝访问」有何不同？",
            intent: "区分网络层拒绝与「不可达」的层次差异，考察对 SDP/暗网络的理解。",
            a: "两层机制叠加：其一，应用不监听任何公网端口——访问经代理中转，源站通过「只出不进」的连接器回流，扫描者连 TCP SYN 都得不到响应，不是「拒绝」而是「不存在」；其二，在设备组网型方案（如 Tailscale）里，ACL 规则实时下发到每台设备的出口处，发往未授权目标的数据包在离开本机前就被丢弃——是「你的设备拒绝放行」，而不是「对方拒绝你」。防火墙的拒绝仍会暴露「这里有个服务」的存在，零信任连存在性都不泄露。",
            bonus:
              "实际体验过最能建立直觉：把 Tailscale ACL 收紧后 ping 未授权机器，现象是超时而非 connection refused——包根本没出网卡。",
            depth: 4,
          },
          {
            q: "公司要在 VPN、自建跳板机、堡垒机、零信任之间做选择，你的决策框架是什么？",
            intent:
              "开放收束题：考察能否按规模、合规、成本三个维度给出有主见的选型建议，而不是「各有利弊」的和稀泥。",
            a: "按约束条件递进：个人或 5 人以下小团队，一台加固跳板机 + ssh config + 密钥认证足够，成本几乎为零；有合规要求（等保、客户审计）或 10 人以上多人运维，直接上堡垒机产品——开源 JumpServer 够中小团队，Teleport 更现代化（SSH 证书体系原生、支持数据库和 K8s）；远程办公为主、资源大量在 SaaS/云端，优先零信任方案——轻量起步用 Tailscale/Cloudflare Access 这类托管服务，不要自建。反过来⛔的信号：拿 VPN 当唯一手段（粒度太粗）、拿跳板机应付合规检查（无审计）、小团队强上零信任（运维成本反噬）。",
            bonus:
              "现实中的正确路径多是混合渐进：核心生产系统先进堡垒机（拿到审计能力），开发测试先 Tailscale（体验零信任），老系统留在 VPN——BeyondCorp 在 Google 也迁移了五六年，混合态不是失败而是常态。",
            depth: 5,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        SSH 三部曲至此收拢：篇一讲<strong>通道怎么建、身份怎么证明</strong>
        （密钥与握手），篇二讲
        <strong>到达不了的机器怎么借道</strong>（隧道与跳板），本篇讲
        <strong>入口怎么被组织管控</strong>
        （堡垒机）以及信任锚点的最终形态（零信任）。想继续动手，两个自然的下一站：用
        <code>ssh-keygen -s</code> 手工搭一套 SSH 证书体系体会短期凭证（一台 Linux 机器即可）；或用
        docker compose 部署 Teleport/JumpServer 体验审计界面。另一条相邻的线是 Git 远程协作里的 SSH
        应用，见站内「SSH 配置与多远程」。
      </Paragraph>
    </NoteShell>
  );
}
