import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo/FlowChart";
import { CompareTable, DoDont, MemoryCard } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        Git 远程传输走 HTTPS 或 SSH 两种协议，<strong>SSH 用密钥对认证</strong>
        ：私钥留在本机、公钥贴到平台，连接时靠「服务器出题、私钥签名」完成身份证明——全程不传输任何秘密，比密码安全且免输入。配置一次终身受益的四件事：生成
        Ed25519 密钥对 → 公钥上传平台 → <code>~/.ssh/config</code> 写好主机别名与端口 →{" "}
        <code>git remote set-url</code> 切换协议。fork 协作再加一条：origin
        指自己的仓库（有推送权），upstream 指源仓库（只读拉取），「同步上游」就变成一次 fetch +
        merge。
      </Conclusion>

      <Heading level={2} title="密钥对认证：不传秘密的身份证明" />
      <Paragraph>
        HTTPS 方式每次 push 都要身份证明（用户名 + token），SSH 方式把这件事一次性解决。核心是
        <strong>非对称密钥对</strong>：私钥（留在本机，谁都不给）+ 公钥（贴到 GitHub/GitLab
        的设置页，随便谁看）。认证时服务器用你的公钥出一道「签名挑战」，本机私钥签出答案，服务器用公钥验证——
        <strong>网络上只传输签名结果，私钥从不离开你的机器</strong>
        ，窃听者拿到全部流量也无法冒充你。
      </Paragraph>
      <Paragraph>
        这也是为什么私钥文件权限必须是 600：它是你数字身份的本体，不是配置文件。
      </Paragraph>

      <FlowChart
        label="SSH 认证握手 / ssh auth"
        height={340}
        data={{
          direction: "LR",
          nodes: [
            { id: "git", label: "git push", color: "#1677ff" },
            { id: "challenge", label: "服务器：随机挑战串 + 你的公钥", color: "#f59e0b" },
            { id: "sign", label: "本机 ssh-agent：私钥签名", color: "#8b5cf6" },
            { id: "verify", label: "服务器：公钥验签 → 放行", color: "#3fb950" },
          ],
          edges: [
            { source: "git", target: "challenge", label: "发起连接" },
            { source: "challenge", target: "sign", label: "挑战下发给本机" },
            { source: "sign", target: "verify", label: "回传签名（私钥不出门）", dashed: true },
          ],
        }}
      />
      <Heading level={3} title="生成与配置：一次做完" />
      <Paragraph>
        现代 SSH 推荐 <strong>Ed25519</strong> 算法（更短更快更安全），RSA 4096
        只在对接古董服务器时才需要。完整流程四步：
      </Paragraph>

      <ShellBlock>{`# ① 生成密钥对（-C 只是备注，写邮箱便于识别）
ssh-keygen -t ed25519 -C "your-email@example.com"
# 交互提示：保存路径默认 ~/.ssh/id_ed25519；passphrase 可设为口令保护私钥

# ② 复制公钥内容（注意是 .pub 文件，私钥永远不外传）
cat ~/.ssh/id_ed25519.pub
# 粘贴到 GitHub → Settings → SSH and GPG keys → New SSH key

# ③ 验证连通性（第一次会问是否信任主机指纹，yes）
ssh -T git@github.com
# Hi your-name! You've successfully authenticated...

# ④ 把远程地址从 HTTPS 切到 SSH（仅当 clone 时用的是 https://）
git remote set-url origin git@github.com:user/repo.git
git remote -v        # 确认两个 URL 都已变为 git@ 开头`}</ShellBlock>
      <Paragraph>
        第 ③ 步的输出 <code>Hi your-name!</code> 是最可靠的验证：认证层已通，Git
        层不可能再有身份问题。如果这步就失败，问题一定在 SSH 层（密钥、agent、config），与 Git
        无关——分层排查后面细说。
      </Paragraph>

      <Heading level={3} title="ssh-agent：passphrase 只输一次" />
      <Paragraph>
        给私钥设了 passphrase（口令），安全是真安全——每次 pull/pull 都要输一遍也是真烦。{" "}
        <strong>ssh-agent</strong>{" "}
        解这道题：它是后台进程，把解密后的私钥缓存在内存里，之后的签名请求直接用缓存，passphrase
        只在首次添加时输入一次。macOS 更进一步：<code>UseKeychain</code> 选项把 passphrase
        存进系统钥匙串，重启后也免输。
      </Paragraph>

      <ShellBlock>{`# 手动添加到 agent（macOS）
eval "$(ssh-agent -s)"          # 启动 agent（现代系统通常已在跑）
ssh-add --apple-use-keychain ~/.ssh/id_ed25519

# macOS 的持久化写法（~/.ssh/config）：
Host github.com
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519`}</ShellBlock>
      <MemoryCard keyword="私钥不出门，公钥随便贴" color="#8b5cf6">
        <p>
          密钥对认证的全部安全模型一句话：公钥是锁、私钥是钥匙——锁可以公开挂在网上，钥匙只在你机器里。判断文件：「.pub」结尾的是公钥可外传；不带后缀的是私钥，
          泄露 = 身份被盗，立刻在平台吊销并重新生成。
        </p>
      </MemoryCard>

      <Heading level={2} title="~/.ssh/config：多主机与防火墙" />
      <Paragraph>
        <code>~/.ssh/config</code> 是 SSH
        的「主机通讯录」：为每个平台声明地址、端口、用哪把钥匙。两个最常用的场景——
        <strong>多平台各用各的钥匙</strong>，和<strong>443 端口绕防火墙</strong>
        （公司/校园网常封 22 端口，GitHub 在 ssh.github.com:443 提供了备用入口）：
      </Paragraph>

      <ShellBlock>{`# ~/.ssh/config
Host github.com
  HostName ssh.github.com
  Port 443                        # 走 443 端口绕过防火墙对 22 的封锁
  User git
  IdentityFile ~/.ssh/id_ed25519

Host gitlab.com
  HostName gitlab.com
  User git
  IdentityFile ~/.ssh/id_ed25519  # 也可以给 GitLab 单独一把钥匙

# 多账号：同一个平台两个身份（公司号 + 个人号）
Host github-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_work     # 公司账号的钥匙
# 仓库 remote 写 git@github-work:company/repo.git 即走这套配置`}</ShellBlock>
      <Paragraph>
        多账号配置的关键理解：<code>Host</code> 是<strong>别名</strong>，git@
        后面写的名字会先查这本通讯录再解析——所以 <code>git@github-work:...</code>{" "}
        这种「不存在的域名」能正常工作。改完 config 验证： <code>ssh -T git@github.com</code>{" "}
        的输出不变就说明切换无感。
      </Paragraph>

      <CompareTable
        label="两种协议选型 / https vs ssh"
        left={{
          title: "HTTPS（token 认证）",
          color: "#1677ff",
          points: [
            "零配置开箱即用，clone 即可读",
            "推送需 Personal Access Token（密码已废弃）",
            "走 443 端口，几乎不会被防火墙拦",
            "CI / 临时机器 / 只读场景更方便",
            "凭据管理依赖 credential helper",
          ],
        }}
        right={{
          title: "SSH（密钥认证）",
          color: "#3fb950",
          points: [
            "一次配置，之后 push/pull 全免认证",
            "私钥本机持有，不经过网络传输",
            "多账号可用 config 精细分隔身份",
            "默认 22 端口可能被封锁（用 443 备用入口）",
            "日常开发机的主流选择",
          ],
        }}
      />
      <Paragraph>
        协议切换是纯本地操作，随时可逆：
        <code>git remote set-url origin git@github.com:user/repo.git</code> 切到 SSH，反向传
        https:// 地址切回 HTTPS。remote 只是 <code>.git/config</code> 里的一行 URL（远程协作篇讲过
        origin 的本质），换协议不产生任何对象迁移。
      </Paragraph>

      <Heading level={2} title="fork 协作：origin 与 upstream 双远程" />
      <Paragraph>
        给开源项目贡献代码的标准姿势：fork 一份到自己的账号下，clone 自己的 fork——此时 origin
        指向你的 fork（你有推送权）。但上游项目还在每天更新，需要另一条只读通道：{" "}
        <strong>upstream</strong> 指向源仓库。这就是 fork 协作的双远程模型：
      </Paragraph>

      <ShellBlock>{`# 一次性配置：给现有仓库添加 upstream
git remote add upstream https://github.com/original/repo.git
git remote -v
# origin    git@github.com:you/repo.git (fetch/push)   ← 你的 fork：读 + 写
# upstream  https://github.com/original/repo.git (fetch/push)  ← 源仓库：只用 fetch

# 日常同步上游（上游永远只 fetch，不 push）
git fetch upstream
git switch main
git merge upstream/main      # 或 git rebase upstream/main
git push origin main         # 把同步结果推回自己的 fork`}</ShellBlock>
      <FlowChart
        label="双远程拓扑 / fork remotes"
        height={330}
        data={{
          direction: "TB",
          nodes: [
            { id: "upstream", label: "upstream 源仓库（只 fetch）", color: "#f59e0b" },
            { id: "local", label: "本地仓库（fetch + merge 同步上游）", color: "#1677ff" },
            { id: "origin", label: "origin 你的 fork（fetch + push）", color: "#3fb950" },
            { id: "pr", label: "Pull Request：fork → 源仓库", color: "#8b5cf6" },
          ],
          edges: [
            { source: "upstream", target: "local", label: "fetch：拉取上游更新", dashed: true },
            { source: "local", target: "origin", label: "push：推到自己的 fork" },
            { source: "origin", target: "pr", label: "PR 申请合入上游" },
          ],
        }}
      />
      <Paragraph>
        一句话记住分工：
        <strong>origin 是你的地盘（读 + 写），upstream 是别人的地盘（只读）</strong>
        。所有写入动作（push）永远只指向 origin；对 upstream 唯一合法的操作是 fetch。误 push 到
        upstream 只会发生一种情况：你对源仓库也有推送权限（公司内部仓库常见）——这也是为什么开源 fork
        场景要刻意识别两个 remote。
      </Paragraph>

      <DoDont
        label="SSH 排查路径 / troubleshooting"
        dont={{
          code: `$ git push
git@github.com: Permission denied (publickey).
# 开始反复 ssh-keygen 重新生成、
# 重传公钥、重装 git……越搞越乱`,
          note: "盲目重造密钥是最常见的绕圈：先分层定位，多数情况是 agent 没加载或 config 匹配错。",
        }}
        do={{
          code: `$ ssh -T git@github.com       # 先分清 SSH 层还是 Git 层
$ ssh-add -l                 # agent 里有没有钥匙？
$ ssh -vT git@github.com 2>&1 | grep -i offering
                             # 到底尝试了哪把私钥？
$ git remote -v              # URL 是 git@ 还是 https://？`,
          note: "三层由下而上：agent 加载 → config 匹配 → remote 协议，每层一条命令定位。",
        }}
      />
      <Paragraph>
        排查链路展开：<code>Permission denied (publickey)</code> 90% 落在三处——agent 没加载钥匙（
        <code>ssh-add -l</code> 输出为空，重新 <code>ssh-add</code>）；config 的 Host 没匹配上（检查{" "}
        <code>HostName</code> 拼写与 <code>IdentityFile</code> 路径）；remote 还是 https 却以为在走
        SSH（<code>git remote -v</code> 一眼定案）。剩下 10%
        是公钥没上传或上传错账号——重传一遍即解。
      </Paragraph>

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "为什么 SSH 密钥比「用户名 + 密码」安全？私钥不还是一样可能被偷吗？",
            intent: "热身题，检验对非对称认证模型的真正理解，而不是背「密钥更安全」。",
            a: "三个维度都占优：其一，传输层——认证只回传「挑战串的签名」，窃听者拿不到任何可重放的凭据，而密码本身要在网络里过一遍（TLS 保护，但一旦失误即裸奔）；其二，存储层——平台侧只存公钥，数据库泄露不伤及用户，密码库泄露则全军覆没；其三，可吊销性——私钥疑似泄露，平台上删掉公钥即断联，密码泄露往往意味着别处也在用同一密码。私钥当然可能被偷，但 passphrase 加密 + agent 缓存 + 文件权限 600 把攻击面收窄到「物理接触本机」。",
            bonus:
              "硬件密钥（YubiKey）把私钥再收窄一层：私钥生成与签名全在硬件内完成，本机文件里只有句柄。",
            depth: 1,
          },
          {
            q: "ssh -T git@github.com 连接成功，但 git push 仍报 Permission denied，为什么？",
            intent: "分层排查题，检验能否区分「SSH 层认证」与「Git 层配置」两个独立环节。",
            a: "ssh -T 走的是你当前 shell 的环境，而 push 时 Git 实际使用的 remote URL 可能根本不是 git@github.com——先 git remote -v 确认协议：如果还是 https:// 开头，认证走的是 HTTPS/token，SSH 配好了也不参与。另一种常见情况：remote 写了别名（如 git@github-work:...），该 Host 在 config 里指向另一把钥匙，那把钥匙的公钥没传到对应账号。定位顺序永远是：remote -v 看 URL → ssh -T 那个确切的 Host 验认证 → ssh -vT 看实际加载了哪把 IdentityFile。",
            bonus:
              "GIT_SSH_COMMAND='ssh -v' git push 可以在 push 时直接打开 SSH 调试输出，不用单独跑 ssh 命令。",
            depth: 2,
          },
          {
            q: "公司网络封了 22 端口，git clone git@... 直接卡死，怎么办？",
            intent: "实战场景题，考察 443 备用入口这个经典解法是否知道。",
            a: "把 SSH 流量改走 443 端口：GitHub 在 ssh.github.com:443 提供完整的 SSH 服务，config 里给 github.com 配 HostName ssh.github.com + Port 443 即可，Git 命令一字不改。GitLab 同样提供 altssh.gitlab.com:443。验证：ssh -T -p 443 git@ssh.github.com 返回成功问候语即通。",
            bonus:
              "如果 443 上的 SSH 也被深度包检测拦截，退路是把协议切成 HTTPS（remote set-url），用 PAT + credential helper——可用的出网端口决定协议选型，而不是反过来。",
            depth: 2,
          },
          {
            q: "一台机器上公司账号和个人账号都要用 GitHub，SSH 怎么配才不打架？",
            intent: "多账号是 SSH config 最高频的进阶需求，检验 Host 别名机制是否吃透。",
            a: "config 的 Host 是别名而非真实域名：为两个账号各生成一对密钥，config 里写两个 Host 条目（如 github-work 与 github-personal），各自指向不同的 IdentityFile；clone 公司仓库时 remote 写 git@github-work:company/repo.git，个人仓库写 git@github-personal:you/repo.git——Git 按 remote 里的别名匹配 config，各自用各自的钥匙认证到同一个 github.com。已 clone 的仓库用 remote set-url 迁移到对应别名。",
            bonus:
              "全局 git config 的 user.name/user.email 也可以按目录覆盖（includeIf + gitdir 前缀），让提交作者信息和账号身份保持一致——身份认证（SSH）与提交署名（commit author）是两套独立系统，多账号场景两者都要理顺。",
            depth: 3,
          },
          {
            q: ".pub 结尾的文件是公钥可以随便发，那有人拿到我的私钥文件（没有 passphrase）会怎样？怎么补救？",
            intent: "安全压轴题，检验事故响应路径：密钥泄露的处置与密码泄露完全不同。",
            a: "拿到私钥 = 冒充你对该平台上所有仓库的读写（取决于该账号权限），且无需任何第二因素。补救动作有时序要求：①立即在平台（GitHub/GitLab）删除该公钥并生成新密钥对、上传新公钥——旧私钥立刻作废；②排查私钥可能泄露的途径（误提交进仓库、网盘、聊天记录发过）；③如果私钥曾被提交进任何仓库历史，按敏感信息泄露处理：filter-repo 清史 + 强推 + 所有协作者重克隆。预防永远便宜于补救：生成时设 passphrase，本机由 agent 缓存，兼顾安全与顺手。",
            bonus:
              "GitHub 的 Secret scanning 会扫描公开仓库中的 SSH 私钥模式并自动通知/吊销（对部分托管方）——但别依赖它兜底，自己的密钥自己盯。",
            depth: 4,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        传输层之上，远程协作的机制主线已在三篇收拢：<strong>fetch 与远程同步</strong>
        讲对象怎么传、书签怎么更新；本篇讲通道怎么建、身份怎么证明；遇到 push
        被拒（non-fast-forward）回到合并篇看拓扑判断。配好 SSH 之后值得顺手做的一件事：
        <code>git remote -v</code> 检查一遍现有仓库的协议，把日常开发机统一到 SSH，临时机器和 CI
        保留 HTTPS——两类场景用两类协议，各取所长。
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
