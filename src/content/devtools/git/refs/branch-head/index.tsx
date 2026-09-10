import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo/FlowChart";
import { CompareTable, DoDont, MemoryCard, Timeline, CrossRef } from "@/components/viz";
import { ShellBlock } from "@/components/demo/ShellBlock";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        Git 的引用系统只有三层，每层都简单到不像设计：<strong>分支</strong>是一个 41
        字节的文本文件，内容只有一行哈希（所以开分支、切分支近乎免费）；<strong>HEAD</strong>{" "}
        是另一个文件，记录「下一个 commit 挂在哪」，它指着分支名，分支再指着 commit；
        <strong>reflog</strong> 是 HEAD
        的移动日志，你每次切换、提交、重置都记一笔，可达提交的记录默认保留 90
        天、不可达提交的记录默认 30 天——这就是 reset --hard 之后提交还能找回来的原因。看懂{" "}
        <code>.git/HEAD</code> 和 <code>refs/</code> 目录，所有指针类命令（checkout / reset /
        rebase）都从「需要背的咒语」变成「看图说话」。
      </Conclusion>

      <Heading level={2} title="分支：一个 41 字节的文件" />
      <Paragraph>
        「分支」这个词听起来像一份独立的代码副本，物理上它是什么？一个文件，一行内容。在你机器上随手验证：
      </Paragraph>

      <ShellBlock>{`$ cat .git/HEAD
ref: refs/heads/main          ← HEAD 指向「分支名」

$ cat .git/refs/heads/main
c94b1f5ad9151b404368aec5f7cc6dee6223cc09    ← 分支的全部内容：一行哈希`}</ShellBlock>
      <Paragraph>
        <code>refs/heads/main</code> 这个文件的整体内容，就是 main 分支的「全部定义」：指向 commit{" "}
        <code>c94b1f5</code>。所谓「在 main 上」没有更多含义——Git 读 HEAD，发现它说 ref:
        refs/heads/main，再去读那个文件拿到哈希，定位到提交，一切就绪。
      </Paragraph>
      <Paragraph>
        由此直接推出几个日常体感：<strong>创建分支</strong> = 写一个 41 字节文件，所以{" "}
        <code>git branch</code> 毫秒级完成、从不卡顿；<strong>删除分支</strong> =
        删掉这个文件（提交对象本体毫发无损）；<strong>分支上「领先」其他分支</strong> =
        它的哈希指向更新的提交而已。分支不是容器，是<strong>会移动的书签</strong>。
      </Paragraph>

      <MemoryCard keyword="分支 = 会移动的指针" color="#8b5cf6">
        <p>
          分支的物理实体是 <code>.git/refs/heads/</code> 下的一个文件，内容为一行 commit
          哈希。提交时 Git
          做的唯一「分支操作」就是改写这个文件——「分支前进了」是结果，不是过程。理解了这一点，fast-forward、branch
          -d 的安全性、分支对比（其实就是比哈希）全都顺理成章。
        </p>
      </MemoryCard>

      <Heading level={2} title="HEAD：你是谁、你在哪、commit 往哪挂" />
      <Paragraph>
        HEAD 是整个引用系统的枢纽。它也是一个文件，正常状态下内容是{" "}
        <code>ref: refs/heads/main</code> 这样的<strong>分支名</strong>（这叫 attached
        状态）。它的语义一句话：<strong>「我接下来的操作挂在哪」</strong>。
      </Paragraph>
      <Paragraph>把 commit 的完整流程走一遍，HEAD 的角色立刻清晰：</Paragraph>

      <Timeline
        label="commit 时指针的联动 / pointer dance"
        steps={[
          { label: "读 HEAD", sub: "ref: refs/heads/main", color: "#1677ff" },
          { label: "读 main 文件", sub: "拿到当前提交哈希", color: "#1677ff" },
          { label: "写新 commit", sub: "parent = 刚拿到的哈希", color: "#f59e0b" },
          { label: "改写 main", sub: "指向新 commit，分支前进", color: "#3fb950" },
          { label: "追加 reflog", sub: "HEAD@{1} → HEAD@{0}", color: "#8b5cf6" },
        ]}
      />
      <Paragraph>
        注意第三步和第四步的关系：新 commit 的 parent 永远取自「HEAD 当前指向的位置」，然后 HEAD{" "}
        <strong>拽着它指的分支</strong>
        一起前移。不是「提交到分支上」，是「挂在 HEAD
        所指之处，顺便把那个书签挪过来」。这个细微差别在 detached HEAD 时会立刻显出威力。
      </Paragraph>

      <Heading level={3} title="detached HEAD：没有书签拽着的提交" />
      <Paragraph>
        当你 <code>git checkout &lt;某commit哈希&gt;</code>（比如回到历史版本看看代码），HEAD
        文件里写的就不再是分支名，而是直接一个哈希——这叫 <strong>detached HEAD</strong>，Git
        会给一条著名的警告。此时一切照常工作：可以看代码、可以编译、甚至可以提交（parent
        也会正确挂上）。唯一的区别是：<strong>没有分支名拽着新提交</strong>。
      </Paragraph>
      <Paragraph>
        后果在你切走的那一刻发生：HEAD 指向别的分支后，刚才那个提交不在任何分支的引用链上——
        <code>git log</code> 里看不到了。很多人在这里「丢了代码」。但结合上一段就知道：
        <strong>对象本体还在对象库里，reflog 里也记着这一笔</strong>，找回只是从 reflog
        里把哈希抄出来、建个分支指过去的事。真正会丢数据的场景只有一种：放着不管超过 reflog
        过期时间，再被 GC 修剪（见「存储与回收」篇）。
      </Paragraph>

      <DoDont
        label="detached HEAD 自救 / recovery"
        dont={{
          code: `$ git checkout a1b2c3d
Note: switching to 'a1b2c3d'.

You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by switching back to a branch.
...（警告其余部分略）...
HEAD is now at a1b2c3d
$ # 随便看了看，切回 main
$ git checkout main
$ # ……刚才基于 a1b2c3d 改的东西呢？log 里没有！`,
          note: "切走之后新提交不在任何分支链上，git log 自然看不到——但对象还在，别慌，也别急着重做。（输出为节选，警告全文会再解释 stash 与 -c 建分支两条出路。）",
        }}
        do={{
          code: `$ git checkout a1b2c3d
$ # ……做了些修改并提交
$ git switch -c rescue-branch     # 或 git branch rescue a1b2c3d 的后继
$ # 想找回更早「丢」的：
$ git reflog                      # 找到那笔移动记录的哈希
$ git branch rescue <哈希>`,
          note: "发现自己在 detached 状态要做改动，第一时间建分支把书签挂上；已经切走的，去 reflog 里捞。",
        }}
      />

      <Heading level={2} title="reflog：HEAD 的追加写日志" />
      <Paragraph>
        reflog 是 <strong>HEAD 的移动日志</strong>：每次 HEAD
        变化（提交、切换、重置、合并）都在本地记一笔「HEAD@&#123;n&#125;
        现在指向谁、因为什么」。它的形态就是一个<strong>append-only 的日志文件</strong>
        ——和数据库的
        WAL、系统的审计日志同一思路：事件只追加、永不改写，读侧随时按序号回放。真实仓库里的样子：
      </Paragraph>

      <ShellBlock>{`$ git reflog -3
c94b1f5 HEAD@{0}: commit: refactor: 事件循环笔记按最新规范重写……
a266a08 HEAD@{1}: commit: fix: 评审修复——closeOtherDomains 领域判定……
1603be9 HEAD@{2}: commit: fix: 侧栏四级条目恢复可变色竖线……`}</ShellBlock>
      <Paragraph>
        每一行都在说：「HEAD 在这个操作之后指向了这个哈希」。它只存在于本地（不会被 push、clone
        带走），保留期分两档：<strong>可达提交的条目默认 90 天</strong>（
        <code>gc.reflogExpire</code>），<strong>不可达提交的条目默认 30 天</strong>（
        <code>gc.reflogExpireUnreachable</code>）——后者更短，因为 amend、rebase、reset
        抛下的旧提交不属于当前项目，过期策略故意更激进。reflog 的存在建立在一个更强的保证上：
        <strong>commit 对象一旦写入就不可变</strong>，分支怎么移动、HEAD
        怎么乱跳，都不可能销毁对象——「删除」永远只是把指针从链上摘下来。所以 reflog
        才敢承诺：只要记着哈希，随时能回去。
      </Paragraph>

      <Heading level={3} title="一场「事故」的完整解剖" />
      <Paragraph>
        下面是真实执行的一次 reset --hard（先提交 c2，再硬重置回 c1），看数据分别在哪些地方：
      </Paragraph>

      <ShellBlock>{`$ git commit -am c2
$ git rev-parse HEAD
c2b44117a1b4f220ab92791733bbfd2c433b3932

$ git reset --hard HEAD~1        # “丢弃” c2
HEAD is now at 81b52e0 c1
$ git log --oneline
81b52e0 c1                       ← log 里没有 c2 了

$ git reflog -2
81b52e0 HEAD@{0}: reset: moving to HEAD~1
c2b4411 HEAD@{1}: commit: c2     ← reflog 里清清楚楚

$ git rev-parse 'HEAD@{1}'
c2b44117a1b4f220ab92791733bbfd2c433b3932   ← 一秒找回

$ git fsck --unreachable --no-reflogs
unreachable commit c2b44117a1b4f220ab92791733bbfd2c433b3932
unreachable tree 286e6959...                ← 同批 tree、blob 也不可达（输出节选）
unreachable blob 16f9ec00...
                                             ← 从引用视角看：它们只是“不可达”，不是“不存在”`}</ShellBlock>
      <Paragraph>
        三个视角对照着读：<code>git log</code> 看的是「从分支可达的提交」；
        <code>git reflog</code> 看的是「HEAD 走过的路」（不管可不可达）；
        <code>git fsck --unreachable</code> 看的是「对象库里所有没人指的对象」。c2
        在第一个视角消失、在后两个视角都在。真正的物理删除要等两件事同时发生：reflog
        条目过期（可达记录默认 90 天 / 不可达记录默认 30 天）+ GC 修剪可达性。
      </Paragraph>

      <FlowChart
        label="GC 可达性入口 / reachability"
        height={340}
        data={{
          direction: "TB",
          nodes: [
            { id: "gc", label: "git gc 修剪的“存活名单”", color: "#f59e0b" },
            { id: "refs", label: "所有引用（分支 / 标签 / 远程书签）", color: "#8b5cf6" },
            {
              id: "reflog",
              label: "所有未过期 reflog 条目（可达 90 天 / 不可达 30 天）",
              color: "#1677ff",
            },
            { id: "index", label: "当前 index（暂存区）", color: "#3fb950" },
            { id: "dead", label: "三个入口都走不到 → 才会物理删除", color: "#f85149" },
          ],
          edges: [
            { source: "refs", target: "gc", dashed: true },
            { source: "reflog", target: "gc", dashed: true },
            { source: "index", target: "gc", dashed: true },
            { source: "gc", target: "dead" },
          ],
        }}
      />
      <Heading level={3} title="常用记法：三个坐标系统" />
      <Paragraph>HEAD 还派生出三套「寻址语法」，日常排障全靠它们：</Paragraph>

      <ShellBlock>{`HEAD~2      代际：HEAD 往上数 2 代（~ 穿透合并，走第一父链）
HEAD^2      分叉：HEAD 的第 2 个 parent（只对 merge commit 有意义）
HEAD@{2}    时间：HEAD 两次移动之前在哪（读 reflog，等价于回放日志）`}</ShellBlock>
      <CompareTable
        label="三种寻址 / ~ ^ @"
        left={{
          title: "~ 与 ^（结构坐标）",
          color: "#8b5cf6",
          points: [
            "在提交图上按形状移动",
            "HEAD~3 = 沿第一 parent 上溯 3 代",
            "HEAD^2 = merge 的第二个 parent",
            "回答「那个提交的祖先是谁」",
          ],
        }}
        right={{
          title: "@{n}（时间坐标）",
          color: "#1677ff",
          points: [
            "在 reflog 上按时间回退",
            "HEAD@{1} = 上一次移动前的位置",
            "main@{yesterday} 也合法",
            "回答「我昨天指过谁」——找回丢失提交的主力",
          ],
        }}
      />
      <MemoryCard keyword="reset --hard 之后先看 reflog" color="#3fb950">
        <p>
          任何「提交不见了」的事故，恢复口诀：<code>git reflog</code> 找到事故前的哈希 →{" "}
          <code>git branch rescue &lt;哈希&gt;</code>（或直接 reset 回去）→ 检查无误再清理。 reflog
          是本地保险，push/clone 不携带，所以「找回」只能在出事的这台机器上做。
        </p>
      </MemoryCard>

      <DoDont
        label="坐标系统不混用 / ~ vs @"
        dont={{
          code: `# 刚 reset --hard 回退了 2 次，想反悔再回去
$ git reset --hard HEAD~1
# 又往回退了一代！~ 是「沿 parent 上溯」，
# reset 之后 HEAD 的祖先链已经变了`,
          note: "想撤销「指针的移动」却用了「提交图的上溯」——两套坐标系在变动的历史上指向完全不同的地方。",
        }}
        do={{
          code: `$ git reflog -3
a1b2c3d HEAD@{0}: reset: moving to HEAD~1
9f8e7d6 HEAD@{1}: reset: moving to HEAD~1
4c5b6a7 HEAD@{2}: commit: 事故前的位置
$ git reset --hard HEAD@{2}   # 时间坐标：回到移动之前`,
          note: "撤销指针移动用 @{n}（查日志），在历史上游走用 ~n（查祖先）——分清这两个问题，坐标就不会用错。",
        }}
      />

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "为什么 Git 开分支快到感觉不到延迟？",
            intent: "热身题，检验「分支 = 指针文件」是不是真的内化，而不是背一句口号。",
            a: "因为创建分支的物理动作是：新建一个 41 字节的文件，内容写一行哈希。没有代码拷贝、没有目录复制、没有索引重建——对比一下「复制整个项目目录」的开销就能理解量级差异。切换分支的开销另算（需要物化差异文件），但「开」这个动作本身永远是毫秒级。",
            bonus:
              "由此能推出分支管理的正确姿势：分支便宜到可以按想法随手开（一个实验一个分支），贵的从来不是分支数量，而是长期不合并导致的冲突面积。",
            depth: 1,
          },
          {
            q: "git checkout main 之后，之前 detached 状态下做的提交还在吗？去哪找？",
            intent: "「丢代码」是 detached HEAD 最高频的事故，考察是否掌握 reflog 这条恢复路径。",
            a: "还在，commit 对象完好地躺在 .git/objects 里，只是不在任何分支的引用链上。找法：git reflog 列出 HEAD 的移动历史，找到那个提交的哈希，然后 git branch rescue <哈希>（或 git checkout -b rescue <哈希>）把它挂回一个书签。注意 reflog 是纯本地记录，且保留期分两档——可达提交的记录默认 90 天、不可达提交的记录默认 30 天——所以要在同一台机器、过期之前操作。",
            bonus:
              "git fsck --unreachable 能列出所有不可达对象，是 reflog 也被清掉之后的最后手段；日常用 reflog 就够，因为 reflog 里连「你切过去」这个动作都记着。",
            depth: 2,
          },
          {
            q: "git reset --hard 和 git checkout 切分支，本质区别是什么？",
            intent: "两者都是「移动指针」，区分不开的人会把 reset 用在共享分支上闯祸。",
            a: "看它们动的是哪个指针。checkout 移动的是 HEAD 本身——从「指向分支 main」改成「指向分支 feature」，分支文件一个字节都没动，因此是安全的、可共享的。reset 移动的是分支文件——把 refs/heads/main 直接改写到另一个提交，HEAD 被拽着跟过去，等于「改写了这条分支的历史」，在共享分支上执行会制造分叉，需要强推才能同步，属于危险操作。",
            bonus:
              "reset --soft/--mixed/--hard 三档的区别只是「分支挪走之后，工作区和 index 要不要跟着动」：soft 都不动、mixed 动 index、hard 全部对齐——对象库里的旧提交在任何档位下都不删，reflog 都能救。",
            depth: 3,
          },
          {
            q: "branch -d 和 branch -D 的区别，从引用模型怎么解释？",
            intent: "考察能否用「可达性」解释命令的安全设计，而不是死记 -d 安全 -D 强制。",
            a: "branch -d 删指针文件前会检查：这个分支的提交是否已经合并进当前分支（即删掉书签后，那串提交是否仍从别的书签可达）。可达才允许删——因为删的只是书签，内容不丢。branch -D 跳过这个检查，直接删文件；如果那些提交没有别的书签指着，它们立刻变成不可达，只能靠 reflog（不可达提交的记录默认 30 天内）或 fsck 找回。",
            bonus:
              "tag 和 branch 的唯一区别也在这里：tag 创建后从不移动。但「删 tag 永远安全」是误解——tag 没有 reflog，如果某个提交只被这个 tag 可达（没有任何分支指着），删掉 tag 后它立刻失联，reflog 里捞不到，只能靠 git fsck --unreachable 这类对象级扫描找回。",
            depth: 3,
          },
          {
            q: "reflog 会不会无限膨胀？它和对象库的 GC 是什么关系？",
            intent: "压轴题，把 reflog 的「保险」属性和 GC 的「回收」属性拼成完整的生命周期图。",
            a: "会过期，不会无限膨胀。保留期分两档：可达提交的 reflog 条目默认 90 天过期（gc.reflogExpire），不可达提交的条目默认 30 天（gc.reflogExpireUnreachable）——rebase、amend、reset 抛下的旧提交走 30 天那一档，过期条目在 gc 时被清掉；对象库那边，一个提交只有在「所有引用 + 所有未过期 reflog + index 都不可达」时，才会在 gc 修剪中被物理删除。所以准确的生命周期是：提交被「丢弃」→ 成为不可达，reflog 里的记录再保它 30 天（此期间随时可救）→ 条目过期 → 下一次 gc 物理删除；仍被分支或 tag 指着的提交则走 90 天档，那是针对「引用被误删」这类事故的保险。两层机制共同保证了「后悔药有时间窗，仓库又不会无限膨胀」。",
            bonus:
              "gc.reflogExpire / gc.reflogExpireUnreachable 两个配置可以调整保留期；团队规范里如果有人经常 rebase 共享分支，可以把窗口调长当作事故保险。",
            depth: 4,
          },
        ]}
      />

      <CrossRef
        notes={[
          {
            title: "git 的三个区是怎么分工的？",
            to: "/note/devtools/git/basics/daily-commands",
            description: "三区坐标系里 status/diff 的方向语义——日常命令的下一层地基。",
          },
          {
            title: "restore、reset、revert 怎么选？",
            to: "/note/devtools/git/basics/undo-commands",
            description: "把本篇的指针模型用起来：撤销四场景的路由与 reset 三档实验。",
          },
        ]}
      />
    </NoteShell>
  );
}
