import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  CompareTable,
  Callout,
  DoDont,
  MemoryCard,
  Prerequisite,
  CrossRef,
  Table,
  Timeline,
} from "@/components/viz";
import { ShellBlock } from "@/components/demo";

export default function Note() {
  return (
    <NoteShell>
      <Prerequisite
        notes={[
          {
            title: "git 的三个区是怎么分工的？",
            to: "/note/devtools/git/basics/daily-commands",
          },
          {
            title: "reset --hard 丢弃的提交去哪了？",
            to: "/note/devtools/git/refs/branch-head",
          },
        ]}
      >
        撤销的全部路由都建立在三区模型上；reset 的安全性问题要到「分支只是指针文件」那一层才看得透。
      </Prerequisite>

      <Conclusion>
        撤销命令的选择只有一个入口问句：<strong>改动现在到哪个区了</strong>。
        <strong>restore</strong> 管文件级——<code>restore &lt;文件&gt;</code> 用 index 覆盖工作区、
        <code>restore --staged</code> 把草稿撤回工作区；<strong>reset</strong>{" "}
        管提交级——把分支指针回拨到目标提交，<code>--soft/--mixed/--hard</code> 三档决定 index
        和工作区跟不跟着对齐；<strong>revert</strong>{" "}
        管共享历史——追加一个反向提交抵消目标，不改写任何已有提交，是已 push
        分支的唯一安全解。工作区里从未 add 过的内容不在对象库，任何命令都救不回来。
      </Conclusion>

      <Heading level={2} title="先定位，再选命令" />
      <Paragraph>
        「撤销」不是一条命令，是四个场景四把钥匙。所有慌乱都源于跳过定位直接想「哪条命令能撤销」——先问改动躺在哪个区，再查表：
      </Paragraph>

      <Table
        label="撤销路由表 / undo routing"
        head={["改动到哪了", "工具", "效果与边界"]}
        rows={[
          [
            "改了文件，还没 add",
            <code>git restore &lt;文件&gt;</code>,
            "用 index 版本覆盖工作区，改动丢弃（从未入库，不可恢复）",
          ],
          [
            "add 错了 / 想撤下草稿",
            <code>git restore --staged &lt;文件&gt;</code>,
            "改动退回工作区，内容一点不丢",
          ],
          [
            "commit 了，还没 push",
            <code>git reset --soft/mixed/hard</code>,
            "移动分支指针，三档决定连带清理哪两区（见下）",
          ],
          [
            "已经 push 到共享分支",
            <code>git revert &lt;commit&gt;</code>,
            "新增一个反向提交抵消目标，不改写历史，安全",
          ],
          [
            "想改最后一次提交本身",
            <code>git commit --amend</code>,
            "替换成新提交（哈希变），未 push 时随意，已 push 慎用",
          ],
          [
            "临时插入任务，改动没处放",
            <code>git stash</code>,
            "工作区 + index 打包成一个临时提交挂到 stash 引用，三区恢复干净",
          ],
        ]}
      />
      <Paragraph>
        这张表的排列顺序就是<strong>危险度递增</strong>的方向：restore 只碰文件，reset
        动的是分支历史， revert
        之所以排在最后不是因为危险，而是因为它服务于「多人已经看见这段历史」的场景——它不撤回任何东西，只是当众抵消。
      </Paragraph>

      <Heading level={2} title="restore：文件级的两个方向" />
      <Paragraph>
        restore 负责两个方向，都是从 HEAD 或 index「取旧版本盖回去」：
        <code>git restore &lt;文件&gt;</code> 用 index 的版本覆盖工作区——「我没 add 的乱改不要了」；
        <code>git restore --staged &lt;文件&gt;</code> 用 HEAD 的版本重写 index——「add
        错了，把草稿上这一行划掉」。第二个方向只动 index，工作区内容原样保留。
        真实实验（接三区篇同一个仓库）：
      </Paragraph>

      <ShellBlock>{`$ git restore app.ts             # index → 工作区：丢弃未暂存的修改
$ git status -s                  # app.ts 从第二列消失
A  staged.txt
?? untracked.txt

$ git restore --staged staged.txt   # HEAD → index：撤下草稿
$ git status -s                  # staged.txt 退回 untracked，文件还在磁盘上
?? staged.txt
?? untracked.txt`}</ShellBlock>
      <Callout kind="danger" title="第一个方向不可恢复">
        <code>git restore app.ts</code> 覆盖掉的是<strong>从未进入对象库的内容</strong>——没有 blob
        承载它，reflog 也无从记起。这是 Git 里少数真正「没了就没」的操作。拿不准时先{" "}
        <code>git diff</code> 看一眼要扔什么，或先 <code>git stash</code> 留个后路。
      </Callout>

      <Heading level={2} title="reset：回拨分支指针的三档" />
      <Paragraph>
        reset 的核心动作只有一个：<strong>把当前分支指针改写到目标提交</strong>
        （引用系统篇讲过，分支只是一个 41 字节的指针文件，这正是它危险的原因——共享分支被 reset
        等于改写公共历史）。三档的区别只在于「指针挪走之后，index
        和工作区跟不跟着对齐」。下面用四个提交的临时仓库把三档一次性真实走完：
      </Paragraph>

      <ShellBlock>{`$ git log --oneline
6f4b24a d
d1a5658 c
296bc90 b
b7a168b a

$ git reset --soft HEAD~1        # 从 d 出发：只动分支指针
$ git status -s
M  f.txt                         ← 第一列 M：改动留在 index，随时重新 commit
$ git diff --staged | tail -4
 a
 b
 c
+d                               ← d 的改动完整躺在草稿上
$ git log --oneline | head -1
d1a5658 c

$ git reset --mixed HEAD~1       # 默认档：指针 + 重置 index
Unstaged changes after reset:
M	f.txt                       ← 改动退回工作区，需要重新 add
$ git status -s
 M f.txt
$ git log --oneline | head -1
296bc90 b

$ git reset --hard HEAD~1        # 指针 + index + 工作区，全部对齐目标
HEAD is now at b7a168b a
$ git status -s                  ← 输出为空：三区全干净
$ cat f.txt
a                                ← 工作区内容也回滚了，未提交改动彻底消失`}</ShellBlock>

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
        <strong>想撤提交但保留改动继续写用 mixed</strong>；<strong>hard 是三区全对齐</strong>
        ——按下之前确认工作区没有值得留的东西。危险度的根源不在「删提交」：哪怕
        --hard，被撤的提交对象本体仍在对象库里，可达提交的 reflog 默认保留 90
        天、不可达提交的记录默认 30 天（<code>gc.reflogExpire</code>/
        <code>gc.reflogExpireUnreachable</code>），窗口内都能从 reflog
        捞回——真正的不可逆风险只有一类： hard 连工作区一起覆盖，而
        <strong>从未 add 过的工作区内容没有任何对象承载</strong>。
      </Paragraph>
      <MemoryCard keyword="reset 动的是指针，不是对象" color="#8b5cf6">
        <p>
          任何档位的 reset
          都不删除提交对象，只是把分支文件改写到目标提交。旧提交从分支链上「摘下来」，靠 reflog
          维持可达；真正物理消失要等 reflog 过期 + gc 修剪两个条件同时满足。
        </p>
      </MemoryCard>

      <Heading level={2} title="revert：在共享历史上只做加法" />
      <Paragraph>
        同样是「撤销一个提交」，revert 和 reset 走的路完全相反：<strong>reset 把历史往回拨</strong>
        （目标提交从分支链上消失）；<strong>revert 在历史前面追加一个「反着做」的新提交</strong>
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
      <Paragraph>
        撤销 merge 提交时 <code>git revert -m 1 &lt;哈希&gt;</code>{" "}
        的原理：普通提交的撤销方向唯一（反向 diff 即可），而 merge commit 有两个 parent，Git
        无法自行判断「抵消哪条线、保留哪条线」—— <code>-m 1</code> 声明「沿第一个
        parent（通常是合入时的主线）的方向保留」，merge 带进来的那批改动全部被反向抵消。这里「parent
        的结构语义」在合并篇有完整展开。
      </Paragraph>

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

      <Heading level={2} title="stash：一个挂在栈式引用上的临时提交" />
      <Paragraph>
        正写着 feature，线上报 bug 要马上切 main——改动没到能提交的程度，<code>git stash</code>{" "}
        把工作区 + index 的现状打包存起来、三区瞬间恢复干净；忙完 <code>git stash pop</code>{" "}
        原样取回。它不是什么特殊存储，看内部结构就知道：<strong>stash 就是一个普通 commit</strong>
        ，被挂在 <code>refs/stash</code> 这个引用上——相当于一条「随手 push、随手
        pop」的栈式临时分支，每次 stash 都生成一个新提交入栈。
      </Paragraph>

      <ShellBlock>{`$ git stash push -m "wip: 实验"
Saved working directory and index state On main: wip: 实验
$ git stash list
stash@{0}: On main: wip: 实验

$ git cat-file -p stash
tree 88887364ca953cd414058dc26177a4a444998bdb
parent f8e0226436f8eaac44f19e9788b52c4a66e7d871    ← parent₁：stash 时的 HEAD
parent e9b65e2515d19eeb9f704b071e649359d66cdab8    ← parent₂：当时的 index 状态
author dev <dev@example.com> 1788973942 +0800

On main: wip: 实验
# → 两个 parent：一个指向提交历史，一个专门记录 index 的快照`}</ShellBlock>
      <Paragraph>
        这个「本质是 commit」的认知直接给出三条使用纪律：<strong>untracked 文件默认不入栈</strong>
        （它不在 index 里，要带上用 <code>git stash -u</code>）；<strong>stash 不是长期仓储</strong>
        ——栈会被 <code>git stash clear</code>{" "}
        一键清空，塞进去的任务放久了不是丢失就是「stash@&#123;3&#125; 是啥来着」；
        <strong>pop 有冲突时会拒绝丢弃条目</strong>
        ，冲突解决后手动 <code>git stash drop</code> 即可——它宁可让你留着重复，也不替你销毁内容。
      </Paragraph>

      <DoDont
        label="reset --hard 前的自检 / before hard"
        dont={{
          code: `$ git reset --hard HEAD~2    # 直接回拨
# 下班前发现：还有两个没 add 的改动没了`,
          note: "hard 会用目标提交对齐工作区——从未 add 过的内容没有对象承载，覆盖即蒸发。",
        }}
        do={{
          code: `$ git status -s              # 先看工作区有没有未入库的东西
$ git stash push -m "hard 前留底"   # 有就拿不准的内容先入栈
$ git reset --hard HEAD~2
$ git stash pop              # 确认不需要再丢弃`,
          note: "hard 不是不能用，而是「先盘点工作区」这个动作永远不能省。",
        }}
      />

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
            a: "按时间尺度和意图划界：stash 是几分钟到几小时的临时周转——插个 bug 修复就回来，语义是「这些改动还没想好怎么办」；branch 是以天计的正式工作线——改动值得一个名字和一段历史，语义是「这是一条并行任务」。几十分钟的插入任务 stash 顺手；超过一天、或者改动已经成型，直接开分支提交，比 stash 里躺着一条 stash@{3} 靠谱得多。",
            bonus:
              "git stash branch <新分支> 能把指定 stash 直接变成新分支上的改动——当临时周转发现东西值得长做时，这就是 stash 到工作线的转正通道。",
            depth: 3,
          },
        ]}
      />

      <CrossRef
        notes={[
          {
            title: "reset --hard 丢弃的提交去哪了？",
            to: "/note/devtools/git/refs/branch-head",
            description: "reflog 与 GC 的完整生命周期——reset 后悔药的物理基础与时间窗。",
          },
          {
            title: "同一文件为什么有时冲突有时不冲突？",
            to: "/note/devtools/git/merge/three-way-merge",
            description: "revert -m 背后的 merge commit 双 parent 结构语义。",
          },
        ]}
      />
    </NoteShell>
  );
}
