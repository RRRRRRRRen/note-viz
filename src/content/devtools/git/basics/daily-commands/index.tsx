import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo/FlowChart";
import { CompareTable, DoDont, MemoryCard, Timeline } from "@/components/viz";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        日常命令的本质是<strong>三区之间搬运内容</strong>：工作区（你在编辑的文件）→
        index（下次提交的草稿， <code>git add</code> 写入）→ 对象库（历史快照，
        <code>git commit</code> 落库）。status 和 diff
        只是报告三区两两之间的差异，记住方向就不会懵。而「撤销」的一切答案只需先问一句：
        <strong>改动到哪个区了</strong>
        ——没 add 用 <code>restore</code>，add 了用 <code>restore --staged</code>，commit 了用{" "}
        <code>reset</code>（三档决定连带清理哪两区）或 <code>revert</code>（共享分支唯一安全解），已
        push 的提交永远优先 revert 而不是改写历史。
      </Conclusion>

      <Heading level={2} title="技术对照：一套三环境的发布流程" />
      <Paragraph>
        把 Git 的三个区想成<strong>一套三环境的发布流程</strong>：你的
        <strong>工作区</strong> = 本地开发环境（随便改，不影响任何人）；
        <strong>index 暂存区</strong> = staging 预发环境——你挑哪些改动进入下次发布（
        <code>git add</code>
        ），暂存区的内容就是「下次要上线的版本」；<code>git commit</code> = 预发内容正式
        <strong>发布到生产</strong>，进入那座内容寻址的对象库。
      </Paragraph>
      <Paragraph>
        有了三环境，所有日常命令都能翻译成发布动作：<code>add</code> = 本地 → 预发；
        <code>commit</code> = 预发 → 生产；<code>status</code> =
        报告本地和预发、预发和生产之间有什么差异；<code>diff</code> =
        打印两个环境之间的差异清单。撤销体系也一样：
        <strong>撤销 = 从指定环境把内容回滚覆盖上游</strong>
        ，唯一要搞清楚的是「从哪回滚、盖到哪」。
      </Paragraph>

      <Heading level={2} title="三区模型：一切日常命令的坐标系" />
      <FlowChart
        label="三区流转 / three areas"
        height={330}
        data={{
          direction: "LR",
          nodes: [
            { id: "work", label: "工作区 Working Directory（你的桌子）", color: "#f59e0b" },
            { id: "index", label: "index 暂存区（下次提交的草稿）", color: "#8b5cf6" },
            { id: "repo", label: "对象库 HEAD（生产）", color: "#3fb950" },
            { id: "remote", label: "远程仓库（异地分馆）", color: "#1677ff" },
          ],
          edges: [
            { source: "work", target: "index", label: "git add" },
            { source: "index", target: "repo", label: "git commit" },
            { source: "repo", target: "remote", label: "git push" },
            { source: "remote", target: "work", label: "git checkout / restore", dashed: true },
            { source: "repo", target: "work", label: "checkout 恢复文件", dashed: true },
          ],
        }}
      />
      <Paragraph>
        index 的正确定位不是「缓存」而是<strong>草稿</strong>：commit 提交的是 index 那棵 tree
        草稿，不是工作区现状——这是第一篇埋下的伏笔（未 add 的文件不进提交，不是 Git
        忘了，是提交语义如此）。它存在的价值是<strong>提交粒度的自由</strong>
        ：工作区可以同时改五个文件，只挑其中两个逻辑相关的先提交。
      </Paragraph>
      <Paragraph>
        补一个高频技巧：<code>git add -p</code>{" "}
        交互式挑改动块（hunk）——同一个文件里「要提交的修复」和「还没写完的实验」分开入库，靠的就是它。暂存区放什么，完全由你决定。
      </Paragraph>

      <Heading level={3} title="status 与 diff：方向决定输出" />
      <Paragraph>
        <code>git status -s</code> 的两列状态码就是三区视角：第一列对比 index vs
        HEAD，第二列对比工作区 vs index。真实实验——一个仓库同时存在三种状态的文件：
      </Paragraph>

      <ShellBlock>{`$ git status -s
 M app.ts           ← 第二列 M：工作区改了，还没 add
A  staged.txt       ← 第一列 A：已 add，草稿上有它
?? untracked.txt    ← 未追踪：三区里都没有它`}</ShellBlock>
      <Paragraph>
        <code>git diff</code>{" "}
        的三种形态同理，只是把「比哪两区」说得更明白——方向搞反是新手最大的困惑源：
      </Paragraph>

      <ShellBlock>{`$ git diff               # 工作区 vs index：app.ts 的改动（未 add）
diff --git a/app.ts b/app.ts
@@ -1,3 +1,3 @@
 line1
-line2
+line2 changed

$ git diff --staged      # index vs HEAD：staged.txt 的新增（已 add、未 commit）
diff --git a/staged.txt b/staged.txt
new file mode 100644
@@ -0,0 +1 @@
+staged

$ git diff HEAD~1        # 当前 vs 上一个提交：两次改动合起来看`}</ShellBlock>
      <CompareTable
        label="diff 三形态 / diff flavors"
        left={{
          title: "git diff（工作区 vs index）",
          color: "#f59e0b",
          points: [
            "回答「我改了什么还没暂存」",
            "add 之后这一项会变空——不是改动丢了，是进了草稿",
            "恢复这层改动：git restore <文件>",
          ],
        }}
        right={{
          title: "git diff --staged（index vs HEAD）",
          color: "#8b5cf6",
          points: [
            "回答「下次 commit 会提交什么」",
            "commit 之前用它做最后检查，防手滑",
            "撤下草稿：git restore --staged <文件>",
          ],
        }}
      />
      <MemoryCard keyword="先看方向，再谈撤销" color="#1677ff">
        <p>
          status 两列状态码 = index vs HEAD、工作区 vs index；diff 不带参数比工作区 vs index，带
          --staged 比 index vs HEAD。所有撤销工具的选择，都从「改动现在躺在哪个区」开始。
        </p>
      </MemoryCard>

      <Heading level={2} title="撤销决策树：按「改动到哪了」选工具" />
      <Paragraph>
        「撤销」不是一条命令，是四个场景四把钥匙。先定位改动位置，再查表——这张表建议存进肌肉记忆：
      </Paragraph>

      <DecisionTable
        rows={[
          {
            scene: "改了文件，还没 add",
            tool: "git restore <文件>",
            effect: "用 index 版本覆盖工作区，改动丢弃（不可恢复！）",
          },
          {
            scene: "add 错了 / 想撤下草稿",
            tool: "git restore --staged <文件>",
            effect: "改动退回工作区，内容一点不丢",
          },
          {
            scene: "commit 了，还没 push",
            tool: "git reset --soft/mixed/hard",
            effect: "移动分支指针，三档决定连撤哪两区（见下）",
          },
          {
            scene: "已经 push 到共享分支",
            tool: "git revert <commit>",
            effect: "新增一个反向提交抵消目标，不改写历史，安全",
          },
          {
            scene: "想改最后一次提交本身",
            tool: "git commit --amend",
            effect: "替换成新提交（哈希变），未 push 时随意，已 push 慎用",
          },
          {
            scene: "临时插入任务，改动没处放",
            tool: "git stash",
            effect: "工作区+index 打包存进栈，瞬间恢复干净",
          },
        ]}
      />
      <Heading level={3} title="reset 三档：动指针之外，还清理哪两区" />
      <Paragraph>
        reset 的核心动作只有一个：<strong>把当前分支指针改写到目标提交</strong>
        （引用系统篇讲过，这正是它危险的原因）。三档的区别只在于「指针挪走之后，index
        和工作区跟不跟着对齐」。真实实验，三个提交连续撤销的对比：
      </Paragraph>

      <ShellBlock>{`# 从 c3 开始，连续执行三档 reset，观察各区状态

$ git reset --soft HEAD~1    # 只动指针
$ git status -s
              M  f.txt                     ← 改动留在 index（已进预发），随时可重新 commit
$ git log --oneline | head -1
165672b c2

$ git reset --mixed HEAD~1   # 指针 + index（默认档）
Unstaged changes after reset:
M   f.txt                    ← 改动退回工作区，需要重新 add
$ git status -s
 M f.txt

$ git reset --hard HEAD~1    # 指针 + index + 工作区，全部对齐目标
HEAD is now at d9e4cc8 c1
$ git status -s              ← 三个区全干净
$ cat f.txt
a                            ← 工作区内容也回滚了，未提交改动彻底消失`}</ShellBlock>
      <Timeline
        label="reset 三档的清理范围 / reset modes"
        steps={[
          { label: "--soft", sub: "只动分支指针，index 与工作区原样", color: "#3fb950" },
          { label: "--mixed", sub: "指针 + 重置 index（默认）", color: "#1677ff" },
          { label: "--hard", sub: "指针 + index + 工作区全对齐", color: "#f85149" },
        ]}
      />
      <Paragraph>
        选档口诀：<strong>想重新组织提交用 soft</strong>（改动回到暂存区，换个方式再 commit）；
        <strong>想撤提交但保留改动继续写用 mixed</strong>；<strong>hard 是格式化硬盘</strong>
        ——按下之前确认工作区没有值得留的东西。忘性大也没关系：哪怕
        --hard，被撤的提交对象本体仍在对象库，reflog 90 天内可救（引用系统篇的完整生命周期）。
      </Paragraph>

      <Heading level={3} title="revert vs reset：安全撤与改历史" />
      <Paragraph>
        同样是「撤销一个提交」，revert 和 reset 走的路完全相反：
        <strong>reset 把历史往回拨</strong>（目标提交从分支链上消失）；
        <strong>revert 在历史前面追加一个「反着做」的新提交</strong>
        （目标提交还在，但它的效果被抵消）。前者历史干净但形状变了，后者历史变长但谁都没被背叛。
      </Paragraph>

      <CompareTable
        label="两种撤销哲学 / revert vs reset"
        left={{
          title: "revert：追加抵消（安全）",
          color: "#3fb950",
          points: [
            "生成新提交，内容 = 目标提交的反向 diff",
            "不改写任何已有提交，无分叉风险",
            "已 push / 共享分支的唯一推荐",
            "撤销合并时需要 -m 指定保留哪条主线",
          ],
        }}
        right={{
          title: "reset：回拨指针（强力）",
          color: "#f59e0b",
          points: [
            "分支直接改指到目标提交",
            "目标之后的提交脱离分支链（reflog 可救）",
            "仅限未 push 的本地提交",
            "配合三档决定工作区/index 怎么清理",
          ],
        }}
      />
      <DoDont
        label="共享分支撤销 / shared undo"
        dont={{
          code: `$ git push                          # 被拒：远端有同事的提交
$ git reset --hard HEAD~1           # 把同事的提交一起“撤”掉
$ git push --force                  # 强推覆盖远端
# → 同事的提交悬空，团队抓狂`,
          note: "reset + force push 是组合灾难：你甩掉的远不止自己的提交。",
        }}
        do={{
          code: `$ git revert <问题提交哈希>          # 追加反向提交
$ git push                          # 正常快进推送
# → 历史完整保留，问题提交的效果被抵消`,
          note: "共享历史上只做加法（revert），不做减法（reset）——这是协作的铁律。",
        }}
      />
      <Heading level={3} title="stash：临时打包的双 parent 提交" />
      <Paragraph>
        正写着 feature，线上报 bug 要马上切 main——改动没到能提交的程度，stash 就是「塞进抽屉」：
        <code>git stash</code> 把工作区 + index 的现状打包存起来、三区瞬间恢复干净；忙完{" "}
        <code>git stash pop</code> 原样取回。它不是什么特殊存储，看内部结构就知道：
      </Paragraph>

      <ShellBlock>{`$ git stash push -m "wip: 实验"
$ git stash list
stash@{0}: On main: wip: 实验

$ git rev-parse stash | xargs git cat-file -p | head -4
tree   eef163c1dc5ff360bcfba47c69e3b76c3786ec9e
parent 07ac4b5fff44500c829b664cf60b25aa4d171c88    ← parent₁：你的 HEAD
parent 24262c8dceca1df873732c8a1167bde0a1bebfda    ← parent₂：index 状态
author renguoqiang <...>

# → stash 本质是一个有两个 parent 的普通 commit，挂在 stash 引用上
# → 所以它同样受对象库管理、同样能 cat-file、同样会被 GC 按可达性处理`}</ShellBlock>
      <Paragraph>
        这个「本质是 commit」的认知直接给出三条使用纪律：
        <strong>untracked 文件默认不入栈</strong>（要带上的话 <code>git stash -u</code>）；
        <strong>stash 不是保险箱</strong>——塞进抽屉的任务长期不管会淡忘，栈也会被{" "}
        <code>git stash clear</code> 清空，抽屉应该短期周转而不是长期仓储；
        <strong>pop 有冲突时会拒绝丢弃条目</strong>，冲突解决后手动 <code>git stash drop</code>{" "}
        即可。
      </Paragraph>

      <Heading level={2} title="工作流与提交规范：让历史为协作服务" />
      <Heading level={3} title="功能分支工作流：四步循环" />
      <Paragraph>
        有了前面的地基，团队协作的主流姿势「功能分支工作流」就是四步循环：
        <strong>开分支 → 小步提交 → 推送开 PR → 合并后清理</strong>
        。它的全部价值在隔离与评审：main 永远保持可用，每个功能在独立分支上演进，改动通过 PR
        评审后一次性进入主干。
      </Paragraph>

      <Timeline
        label="功能分支循环 / feature branch flow"
        steps={[
          {
            label: "开分支",
            sub: "git switch -c feature/x（基于最新 main）",
            color: "#1677ff",
          },
          { label: "小步提交", sub: "一个逻辑一个 commit，写清 type", color: "#1677ff" },
          { label: "推送开 PR", sub: "git push -u origin feature/x", color: "#f59e0b" },
          { label: "合并清理", sub: "合并后删本地与远程分支", color: "#3fb950" },
        ]}
      />
      <Paragraph>
        两个衔接点：第二步的「合并后清理」之所以敢删，是 branch -d
        的可达性检查在兜底（引用系统篇）；分支合并方式选 merge 还是 squash，决定 PR
        在历史上留下的是分叉气泡还是单点（合并篇的三种合并产出对比）。
      </Paragraph>

      <Heading level={3} title="提交规范：type 是给未来的自己看的路标" />
      <Paragraph>
        Conventional Commits 的一句话版本：<code>&lt;type&gt;: &lt;简短描述&gt;</code>
        ，type 声明「这次提交改动了什么性质的东西」。常用七个：feat（功能）、fix（修
        bug）、docs（文档）、refactor（重构，不改行为）、test、chore（构建与杂务）、perf（性能）。描述用祈使句、一行说清，细节留给
        body。
      </Paragraph>
      <Paragraph>
        它不是形式主义：<strong>type 让 git log 可扫描</strong>（
        <code>git log --oneline --grep="^fix"</code> 直接筛出所有修复）；规范的机器可读性是自动生成
        CHANGELOG 和语义化版本号的基础。本站自己的提交（
        <code>feat: xxx</code> / <code>fix: xxx</code>）就在用这套。
      </Paragraph>

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "git commit --amend 到底做了什么？已 push 的提交还能 amend 吗？",
            intent: "热身题，检验「amend = 替换而非修改」这个对象模型认知。",
            a: "amend 生成一个全新的 commit 对象替换当前分支顶端（parent 指向原提交的 parent），原提交被抛弃、只能靠 reflog 找回——所以「修改」是幻觉，实际是重建。技术上已 push 的提交也能 amend，但改写后的哈希与远端分叉，必须 force push 才能同步，等于单方面改写共享历史——共享分支上不要做；自己未推送的提交随便 amend。",
            bonus:
              "amend 前忘 add 文件是经典场景：先 git add 漏的文件、再 amend --no-edit，一次提交补全，不用 cancel 重提。",
            depth: 1,
          },
          {
            q: "git reset --hard 把不想删的改动删了，还能救吗？",
            intent: "高频事故题，检验 reflog 恢复路径是否形成条件反射。",
            a: "分两种：被 --hard 撤掉的是「已提交的内容」→ 能救，git reflog 找到 reset 之前的哈希、git branch rescue <哈希> 或直接 reset 回去（对象在 reflog 过期前一直存活）。被删的是「从未 add 过的工作区改动」→ 救不了，那部分内容从未进入对象库，没有任何对象承载它。这正是「commit 早、commit 小」的保险价值：进过对象库的东西几乎不丢。",
            bonus:
              "IDE 的 Local History、编辑器 undo 栈是未 add 内容的最后一线希望——但这属于编辑器的仁慈，不是 Git 的承诺。",
            depth: 2,
          },
          {
            q: "reset --soft、--mixed、--hard 各适合什么场景？为什么 --hard 最危险？",
            intent: "检验三档差异是否精确到「清理哪几区」，而不是背口诀。",
            a: "soft 只动分支指针，index 与工作区原样——适合「重新组织提交」：改动留在草稿上换个方式 commit；mixed（默认）指针 + 重置 index，改动退回工作区——适合「撤回提交继续写」；hard 三区全对齐目标——适合「彻底丢弃」，最危险因为它连工作区一起覆盖，未提交的改动直接消失。危险度的根源：hard 是唯一碰工作区的档位，而工作区内容可能从未入过对象库（无备份）。",
            bonus:
              "git reset 等价于 reset --mixed HEAD，只重置 index 不动提交——这是「全部撤下草稿」的快捷方式，与 restore --staged 的多文件版对应。",
            depth: 2,
          },
          {
            q: "revert 一个 merge commit 为什么会报错？-m 参数在选什么？",
            intent: "进阶题，检验 merge commit 双 parent 模型在撤销场景的应用。",
            a: "普通提交撤销方向唯一（反向 diff 即可），merge commit 有两个 parent，Git 不知道「抵消掉的是哪条线、保留哪条线」，必须 git revert -m 1 <哈希> 显式声明：1 = 保留第一个 parent（你合入时的主线），2 = 保留被合入的分支。日常语义：-m 1 表示「这批 feature 的改动全部不要了」。",
            bonus:
              "revert 掉 merge 之后又想重新合入这个分支，直接 merge 会「看起来无变化」（历史里已有这些提交）——需要 revert 那个 revert，或 rebase 生成新哈希再合。",
            depth: 3,
          },
          {
            q: "stash 和 branch 都能「先存改动再切走」，怎么选？",
            intent: "压轴题，检验能否按时间尺度与语义给两个工具划界。",
            a: "按时间尺度和意图划界：stash 是几分钟到几小时的「临时抽屉」——插个 bug 修复就回来，语义是「这些改动还没想好怎么办」；branch 是以天计的「正式工作线」——改动值得一个名字和一段历史，语义是「这是一条并行任务」。几十分钟的插入任务 stash 顺手；超过一天、或者改动已经成型，直接开分支提交，比 stash 里躺着一条 stash@{3} 靠谱得多。",
            bonus:
              "git stash branch <新分支> 能把指定 stash 直接变成新分支上的改动——当「临时抽屉」发现东西值得长做时，这就是抽屉到工作线的转正通道。",
            depth: 3,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        日常操作之上两条延伸：<strong>进阶工具箱</strong>
        （tag、rebase -i、cherry-pick、worktree、submodule——都是「对象 + 指针」模型的组合应用）；
        <strong>SSH 配置与多远程</strong>（push 每天在用的传输层，fork
        协作的双远程怎么配）。机制层想再深一步，回「引用系统」篇看 reset 动指针的完整生命周期。
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

function DecisionTable({ rows }: { rows: { scene: string; tool: string; effect: string }[] }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.scene}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border bg-background px-3.5 py-2.5"
        >
          <span className="w-44 shrink-0 text-xs font-semibold">{row.scene}</span>
          <code className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent">
            {row.tool}
          </code>
          <span className="text-xs text-muted">{row.effect}</span>
        </div>
      ))}
    </div>
  );
}
