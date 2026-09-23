import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart, ShellBlock } from "@/components/demo";
import {
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  SpecQuote,
  Table,
} from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        要让每次合入功能分支都留下合并记录，两条配置配合即可：<code>merge.ff false</code> 让任何
        merge 即使能快进也强制生成 merge commit；<code>pull.rebase merges</code> 让 pull 走
        rebase（永不产生 merge commit），且重放时保留本地未推送的合并结构。只设第一条会把日常 pull
        也变成合并，日志迅速被噪音淹没。最后必须认清边界：这两条都是客户端配置，
        <strong>不随仓库分发、无法约束协作者，快进合并也没有任何钩子可以拦截</strong>
        ——真正的强制点在服务端（平台合并设置或 pre-receive 钩子）。本地配置是约定，服务端才是法律。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "同一文件为什么有时冲突有时不冲突？",
            to: "/note/devtools/git/merge/three-way-merge",
          },
        ]}
      >
        快进的判定式（merge-base 是否恰好是其中一方）与 merge commit 的双 parent
        结构，都在合并篇建立；本篇是同一机制在工程策略层的应用。
      </Prerequisite>

      <Heading level={2} title="问题：静默消失的合并记录" />
      <Paragraph>
        功能分支开发完毕合回 main，过后翻 <code>git log --graph</code>{" "}
        却完全看不出「这里曾合入过一个功能」——历史是一条干净得可疑的直线。原因在合并篇讲过： main
        在分叉后没有自己的提交时，<code>git merge</code> 默认走{" "}
        <strong>fast-forward（快进）</strong>——一个新对象都不创建，只把 main 指针滑到 feature
        顶端，历史自然和「提交直接写在 main 上」毫无区别。
      </Paragraph>
      <Paragraph>
        快进本身不是缺陷：它高效、无冲突，且功能分支删除后历史依然成立。问题出在
        <strong>策略</strong>
        层面：合并记录是一种信息——「这批提交是一个整体、因为同一个目的、在某天被整体合入」。整体回滚一个功能时（
        <code>git revert -m 1</code>），有 merge commit
        一条命令搞定，没有就得自己找出那批提交的边界。如果团队决定这种信息值得保留，就需要一套配置把它变成默认行为。
      </Paragraph>

      <Heading level={2} title="第一层配置：merge.ff false" />
      <Paragraph>
        <code>merge.ff</code> 控制可快进场景下 merge 的行为，取值三档：
      </Paragraph>
      <Table
        label="merge.ff 取值表 / merge.ff values"
        head={["取值", "可快进时的行为", "对应命令行"]}
        rows={[
          ["未设置（默认）", "快进，不产生 merge commit", "git merge --ff"],
          [<code>false</code>, "强制创建 merge commit", "git merge --no-ff"],
          [<code>only</code>, "只允许快进，需要真合并时直接报错退出", "git merge --ff-only"],
        ]}
      />
      <Paragraph>
        设为 <code>false</code> 后，「无论什么情况都有 merge 记录」在本地达成——即使 main 就是
        feature 的直接祖先，也会造出一个双 parent 的合并节点。
        <SpecQuote source="git-config 官方文档（Documentation/config/merge.adoc）">
          Setting this to <code>false</code> forces the creation of a merge commit even when a
          fast-forward would be possible.
        </SpecQuote>
        用途最窄的 <code>only</code> 反而有独到的工程价值：CI
        或发布脚本里用它保证「我合进去的内容全部来自快进」，任何分叉都会显式失败，把意外合并扼杀在门禁里。
      </Paragraph>

      <Heading level={2} title="反直觉点：同一条配置污染 pull" />
      <Paragraph>
        单设 <code>merge.ff false</code> 不出两天就会遇到新问题。pull 的本质是{" "}
        <strong>fetch + merge</strong>——第二步的 merge 同样受 <code>merge.ff</code>{" "}
        管辖。于是日常同步代码的场景（本地有一个提交、远端也有一个提交，正常分叉）会开始产出这样的记录：
      </Paragraph>

      <ShellBlock>{`# 实验：merge.ff=false 之下 pull 一个落后的远端（真实输出）
$ git config merge.ff false
$ git pull --no-rebase
Merge made by the 'ort' strategy.
 h.txt | 1 +
 1 file changed, 1 insertion(+)

$ git log --oneline --graph
*   2b15a55 Merge branch 'main' of /tmp/tmp.WWWkuKDNoI/origin
|\\
| * f657ab1 remote work        ← 别人的提交
* | e1ae04f local work         ← 自己的提交
|/
* f5a7901 base`}</ShellBlock>
      <Paragraph>
        这个 <code>Merge branch 'main' of ...</code>{" "}
        不对应任何功能、任何决策，只是「我拉了一下代码」这个动作的痕迹。团队里每个人每天 pull
        若干次，一周后日志里一半是这种噪音，真正有语义的功能合并反而被淹没——这正是「同一条配置，合并
        feature 时是想要的行为，pull 时变成污染源」的矛盾。另外注意优先级细节：pull 的合并行为由{" "}
        <code>pull.ff</code> 单独控制，
        <SpecQuote source="git-config 官方文档（Documentation/config/pull.adoc）">
          This setting takes precedence over <code>merge.ff</code> when performing a pull.
        </SpecQuote>
        所以想只改 pull 的快进策略，应该设 <code>pull.ff</code> 而不是动 <code>merge.ff</code>。
      </Paragraph>

      <Heading level={2} title="第二层配置：pull.rebase merges" />
      <Paragraph>
        解法是让 pull 整个改道 rebase——rebase 在任何情况下都不创建 merge commit，pull
        从此只做「同步」这一件事。<code>pull.rebase</code> 三个取值的差异是本篇最值得记牢的对比：
      </Paragraph>

      <CompareTable
        label="pull.rebase 三档对比 / pull.rebase"
        left={{
          title: "true：普通 rebase",
          color: PALETTE.blue,
          points: [
            "pull 永不产生 merge commit，历史线性",
            "本地未推送的 merge commit 被拍平成直线——合并记录被 pull 自己毁掉",
            "与「无论什么情况都保留记录」直接冲突",
          ],
        }}
        right={{
          title: "merges：保留合并结构的 rebase",
          color: PALETTE.green,
          points: [
            "同样不产生新的 merge commit",
            "重放时保留本地已有的合并拓扑（--rebase-merges）",
            "与 merge.ff false 完全配套：造出来的记录不会被 pull 拆掉",
          ],
        }}
      />
      <Paragraph>
        看起来 <code>true</code> 和 <code>merges</code> 只差「历史直不直」，真正的分歧在
        <strong>本地已有未推送的合并节点、远端又前进了一步</strong>
        这个场景——用同一个仓库构造两次对照实验（本地先用 <code>merge --no-ff</code>
        造出合并节点 M，随后 pull）：
      </Paragraph>

      <ShellBlock>{`# 实验 A：pull.rebase=true（真实输出）
$ git pull
Rebasing (1/1)Successfully rebased and updated refs/heads/main.
$ git log --oneline --graph
* ff2ad79 feature work      ← M 没了：feature 的提交被直接重放到远端之上
* 3e5fec2 remote more
* f657ab1 remote work
* f5a7901 base
$ git log --merges --oneline | wc -l
0                           ← 合并记录清零`}</ShellBlock>

      <ShellBlock>{`# 实验 B：pull.rebase=merges（真实输出）
$ git pull
Rebasing (1/6)Rebasing (2/6)Rebasing (3/6)Rebasing (4/6)Rebasing (5/6)Rebasing (6/6)Successfully rebased and updated refs/heads/main.
$ git log --oneline --graph
*   970eded Merge branch 'feature'   ← M 保留（但被重放为新哈希）
|\\
| * 331a6d9 feature work
|/
* ebd7a67 remote extra
* 3e5fec2 remote more
* f657ab1 remote work
* f5a7901 base
$ git log --merges --oneline | wc -l
1`}</ShellBlock>

      <FlowChart
        label="一个合并节点的两种命运 / fate of a merge"
        height={400}
        data={{
          direction: "TB",
          nodes: [
            {
              id: "local",
              label: "本地：base — feature — M（merge --no-ff 造出）",
              color: PALETTE.blue,
            },
            { id: "remote", label: "远端前进：base — … — remote more", color: PALETTE.orange },
            { id: "pull", label: "git pull 触发 rebase", color: PALETTE.gray },
            { id: "true", label: "true：M 被拍平，合并记录清零", color: PALETTE.red },
            { id: "merges", label: "merges：M 保留拓扑（重放为新哈希）", color: PALETTE.green },
          ],
          edges: [
            { source: "local", target: "pull" },
            { source: "remote", target: "pull", label: "分叉", dashed: true },
            { source: "pull", target: "true", label: "pull.rebase=true" },
            { source: "pull", target: "merges", label: "pull.rebase=merges" },
          ],
        }}
      />
      <Paragraph>
        实验 B 还暴露一个容易记错的细节：<code>merges</code> 保留的是
        <strong>拓扑结构</strong>，不是提交对象——合并节点 M 从 <code>0676050</code> 变成了新哈希{" "}
        <code>970eded</code>。rebase 的铁律是重放的提交必有新哈希（合并篇讲过：parent
        链一变哈希必变），<code>merges</code> 只是额外把「M 有两个 parent」这件事实也重放出来。
        「rebase 会抹掉合并」这句口诀精确的表述是：普通 rebase 抹掉合并的<strong>结构</strong>，任何
        rebase 都会改写合并的<strong>哈希</strong>。
      </Paragraph>

      <MemoryCard keyword="本地配置是约定，服务端才是法律" color={PALETTE.purple}>
        <p>
          merge.ff / pull.rebase 都写在 <code>.git/config</code>（或全局
          <code>~/.gitconfig</code>），git 从不跟踪、push 不携带、clone
          拿不到——它们只能约束执行配置的那台机器。git 刻意不提供「clone
          即自动生效」的项目级配置：拉一个仓库就能改写你的 hooks
          与合并行为，等于克隆恶意仓库即中招（ =
          数据库的外键约束建在服务端才真正拦得住，客户端校验只是友好提示）。要约束协作者，强制点必须移到服务端。
        </p>
      </MemoryCard>

      <Heading level={2} title="第三层：为什么钩子也拦不住快进" />
      <Paragraph>
        「配置是约定」之后，自然的念头是用 git hooks 强制。结论：
        <strong>技术上不可能</strong>
        。钩子几乎全部挂在「创建提交」这个动作上，而快进合并不创建任何对象、只移动指针——没有提交就没有钩子。
        <code>pre-merge-commit</code> 只在即将创建 merge commit 时运行。用 <code>exit 1</code>{" "}
        的最简钩子（<code>core.hooksPath</code> 指向）做对照实验：
      </Paragraph>

      <ShellBlock>{`# 同一个 reject-all 钩子下的两种合并（真实输出）
$ git merge feature
Updating 3c11e2f..bd1bc17
Fast-forward
 f.txt | 1 +
 1 file changed, 1 insertion(+)
exit=0                        ← 快进场景：钩子根本没运行

$ git merge feature2
[pre-merge-commit] hook fired: reject
Not committing merge; use 'git commit' to complete the merge.
exit=1                        ← 分叉场景：钩子生效，拦下了 merge commit`}</ShellBlock>

      <Paragraph>
        实验里能看到钩子能力的精确边界：<code>pre-merge-commit</code>{" "}
        只拦「要造合并节点的合并」——它天生只能做<em>反向</em>
        限制（禁止合并、校验 merge commit 的 message 格式），永远做不了「必须造合并节点」。寄望{" "}
        <code>pre-push</code> 事后把关同样不行：快进合入的 main 历史与「提交直接写在 main
        上」逐字节相同，分支名不写进 commit 元数据，事后无法区分哪个提交是快进混进来的。
        这也顺带回答了 husky 的适用范围：它只是 hooks 的分发器（随 npm install
        装好钩子目录），天花板仍是 hooks 本身——适合挂 lint-staged、commitlint
        这类质量闸门，不适合合并策略。
      </Paragraph>

      <Heading level={2} title="强制力层级与落地" />
      <Paragraph>于是整件事收敛成一张层级表——每一层的强制力、覆盖范围与绕过成本：</Paragraph>

      <Table
        label="强制力层级 / enforcement layers"
        head={["层级", "机制", "能否约束协作者", "绕过方式"]}
        rows={[
          ["客户端配置", "merge.ff / pull.rebase", "不能——不随仓库分发", "本来就是自愿的"],
          [
            "客户端钩子（husky）",
            "pre-merge-commit 等",
            "部分——需对方装依赖且不 --no-verify",
            "跳过 install；对快进无效",
          ],
          [
            "平台设置",
            "只留 Merge commits + 分支保护禁直推",
            "能——合入动作发生在服务端",
            "无法绕过（对走 PR 的代码）",
          ],
          ["服务端钩子", "pre-receive 校验推送内容", "能——不合规直接拒绝", "需要服务器权限"],
        ]}
      />
      <Paragraph>
        按场景对号入座：个人仓库（如本站）配 <code>--global</code>{" "}
        两条命令即完事，不存在「别人不遵守」；团队走 GitHub/GitLab PR，把仓库设置里 squash 与 rebase
        两个合并按钮关掉、只留 Merge commits 并给 main 开分支保护——PR
        的合并按钮即使可快进也会生成合并节点（天然 --no-ff），强制力 100%；自建 Git
        直推的工作流，则写 pre-receive 钩子拒绝「main 上不含 merge commit」的推送。
      </Paragraph>

      <DoDont
        label="配套配置 / config combo"
        dont={{
          code: `# 只设了第一条
$ git config --global merge.ff false
# 一周后的 git log --graph：
*   a1b2c3d Merge branch 'main' of github.com:org/repo
*   d4e5f6a Merge branch 'main' of github.com:org/repo
*   7b1f4e2 Merge branch 'feature/login'   ← 真正的功能合并被噪音淹没`,
          note: "单设 merge.ff false，pull 的同步动作全部变成无语义合并节点——合并记录的意义被自己的日常操作稀释。",
        }}
        do={{
          code: `# 两条配套，职责分离
$ git config --global merge.ff false        # 合并功能分支：必留记录
$ git config --global pull.rebase merges    # 拉代码：线性历史，不碰已有记录

# 验证（--show-origin 显示值来自哪个文件）
$ git config --show-origin --get merge.ff
file:/Users/ren/.gitconfig  false`,
          note: "合并与同步分工明确：日志里每个 merge commit 都对应一次真实的功能合入。注意空输出（退出码 1）是 git config 的「未设置」信号，不是出错。",
        }}
      />

      <DoDont
        label="feature 分支上同步主干 / syncing main into feature"
        dont={{
          code: `# merge.ff=false 之下，在 feature 上执行：
$ git merge main
Merge made by the 'ort' strategy.
# → feature 里多出 Merge branch 'main' 节点，
#   push 后这些节点永久进入主干历史`,
          note: "merge.ff=false 管所有方向：同步主干也会被强造合并节点。功能分支多次这样做，主干全是同步噪音。",
        }}
        do={{
          code: `# 功能分支同步主干用 rebase，保持自己的提交链干净
$ git rebase main
# 「merge.ff false 只该作用于功能分支合入主干的那一次」：
$ git checkout main && git merge feature   # 这一步才需要合并节点`,
          note: "方向决定策略：feature → main 用 merge 留记录，main → feature 用 rebase 保持干净。规则的目标是「功能合入有记录」，不是「所有 merge 都造节点」。",
        }}
      />

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "fast-forward 合并和 rebase 后的结果看起来一样，区别在哪？",
            intent:
              "热身题。两个操作的产物历史都是直线，能否区分「挪指针」与「复制提交」是后续一切讨论的地基。",
            a: "快进合并不创建任何对象，只移动分支指针——feature 的提交原封不动成为 main 的历史；rebase 把 feature 的提交逐个复制成新提交对象（哈希全变）再接到目标之上。最终 log 形状可以相同，但 rebase 改写了对象，快进没有。",
            bonus:
              "判断指纹：快进后原分支顶端哈希不变；rebase 后原提交仍躺在对象库里（reflog 可达），等 GC 回收。「reflog 能救回 rebase 前的提交」正源于此。",
            depth: 1,
          },
          {
            q: "为什么 pull.rebase 设 true 而不是 merges，会破坏掉你的合并记录？",
            intent:
              "本篇最反直觉的点。考察是否理解 rebase 重放的对象是「提交」而 merge commit 也是提交——以及 merges 改变了重放的什么。",
            a: "普通 rebase 把待重放范围里的提交线性化：merge commit 有两个 parent，不属于任何线性链，直接被丢弃（它的两个 parent 链各自重放）。pull.rebase merges（= --rebase-merges）在重放时重建合并的拓扑结构，合并节点以新哈希保留。所以 true 之下 pull 一次，本地未推送的合并记录就被 pull 自己抹掉了——恰好违反「无论什么情况都保留」的目标。",
            bonus:
              "merges 保留的是结构不是对象：重放出的合并节点哈希必然变化（parent 换了）。极端刁钻的推论：合并信息若写进了 merge commit 的 message，message 随对象一起保留；若只依赖哈希去引用那次合并，rebase 后引用全部失效。",
            depth: 3,
          },
          {
            q: "GitHub 上无法快进却仍想强推，--force 和 --force-with-lease 差在哪？",
            intent:
              "把「快进」概念延伸到推送语义，考察对远端安全边界的理解——这也是合并篇 non-fast-forward 考点的进阶面。",
            a: "--force 无条件改写远端指针，远端上你本地没有的新提交会被直接甩掉；--force-with-lease 在远端指针仍停在你上次 fetch 时的位置才允许改写，否则拒绝——它把「我没有覆盖任何我不知道的提交」变成服务端可验证的声明。",
            bonus:
              "协作分支上二者都不该出现；个人分支 rebase 后确需强推时用 --force-with-lease。注意它依赖本地的 remote-tracking 缓存新鲜度，fetch 过旧同样有盲区。",
            depth: 3,
          },
          {
            q: "为什么 git 不提供「clone 即生效」的项目级配置文件，npm 却可以？",
            intent:
              "设计思维题。考察能否从威胁模型出发解释两个生态的安全边界差异，而不是停留在「git 就是这样」。",
            a: "git 的配置控制面太大：hooks、core.fsmonitor、别名、合并行为，一旦允许仓库自带生效配置，clone 一个恶意仓库就等于交出执行权——git clone 本身不执行任何仓库代码，这条底线靠「配置文件不随仓库生效」维持。npm 的 package.json 控制面窄得多（依赖声明 + 脚本），且 install 阶段本来就要执行代码，攻击面已经由别的机制（审计、lockfile）看管。",
            bonus:
              "git 的对应妥协是 [include] / [includeIf]：仓库可以提交一个 .gitconfig 文件，但必须每个人手动在自己全局配置里加一行 include 指向它——「文件随仓库走，激活永远由用户显式完成」，安全的主动权留在 clone 一方。",
            depth: 4,
          },
          {
            q: "pre-receive 钩子怎么实现「main 上只接受合并提交」？",
            intent: "压轴题。把「服务端才是法律」落到实现，考察钩子的输入协议与遍历区间的选取。",
            a: "pre-receive 从 stdin 读入若干行 old-rev new-rev ref-name，对推往 refs/heads/main 的那段区间跑 git rev-list --merges old..new：输出为空说明这批新提交里没有任何 merge commit，exit 1 拒绝整次推送。它是服务端钩子， rejecting 发生在对象入库前，客户端无法绕过。",
            bonus:
              "生产化要点：rev-list 对巨大推送要用 --not --all 剪枝排除已有历史；还要放行人为的修复场景（如 revert 产生的单 parent 提交），规则通常是「拒绝非 merge 的直推」而非「只认 merge」——白名单要按团队工作流裁剪。",
            depth: 5,
          },
        ]}
      />

      <CrossRef
        notes={[
          {
            title: "origin/main 是远程上的分支吗？",
            to: "/note/devtools/git/remote/fetch-pull",
            description:
              "pull = fetch + merge 的协议细节与远程书签模型；pull.rebase 改造的正是这套同步流程的第二步。",
          },
          {
            title: "分支、HEAD 与 reflog 是什么关系？",
            to: "/note/devtools/git/refs/branch-head",
            description: "快进「只挪指针」的前提是分支即指针文件；rebase 后找回旧提交也靠 reflog。",
          },
        ]}
      />
    </NoteShell>
  );
}
