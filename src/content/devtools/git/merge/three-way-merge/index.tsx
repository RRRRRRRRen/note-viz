import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo/FlowChart";
import { CompareTable, DoDont, MemoryCard, OutputTimeline } from "@/components/viz";

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
            { id: "base", label: "merge-base 共同祖先", color: "#8b949e" },
            { id: "ours", label: "ours 当前分支（你的稿）", color: "#1677ff" },
            { id: "theirs", label: "theirs 被合分支（对方的稿）", color: "#f59e0b" },
            { id: "result", label: "merge 结果（新提交）", color: "#3fb950" },
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
          color: "#3fb950",
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
          color: "#f59e0b",
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

      <DoDont
        label="同文件合并的两种结局 / same file"
        dont={{
          code: `# base 8 行，main 与 feature 都改第 5 行
<<<<<<< HEAD
line5-MAIN
=======
line5-FEATURE
>>>>>>> feature
# exit=1，CONFLICT (content)`,
          note: "改动落在同一区域、内容不同——无法归因取舍，交给人。",
        }}
        do={{
          code: `# base 8 行，feature 改第 1 行、main 改第 7 行
# exit=0，Merge made by the 'ort' strategy
line1-FEATURE      ← feature 的改动
...
line7-MAIN         ← main 的改动
# 1 file changed`,
          note: "两个区域互不重叠——都收下，全自动完成，连提示都只有一行。",
        }}
      />
      <Paragraph>
        冲突发生时，Git 做三件事：把两个版本都写进工作区（带{" "}
        <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code> 标记）、在 index 里为该文件记录多个候选版本（所以{" "}
        <code>git status</code> 叫它 both
        modified）、然后停下等你。逐行读懂冲突标记——每个部分都有明确身份：
      </Paragraph>

      <OutputTimeline
        label="冲突标记逐行解读 / conflict markers"
        steps={[
          {
            output: "<<<<<<< HEAD",
            phase: "同步",
            why: "冲突区开始。HEAD 即当前分支（ours），下一行到分隔符之间是「你这边的版本」。",
          },
          {
            output: "line5-MAIN",
            phase: "同步",
            why: "ours 的内容。来自当前分支的 blob——注意它是完整行内容，不是 diff 片段。",
          },
          {
            output: "=======",
            phase: "同步",
            why: "分隔线。上半 ours，下半 theirs——纯边界，解决时删掉。",
          },
          {
            output: "line5-FEATURE",
            phase: "同步",
            why: "theirs 的内容。被合并分支在同一区域的不同写法。",
          },
          {
            output: ">>>>>>> feature",
            phase: "同步",
            why: "冲突区结束，标注 theirs 来自哪个分支。解决后此行也删掉。",
          },
        ]}
      />
      <MemoryCard keyword="冲突 = 待人类裁决的决策点" color="#f59e0b">
        <p>
          冲突不是合并失败，而是三方对比走到「同一区域、两种改法、无法归因取舍」这一步时的显式上交。解决冲突
          = 你替 Git 做那次裁决：编辑文件留下正确版本、删掉标记行、 <code>git add</code>
          （把裁决结果写回 index 草稿）、最后 <code>git commit</code>
          ——产出一个有两个 parent 的 merge commit。
        </p>
      </MemoryCard>

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
            { id: "ff", label: "fast-forward：main 直接挪到 feature", color: "#3fb950" },
            { id: "ffbase", label: "base（main == merge-base）", color: "#8b949e" },
            { id: "fff", label: "feature 新提交", color: "#f59e0b" },
            { id: "noff", label: "--no-ff：新建双 parent 提交", color: "#1677ff" },
            { id: "nfbase", label: "base（分叉的共同祖先）", color: "#8b949e" },
            { id: "nfmain", label: "main 的新提交", color: "#1677ff" },
            { id: "nffeat", label: "feature 的新提交", color: "#f59e0b" },
            { id: "nfmerge", label: "merge commit（parent ×2）", color: "#3fb950" },
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
        。真实对照——同一个实验仓库，默认合并输出第一行是 <code>Fast-forward</code>，加{" "}
        <code>--no-ff</code> 强制造节点后, <code>git cat-file -p</code> 拆开新提交能看到两行
        parent：
      </Paragraph>

      <ShellBlock>{`$ git merge feature
Updating b708ec3..7b4c799
Fast-forward
 f.txt | 2 +-

$ git merge --no-ff feature      # 换个场景：main 上也有新提交
$ git cat-file -p HEAD | head -3
tree   26362f006fd0f8d0f9cd9854cbf7f7cfc57fc274
parent b708ec31c1cf9681bde152f3db06b91c6c46f7e2
parent 7b4c799aee0346c57f4e589e12a130f061283916   ← 第二个 parent`}</ShellBlock>
      <CompareTable
        label="三种合并产出 / merge flavors"
        left={{
          title: "fast-forward 与 --no-ff",
          color: "#3fb950",
          points: [
            "ff：0 个新提交，只移动分支指针",
            "--no-ff：1 个新提交，两个 parent",
            "历史保留分叉气泡，能看出「这批改动来自一个 feature」",
            "团队主干常用 --no-ff 保住 feature 的边界",
          ],
        }}
        right={{
          title: "squash（压扁合并）",
          color: "#f59e0b",
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
              "force push 的本质就是「我知道会甩掉远端那些提交，我故意的」——配合 reflog（本地）与服务器端 reflog（如 GitLab/GitHub 可配置保留）才有后悔药。",
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

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        合并的对手盘是<strong>远程协作</strong>
        ：pull = fetch + merge，冲突经常在协作中遇到——先弄清 fetch
        到底传输了什么、什么它永远不碰，冲突就不会和「远程问题」混在一起背锅（见「远程协作」篇）。而
        rebase 重放生成的新提交为什么占不了多少空间、被抛弃的旧提交什么时候消失，答案在
        <strong>存储与回收</strong>篇。
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
