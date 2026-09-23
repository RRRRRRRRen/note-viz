import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart, ShellBlock } from "@/components/demo";
import { CompareTable, CrossRef, DoDont, MemoryCard, Prerequisite, Table } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        Git 合并的精确公式：
        <strong>
          找 merge-base（共同祖先）→ 以它为参照做三方对比 → 逐区域裁决 → 结果物化成一个 commit
        </strong>
        。冲突的粒度是「区域」而不是「文件」：同一文件双方改了不同区域会自动合并，改了同一区域且内容不同才冲突。没有分叉时合并退化为快进（fast-forward）——连提交都不新建，只移动分支指针。冲突不是错误，是
        Git 把「无法替你做的决策」显式摆到桌面上。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "git 的三个区是怎么分工的？",
            to: "/note/devtools/git/basics/daily-commands",
          },
        ]}
      >
        三方合并的结果落回工作区与暂存区：三区模型是理解冲突落点的前置。
      </Prerequisite>

      <Heading level={2} title="技术对照：协作文档的三方合并" />
      <Paragraph>
        把合并想成<strong>协作文档的一次冲突处理</strong>
        ：两位同事从同一份文档各自拷贝副本去改，回来时光把两份副本放在一起对比是不够的——A 改了第 5
        段、B 没改，你看不出是「A 改了」还是「B 拿的是旧版本」。所以合并工具一定先取出
        <strong>共同祖先版本</strong>
        （= merge-base），然后三方对照：A 相对祖先改了什么、B
        相对祖先改了什么——两边改的地方不重叠就都收下，改到同一处才需要人拍板。
      </Paragraph>
      <Paragraph>
        这里的「共同祖先版本」就是 Git 的
        merge-base：两支提交历史的最近公共祖先。后文所有规则都是它的推论。
      </Paragraph>

      <Heading level={2} title="为什么必须是三方对比" />
      <Paragraph>
        先看两方对比为什么不够。设 base 版本的 line5 是 <code>x</code>：feature 分支把它改成了{" "}
        <code>y</code>，main 分支没动。合并时只看 main 和 feature 两个文件：一行是 <code>x</code>
        ，一行是 <code>y</code>——<strong>不一样，但无法归因</strong>
        ：是「对方改了」还是「我手里这份本来就是旧的」？裁决失去依据，只能一律当冲突，合并器退化为摆设。
      </Paragraph>
      <Paragraph>
        引入 merge-base 之后归因立刻成立：base → main 没变、base → feature 变了，所以「只有一方改了
        → 直接取改动方」，根本不需要人介入。merge-base 的求法不是遍历历史，而是在 commit
        图上做拓扑计算（图上回溯找最近公共祖先），对大仓库也是毫秒级——又是「看图说话」战胜「遍历数据」的例子。
      </Paragraph>

      <FlowChart
        label="三方对比 / three-way"
        height={380}
        data={{
          direction: "LR",
          nodes: [
            { id: "base", label: "merge-base 共同祖先", color: PALETTE.gray },
            { id: "ours", label: "ours 当前分支（你的稿）", color: PALETTE.blue },
            { id: "theirs", label: "theirs 被合分支（对方的稿）", color: PALETTE.orange },
            { id: "result", label: "merge 结果（新提交）", color: PALETTE.green },
          ],
          edges: [
            { source: "base", target: "ours", label: "diff ①" },
            { source: "base", target: "theirs", label: "diff ②" },
            { source: "ours", target: "result" },
            { source: "theirs", target: "result", label: "逐区域裁决", dashed: true },
          ],
        }}
      />

      <Heading level={2} title="冲突判定：文件级粗筛，区域级细判" />
      <Paragraph>
        合并器对每个文件先做一轮粗筛（比较 base / ours / theirs 三个 blob
        的哈希），粗筛就能解决大多数文件：
      </Paragraph>

      <CompareTable
        label="三方裁决表 / resolution"
        left={{
          title: "粗筛即可自动解决",
          color: PALETTE.green,
          points: [
            "只有 ours 改了 → 取 ours",
            "只有 theirs 改了 → 取 theirs",
            "双方都改了但结果一致 → 任取（比如都加了同一行）",
            "双方都没改 → 保持不变（连比较都省了）",
            "一方删了、另一方没动 → 按删除处理",
          ],
        }}
        right={{
          title: "进入区域级细判",
          color: PALETTE.orange,
          points: [
            "双方都改了、且改出了不同的内容",
            "Git 不立即报冲突，而是做行级 diff",
            "把文件切成互不重叠的区域（hunk）",
            "不同区域的改动：全部自动采纳",
            "同一区域两种改法：这里才产生冲突",
          ],
        }}
      />
      <Paragraph>
        所以「同样改一个文件，有时冲突有时不冲突」的答案：
        <strong>冲突的判定粒度是区域，不是文件</strong>。真实对照组实验（同一个 8
        行文件，两个分支各改一行）：
      </Paragraph>

      <Paragraph>
        所以「同样改一个文件，有时冲突有时不冲突」的答案：
        <strong>冲突的判定粒度是区域，不是文件</strong>。真实对照组实验（同一个 8
        行文件的仓库建了两份，两个分支各改一行，输出原样保留）：
      </Paragraph>

      <CompareTable
        label="同文件合并的两种结局 / same file"
        left={{ title: "自动合并", color: PALETTE.green }}
        right={{ title: "冲突", color: PALETTE.orange }}
        rows={[
          {
            aspect: "改动分布",
            left: "不同区域（第 1 行 vs 第 7 行）",
            right: "同一区域（都改第 5 行）",
          },
          {
            aspect: "归因",
            left: "base 对照下双方改动互不干扰，各自成立",
            right: "同一位置两种写法，无法归因取舍",
          },
          {
            aspect: "结果",
            left: "Auto-merging + Merge made by the 'ort' strategy",
            right: "CONFLICT (content)，Automatic merge failed",
          },
          {
            aspect: "退出码与状态",
            left: "exit=0，直接产出 merge commit",
            right: "exit=1，git status 显示 UU（both modified）",
          },
        ]}
      />

      <ShellBlock>{`# 不冲突场景：feature 改第 1 行，main 改第 7 行
$ git merge feature
Auto-merging f.txt
Merge made by the 'ort' strategy.
 f.txt | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

# 冲突场景：main 与 feature 都改第 5 行
$ git merge feature
Auto-merging f.txt
CONFLICT (content): Merge conflict in f.txt
Automatic merge failed; fix conflicts and then commit the result.
$ git status -s
UU f.txt
$ cat f.txt
line1
line2
line3
line4
<<<<<<< HEAD
line5-MAIN
=======
line5-FEATURE
>>>>>>> feature
line6
line7
line8`}</ShellBlock>
      <Paragraph>
        冲突发生时，Git 做三件事：把两个版本都写进工作区（带{" "}
        <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code> 标记）、在 index 里为该文件记录多个候选版本（所以{" "}
        <code>git status</code> 叫它 both
        modified）、然后停下等你。逐行读懂冲突标记——每个部分都有明确身份：
      </Paragraph>

      <Table
        label="冲突标记逐行解读 / conflict markers"
        head={["标记行", "身份", "解决冲突时的动作"]}
        rows={[
          [<code>{`<<<<<<< HEAD`}</code>, "冲突区开始；HEAD 即当前分支（ours）", "删掉此行"],
          [
            <code>line5-MAIN</code>,
            "ours 的内容，来自当前分支的 blob 完整行",
            "保留 / 改写 / 融合——这是裁决本体",
          ],
          [<code>=======</code>, "分隔线：上半 ours，下半 theirs", "删掉此行"],
          [<code>line5-FEATURE</code>, "theirs 的内容，被合并分支的写法", "与 ours 一起参与裁决"],
          [<code>{`>>>>>>> feature`}</code>, "冲突区结束，标注 theirs 来源分支", "删掉此行"],
        ]}
      />
      <MemoryCard keyword="冲突 = 待人类裁决的决策点" color={PALETTE.orange}>
        <p>
          冲突不是合并失败，而是三方对比走到「同一区域、两种改法、无法归因取舍」这一步时的显式上交。解决冲突
          = 你替 Git 做那次裁决：编辑文件留下正确版本、删掉标记行、 <code>git add</code>
          （把裁决结果写回 index 草稿）、最后 <code>git commit</code>
          ——产出一个有两个 parent 的 merge commit。
        </p>
      </MemoryCard>

      <DoDont
        label="标记清理核查 / marker cleanup"
        dont={{
          code: `<<<<<<< HEAD
const a = computeA();
=======
const a = computeAFast();
>>>>>>> feature
# 觉得两个都要，手动删了标记但留了两行同名 const
$ git add . && git commit
# 语法错误进入主干，CI 才发现`,
          note: "「删标记 = 解决冲突」是最危险的错觉——裁决必须包含取舍或融合的正确结果，不是让文件回到能编译的状态就行。",
        }}
        do={{
          code: `const a = computeAFast();   // 融合：保留更快的一方（或两者兼用并重命名）
$ grep -rnE "^(<<<<<<<|=======|>>>>>>>)" src/  # 提交前扫一遍残留标记
$ npm test && git add . && git commit`,
          note: "裁决 → 测试 → 全局扫残留标记 → add + commit。四步里测试和扫描一次都不能省。",
        }}
      />

      <DoDont
        label="rebase 的适用边界 / rebase scope"
        dont={{
          code: `# 同事也基于 feature 开发，你直接：
$ git rebase main
$ git push --force
# → 别人本地的旧哈希链与远端分叉，
#   他们 pull 之后是两段「平行历史」`,
          note: "已共享的分支被 rebase 等于换了历史的地基——每个协作者都要手工清理现场。",
        }}
        do={{
          code: `$ git rebase main      # 只 rebase 自己的、未共享的分支
$ git push --force-with-lease   # 确需强推时用带条件的版本
# → 只有你一个人受影响，reflog 里有旧链可退`,
          note: "rebase 改写的是哈希链——共享即分叉。黄金法则「已 push 的共享分支不要 rebase」可以从这里直接推导。",
        }}
      />

      <Heading level={2} title="快进、普通合并与 squash" />
      <Paragraph>
        「合并一定产生一个双 parent 提交」并不总成立。Git
        会先看拓扑形状：如果一方已经包含另一方（merge-base
        就是其中一方本身），「合并」在数学上零工作量——把落后的分支指针直接挪过来即可，这就是{" "}
        <strong>fast-forward（快进）</strong>：一个新对象都不创建，0 个新提交。
      </Paragraph>

      <FlowChart
        label="两种合并的形状 / merge shapes"
        height={430}
        data={{
          direction: "TB",
          nodes: [
            { id: "ff", label: "fast-forward：main 直接挪到 feature", color: PALETTE.green },
            { id: "ffbase", label: "base（main == merge-base）", color: PALETTE.gray },
            { id: "fff", label: "feature 新提交", color: PALETTE.orange },
            { id: "noff", label: "--no-ff：新建双 parent 提交", color: PALETTE.blue },
            { id: "nfbase", label: "base（分叉的共同祖先）", color: PALETTE.gray },
            { id: "nfmain", label: "main 的新提交", color: PALETTE.blue },
            { id: "nffeat", label: "feature 的新提交", color: PALETTE.orange },
            { id: "nfmerge", label: "merge commit（parent ×2）", color: PALETTE.green },
          ],
          edges: [
            { source: "ffbase", target: "fff", label: "唯一的新历史" },
            { source: "ff", target: "fff", label: "指针直接指过去", dashed: true },
            { source: "nfbase", target: "nfmain", label: "各自前进" },
            { source: "nfbase", target: "nffeat" },
            { source: "nfmain", target: "nfmerge", label: "parent₁" },
            { source: "nffeat", target: "nfmerge", label: "parent₂" },
          ],
        }}
      />
      <Paragraph>
        什么时候会走哪条路？合并那一刻 <code>git merge</code> 的判断只有一句：
        <strong>merge-base == 其中一方 → 快进；否则才真正合并并新建双 parent 提交</strong>
        。注意「快进」和「造节点」是两个独立维度：默认配置下能快进就快进，但 <code>
          --no-ff
        </code>{" "}
        可以在可快进的场景里<strong>强制</strong>新建合并节点；而 main
        有分叉时本来就只能真合并。两种场景都在临时仓库真实重放（输出原样保留）：
      </Paragraph>

      <ShellBlock>{`# 场景一：main 无新提交（merge-base 就是 main 本身），能快进
$ git merge feature
Updating bdde8e0..22a488a
Fast-forward
 f.txt | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
# → 0 个新提交，main 指针直接滑到 feature 顶端

# 场景一（续）：可快进，但用 --no-ff 强制造节点
$ git merge --no-ff feature -m "merge: 合入 feature"
Merge made by the 'ort' strategy.
$ git cat-file -p HEAD | head -3
tree   575a88bd67420decd11e27f8f854a042c0301170
parent f101cddb964e4ff9284130aedbf7d1eadaa59f28   ← parent₁：main 原来的位置（此时恰为 merge-base）
parent a2ca8dcfea8d6aec59f70ef6830d5a2fe0ebec2a   ← parent₂：feature 顶端`}</ShellBlock>

      <ShellBlock>{`# 场景二：main 有自己的新提交（真分叉），默认 merge 就是真合并
$ git merge feature
Auto-merging f.txt
Merge made by the 'ort' strategy.
 f.txt | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
$ git log --oneline --graph
*   83cb49f Merge branch 'feature'
|\\
| * 579ef93 feat: feature 改第 1 行
* | c869dbd fix: main 改第 3 行
|/
* 37a00ac base
$ git cat-file -p HEAD | head -3
tree   a338b16d951ccf4cbe695c7fd905901b61edcbbd
parent c869dbd51916548bce765543d0a9e45f029ad463   ← parent₁：main 的新提交（不是 merge-base！）
parent 579ef936dc624822fe5de5c11c098f73798d91e1   ← parent₂：feature 顶端`}</ShellBlock>
      <Paragraph>
        对照两个场景的 parent 行，merge commit 的结构语义就清楚了：
        <strong>
          parent₁ 永远是执行合并时你所在分支（ours）的顶端，parent₂ 是被合入分支（theirs）的顶端
        </strong>
        。场景一里 ours 尚未前进，parent₁ 恰好等于 merge-base；场景二里 ours 已经前进，parent₁
        就是那个新提交。所以「看 parent₁ 是不是
        merge-base」就能反推一次合并是强造的节点还是自然分叉的结果——排查历史时这是个常用的指纹。
      </Paragraph>
      <CompareTable
        label="三种合并产出 / merge flavors"
        left={{
          title: "fast-forward 与 --no-ff",
          color: PALETTE.green,
          points: [
            "ff：0 个新提交，只移动分支指针",
            "--no-ff：1 个新提交，两个 parent",
            "历史保留分叉气泡，能看出「这批改动来自一个 feature」",
            "团队主干常用 --no-ff 保住 feature 的边界",
          ],
        }}
        right={{
          title: "squash（压扁合并）",
          color: PALETTE.orange,
          points: [
            "把 feature 全部提交压成 1 个全新的普通提交",
            "单 parent、不写合并关系，原提交全部弃用",
            "历史变成干净直线，看不出分支痕迹",
            "GitHub PR 的「Squash and merge」即此物",
          ],
        }}
      />
      <Paragraph>
        三种方式没有绝对优劣，取舍点是<strong>历史信息保真 vs 历史整洁</strong>
        ：ff 最省但丢掉「这里合过一批」的信息；--no-ff 保留完整拓扑；squash
        只留最终成果。你见过「看起来只有一个 parent 的疑似 merge」，多半就是快进或
        squash——它们本来就只是普通提交（或纯指针移动），不是合并节点。
      </Paragraph>

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "两个分支改了同一个文件的不同函数，合并会冲突吗？",
            intent: "热身题，直接检验「冲突粒度是区域不是文件」这条核心认知。",
            a: "通常不冲突。判定流程：文件级粗筛发现「双方都改了」→ 进入行级细判，把文件切成互不重叠的区域 → 两个函数位于不同区域 → 各自改动都被采纳，自动合并完成。冲突只在「同一区域两种不同改法」时发生。",
            bonus:
              "相邻改动是灰色地带：两处修改紧挨着（中间不足 3 行上下文），diff 算法可能把它们划进同一个区域而判冲突——这也是「改得明明不挨着却冲突了」的常见来源。",
            depth: 1,
          },
          {
            q: "merge-base 到底是什么？为什么没有它就没法合并？",
            intent: "检验是否理解三方对比的参照系价值，能不能说清「两方对比缺了什么」。",
            a: "merge-base 是两条分支历史的最近公共祖先，充当三方对比的参照系。没有它，两份文件一比对只能知道「不一样」，无法归因「谁改的」：是对方改了，还是自己手里这份本来就是旧的？有了 base，每个位置都有三种状态（base 版 / ours 版 / theirs 版），归因成立，规则才能运转：只有一方改 → 取改动方；双方都改 → 细判区域。",
            bonus:
              "merge-base 的求解是图拓扑计算而非历史遍历（sub-second 即便在十万提交级仓库）——这也是「Git 快靠图算法和哈希，不靠遍历」的又一例证。",
            depth: 2,
          },
          {
            q: "为什么 push 被拒绝说 non-fast-forward？和合并的 fast-forward 是什么关系？",
            intent: "同一术语出现在两个场景，能贯通的人才是真懂了「指针前移」这个统一模型。",
            a: "是同一个概念的两面：fast-forward 指「目标指针的当前位置是新位置的祖先，可以直接前移、不丢东西」。合并时：main 没有分叉，能直接快进到 feature。推送时：远端 main 上有你没有的提交，你的新提交不是它的后代——快进不成立，硬推（force push）会让远端那几个提交脱离分支链，所以 Git 默认拒绝。正确做法是先 pull 把远端提交合进来，让历史重新变成「远端是本地的祖先」。",
            bonus:
              "force push 的本质就是「我知道会甩掉远端那些提交，我故意的」——后悔药只在本地：reflog 在你这台机器上记着被甩掉之前的哈希；服务端没有面向用户的 reflog，被覆盖的提交在远端没有等价的恢复入口（自建服务器的对象残留可能撑一段时间，但不能依赖）。",
            depth: 3,
          },
          {
            q: "解决冲突时，什么时候不该直接在冲突标记里二选一？",
            intent: "实战题。只会「删标记留一边」的人，遇到双方改动都需要保留的场景会埋雷。",
            a: "冲突标记展示的是「同一区域两种写法」，但正确答案经常不是二选一而是融合：比如两边都在同一区域各自加了一条逻辑，正确结果是把两条都保留、并排写好。裁决时先看 base 版本（git show :1:文件 路径），弄清双方各自相对 base 改了什么，再决定取舍或融合；融合完成、测试通过后 add + commit。",
            bonus:
              "git checkout --ours / --theirs -- 文件 是「整体取一边」的快捷方式，只适合整文件级取舍；git merge --abort 可随时退回合并前状态——冲突会话中你是安全的，任何选择都可撤销。",
            depth: 3,
          },
          {
            q: "rebase 和 merge 都能「把 feature 带进 main」，本质区别是什么？",
            intent: "压轴题。能否从对象模型出发解释「重写历史 vs 追加历史」，区分背口诀和理解派。",
            a: "merge 在分叉之上新建一个双 parent 提交，历史是「保留分叉事实」的图；rebase 把 feature 上的每个提交逐个「重放」到 main 顶端——生成一批全新的 commit 对象（tree 内容可能一样，但 parent 链和 committer 时间全变，哈希必变），原提交被抛弃，历史变成一条直线。所以 rebase 又叫「改写历史」：改的是引用链的形状，不是对象本身（旧对象依旧躺在库里等 GC）。",
            bonus:
              "黄金法则由此可推导而非背诵：已 push 到共享分支的提交不要 rebase——别人基于旧哈希的工作会和你的新哈希分叉，且这次的冲突要在每个人的机器上各解一遍；自己的未共享分支随便 rebase，配合 reflog 永远可反悔。",
            depth: 4,
          },
        ]}
      />

      <CrossRef
        notes={[
          {
            title: "怎么让每次合并都留下 merge 记录？",
            to: "/note/devtools/git/merge/merge-policy",
            description:
              "本文的 ff 机制落到工程策略层：merge.ff 与 pull.rebase 的配置组合，以及为什么强制协作者遵守只能靠服务端。",
          },
          {
            title: "origin/main 是远程上的分支吗？",
            to: "/note/devtools/git/remote/fetch-pull",
            description:
              "pull = fetch + merge 的第一步到底同步了什么；push 被拒的 non-fast-forward 考点也从这里接入。",
          },
          {
            title: "reset --hard 丢弃的提交去哪了？",
            to: "/note/devtools/git/refs/branch-head",
            description: "merge-base、~ 与 ^ 寻址都建立在「分支 = 指针文件」的引用模型上。",
          },
        ]}
      />
    </NoteShell>
  );
}
