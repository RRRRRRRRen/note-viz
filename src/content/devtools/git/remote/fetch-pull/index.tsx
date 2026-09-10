import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart, ShellBlock } from "@/components/demo";
import { CompareTable, DoDont, MemoryCard, Timeline, Callout, CrossRef } from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        理解远程同步只需要接受一个设定：
        <strong>你和远程仓库之间从不共享任何状态，你拥有的一切都在本地</strong>。
        <code>origin/main</code> 不是服务器上的分支，而是「上次通信时它的 main
        在哪」的本地缓存书签（一个 41 字节文件）。<strong>fetch</strong> = 询问远程的指针位置 →
        下载本地缺失的对象 → 更新缓存书签，到此为止，不碰工作区、不碰本地分支、永不产生冲突；
        <strong>pull</strong> = fetch + merge，冲突只可能发生在第二步。<code>git status</code> 显示
        behind/ahead 时没有任何网络请求——比的只是两个本地文件。
      </Conclusion>

      <Heading level={2} title="origin/main 的真身：远程书签的本地缓存" />
      <Paragraph>
        第一次 clone 之后，你的仓库里多出一类特殊的引用：<code>refs/remotes/origin/...</code>
        。它们的物理形态和你自己的分支一模一样——本地磁盘上的小文件（或打包后的引用记录），内容一行哈希：
      </Paragraph>

      <ShellBlock>{`$ git for-each-ref | grep origin
97a743dc765ba3ec3f892cc2d6ec526285e56b24 commit	refs/remotes/origin/HEAD
97a743dc765ba3ec3f892cc2d6ec526285e56b24 commit	refs/remotes/origin/main

$ git config --get remote.origin.fetch
+refs/heads/*:refs/remotes/origin/*    ← 「书签映射表」：对方的 heads/* 抄到我的 remotes/origin/*`}</ShellBlock>
      <Paragraph>
        逐层拆解三个名字：<strong>origin</strong> 是远程仓库的代号（clone 时自动注册，配置在{" "}
        <code>.git/config</code> 里，存着 URL 和映射表）；<strong>origin/main</strong> 是「远程的
        main 分支在我本地的缓存副本」；<strong>refs/remotes/</strong>{" "}
        是这类缓存书签的命名空间。关键性质：<strong>这些书签是只读的</strong>——你 checkout
        它们会进入 detached HEAD（引用系统篇讲过为什么），Git
        不允许直接在上面提交，因为它们代表「远程的状态」，只有 fetch 有资格改写。
      </Paragraph>
      <Paragraph>
        于是「本地与远程的差距」这个概念彻底落地了：behind 3 = <code>refs/heads/main</code>{" "}
        指向的提交不在 <code>refs/remotes/origin/main</code> 的历史里、而反方向有 3 个——两个 41
        字节文件的指针运算，<strong>全程零网络请求</strong>。你离线时 <code>git status</code>{" "}
        照样能告诉你「上次同步时落后了几个」，原因就在这。
      </Paragraph>

      <MemoryCard keyword="你拥有的一切都在本地" color={PALETTE.purple}>
        <p>
          commit、tree、blob、分支、远程书签、reflog
          全部在你机器上。远程仓库只是另一台机器上的同构仓库，两边只通过「传对象 +
          报指针位置」通信。这条设定是理解 fetch/pull/push 一切行为的根：status 不联网、fetch
          不改工作区、push 的冲突与 pull 的冲突是两回事。
        </p>
      </MemoryCard>

      <DoDont
        label="远程书签的正确用法 / remote refs"
        dont={{
          code: `$ git checkout origin/main
# detached HEAD（书签不是分支，不能挂提交）
$ vim fix.ts && git commit -am "fix"
$ git switch main     # 切走……
# 那个提交不在任何分支链上了`,
          note: "远程书签是只读的缓存指针——直接在上面提交，产物会被留在无书签拽着的悬空状态。",
        }}
        do={{
          code: `$ git switch -c fix/remote-main origin/main
# 基于远程书签创建本地分支，HEAD 立刻有了书签
$ vim fix.ts && git commit -am "fix"
$ git push -u origin fix/remote-main`,
          note: "想在「远程的状态」上动手，标准动作是基于它开一个本地分支——书签本身保持只读。",
        }}
      />

      <Heading level={2} title="fetch 到底做了什么：四步协议" />
      <Paragraph>
        <code>git fetch</code> 的内部流程可以拆成四步，每一步都对应一个可观察的副作用：
      </Paragraph>

      <Timeline
        label="fetch 协议 / fetch protocol"
        steps={[
          { label: "① 协商", sub: "互相报出引用位置，算出缺失对象集合", color: PALETTE.blue },
          { label: "② 传输", sub: "远端把缺失对象打包流式传回", color: PALETTE.blue },
          { label: "③ 落库", sub: "逐个校验哈希后写入对象库", color: PALETTE.orange },
          { label: "④ 改书签", sub: "更新 refs/remotes/origin/*", color: PALETTE.green },
        ]}
      />
      <Paragraph>
        协商阶段利用了内容寻址的性质：
        <strong>双方只要交换「我有哪些哈希」，就能精确算出「我缺哪些哈希」</strong>
        ——不需要版本号、不需要增量日志、不需要中央服务器仲裁，两个同构仓库天然知道如何对齐。传输时对象被打成
        packfile（一次打包、批量 delta
        压缩，见存储篇），落库时每个对象都会重新验算哈希——对不上即损坏，立刻拒收，所以对象库不可能混入伪造内容。
      </Paragraph>
      <Paragraph>
        真实实验：本地 clone 一个远程仓库，远端推进一个提交后，观察 fetch 前后各个部分的变化——
      </Paragraph>

      <ShellBlock>{`$ git status -sb
## main...origin/main            ← 书签还停在 clone 时刻：两侧一致

# ……此时远端有人提交了 v2 ……

$ git fetch origin
From /tmp/gitlab-origin
   97a743d..13aaf4b  main       -> origin/main    ← 书签被改写：97a743d → 13aaf4b

$ git status -sb
## main...origin/main [behind 1]  ← 差距现形

$ git rev-parse refs/remotes/origin/main
13aaf4b8d45b98fa8fba1ef541d6fb5fe4cd7e0c     ← 书签指向 v2

$ git rev-parse refs/heads/main
97a743dc765ba3ec3f892cc2d6ec526285e56b24     ← 你的 main 纹丝未动

$ git log --oneline main..origin/main
13aaf4b v2                       ← 新对象已在本地，只是 main 还没跟上`}</ShellBlock>
      <Paragraph>
        这就是 fetch 的完整语义：
        <strong>对象库多了新对象 + 远程书签改了指向，其余一切不动</strong>
        。工作区没变、index 没变、你自己的 main 没变——所以 fetch
        永远安全，随时可以跑，也永远不会和你的本地修改冲突。产生冲突的从来不是
        fetch，而是你随后决定做的合并。
      </Paragraph>

      <Heading level={2} title="pull、push 与冲突的真实分工" />
      <Heading level={3} title="pull = fetch + merge" />
      <Paragraph>
        有了 fetch 的精确语义，pull 不再是黑盒：它就是「fetch
        更新书签」+「把书签指向的提交合并进当前分支」两步的语法糖。冲突只可能发生在第二步——而那正是合并篇讲过的三方对比，与网络毫无关系。
      </Paragraph>

      <CompareTable
        label="fetch 与 pull 分工 / fetch vs pull"
        left={{
          title: "fetch：只更新事实",
          color: PALETTE.blue,
          points: [
            "下载缺失对象，校验哈希后入库",
            "改写 refs/remotes/origin/* 书签",
            "不碰工作区 / index / 本地分支",
            "永不冲突，可随时安全执行",
            "适合「先看远端发生了什么再决定」",
          ],
        }}
        right={{
          title: "pull：fetch + merge",
          color: PALETTE.orange,
          points: [
            "第一步同 fetch",
            "第二步把 origin/main 合并进当前分支",
            "可能触发三方合并，可能冲突",
            "本质是「同步 + 立即表态」的组合拳",
            "想先审后合：fetch 后 git log main..origin/main",
          ],
        }}
      />
      <Heading level={3} title="push 被拒：指针视角的解释" />
      <Paragraph>
        push 是 fetch 的镜像：把本地缺失的对象传给远端，请求它把 <code>refs/heads/main</code>{" "}
        书签改写到你的提交。远端只答应一种请求——<strong>快进</strong>
        ：新位置必须是旧位置的后代（否则等于丢弃别人的提交）。不满足就拒绝，报 non-fast-forward。
      </Paragraph>

      <FlowChart
        label="push 拒绝的几何含义 / push rejected"
        height={340}
        data={{
          direction: "LR",
          nodes: [
            { id: "base", label: "共同祖先", color: PALETTE.gray },
            { id: "remote", label: "远端 main（别人的提交）", color: PALETTE.orange },
            { id: "local", label: "本地 main（你的提交）", color: PALETTE.blue },
            { id: "ok", label: "先 pull 合并 → 恢复快进关系", color: PALETTE.green },
            { id: "force", label: "force push：声明「故意丢弃远端提交」", color: PALETTE.red },
          ],
          edges: [
            { source: "base", target: "remote", label: "远端前进" },
            { source: "base", target: "local", label: "本地前进" },
            { source: "remote", target: "ok" },
            { source: "local", target: "ok", label: "merge 后再推", dashed: true },
            { source: "local", target: "force", label: "绕过检查", dashed: true },
          ],
        }}
      />
      <Paragraph>
        所以「push 冲突」和「pull 冲突」是两回事：<strong>push 被拒是拓扑问题</strong>
        （历史形状不允许快进，一个字节的内容对比都没做）；
        <strong>pull 的冲突是内容问题</strong>
        （三方对比遇到同区域两种改法）。前者用合并恢复形状，后者用人类裁决解决内容。真要强推（例如自己
        rebase 过的个人分支），用 <code>--force-with-lease</code> 代替 <code>--force</code>
        ：若远端书签在你上次 fetch 之后又变过，仍然拒绝——防的是「覆盖掉你不知道的新提交」。
      </Paragraph>

      <DoDont
        label="协作节奏 / workflow"
        dont={{
          code: `# 攒了一周的本地提交直接 push
$ git push
 ! [rejected] main -> main (fetch first)
$ git push --force            # 一时气愤强推
# → 同事基于旧 main 的提交全部悬空`,
          note: "非快进被拒后强推，等于单方面宣布「远端上我没见过的提交作废」。",
        }}
        do={{
          code: `# 被拒后先看远端发生了什么
$ git fetch
$ git log --oneline main..origin/main   # 别人推了什么
$ git pull --rebase                     # 把自己的提交重放到新 main 上
$ git push                              # 历史重新线性，快进成立`,
          note: "先 fetch 摸清差距，再选择合并或 rebase 恢复快进关系——冲突在这里才按内容裁决。",
        }}
      />

      <Heading level={2} title="整合应用：fork 协作的双远程" />
      <Paragraph>
        前面所有讨论只有一个远程 origin，而开源贡献的标准姿势是两个：fork 一份到自己的账号、clone
        自己的 fork（origin，有推送权），再给源仓库挂一条只读通道（upstream）。remote 只是{" "}
        <code>.git/config</code> 里的配置项，多个 remote 各自拥有一套{" "}
        <code>refs/remotes/&lt;名字&gt;/*</code> 缓存书签，fetch 互不干扰：
      </Paragraph>

      <ShellBlock>{`# 一次性配置：给现有仓库添加 upstream
$ git remote add upstream https://github.com/original/repo.git

$ git remote -v
origin	git@github.com:you/repo.git (fetch)
origin	git@github.com:you/repo.git (push)
upstream	https://github.com/original/repo.git (fetch)
upstream	https://github.com/original/repo.git (push)`}</ShellBlock>
      <Paragraph>
        日常同步上游的三步全是本篇机制的组合拳：<code>git fetch upstream</code>{" "}
        把源仓库的新对象拉进本地、更新 <code>upstream/main</code> 书签；<code>git merge</code> 或{" "}
        <code>git rebase</code> 把 <code>upstream/main</code> 整合进自己的 main；
        <code>git push origin main</code> 把同步结果推回自己的 fork。注意每个 remote 的 fetch 与
        push URL <strong>可以不同也可以禁用</strong>——对 upstream 唯一合法的操作是 fetch，push
        只指向 origin。
      </Paragraph>

      <FlowChart
        label="双远程拓扑 / fork remotes"
        height={330}
        data={{
          direction: "TB",
          nodes: [
            { id: "upstream", label: "upstream 源仓库（只 fetch）", color: PALETTE.orange },
            { id: "local", label: "本地仓库（fetch + merge 同步上游）", color: PALETTE.blue },
            { id: "origin", label: "origin 你的 fork（fetch + push）", color: PALETTE.green },
            { id: "pr", label: "Pull Request：fork → 源仓库", color: PALETTE.purple },
          ],
          edges: [
            { source: "upstream", target: "local", label: "fetch：拉取上游更新", dashed: true },
            { source: "local", target: "origin", label: "push：推到自己的 fork" },
            { source: "origin", target: "pr", label: "PR 申请合入上游" },
          ],
        }}
      />
      <Callout kind="warning" title="误推 upstream 的唯一场景">
        如果你对源仓库也有推送权限（公司内部仓库常见），remote
        别名写错就会把代码直接推进上游——这也是开源 fork 场景要刻意识别两个 remote
        的原因：写入权限跟着 remote 的 URL 走，不跟着你的意图走。
      </Callout>

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "git status 显示 behind 3，这时候联网了吗？",
            intent: "热身题，检验「远程书签是本地缓存」是否真正落地。",
            a: "没有。behind 3 是 main 与 origin/main 两个本地引用的指针运算结果，origin/main 是上次 fetch/clone 时刻的缓存。要拿到「此刻」的最新差距，需要先 git fetch 刷新书签——fetch 是唯一联网的步骤，status 本身永远离线。",
            bonus:
              "推论：status 说 up to date 只代表「与上次同步时刻一致」，不代表远端此刻没有新提交。严谨的说法是 fetch 之后再确认。",
            depth: 1,
          },
          {
            q: "git fetch 之后为什么必须再手动 merge？为什么不自动帮我合？",
            intent: "考察 pull 拆分的意义——「获取事实」与「做出决策」分离的设计哲学。",
            a: "因为合并是需要决策的操作：可能产生冲突、可能你想用 rebase 而不是 merge、可能你想先 review 远端改了什么再表态。fetch 刻意止步于「更新事实」（对象 + 书签），把「如何整合」留给你。git pull 是为「我信任远端、直接同步」场景提供的组合快捷键，两者各有适用场景。",
            bonus:
              "团队实践中更推荐 fetch → 查看 → 整合的三步走：log main..origin/main 看新提交、diff main origin/main 看内容差异，再决定 merge 还是 rebase——这比盲目 pull 少很多「pull 完一团乱」的事故。",
            depth: 2,
          },
          {
            q: "origin/main、origin HEAD、remote tracking——这些名字到底是什么关系？",
            intent: "命名混乱是远程概念最大的门槛，检验能否把代号层与引用层对应清楚。",
            a: "origin 是远程仓库的代号，只是 .git/config 里的一个配置项（URL + 引用映射规则）。origin/main 完整写法是 refs/remotes/origin/main，是「远程 main 分支的本地缓存书签」。origin/HEAD 是克隆时记录的「对方的默认分支是哪个」，所以 git checkout main 能凭空创建本地 main 并自动关联 origin/main。三者都在本地，远程服务器从头到尾只有它自己的 refs/heads/main。",
            bonus:
              "git remote add second <url> 可以挂多个远程，各自拥有 refs/remotes/second/* 命名空间——开源协作里「同时跟踪 upstream 和自己的 fork」就是这么工作的。",
            depth: 2,
          },
          {
            q: "git pull --rebase 和默认 pull 有什么区别？什么时候该用哪个？",
            intent:
              "替换与合并篇重复的 non-fast-forward 考点，考察整合方式的第二维——历史形状由谁决定。",
            a: "默认 pull = fetch + merge：远端新提交和你的本地提交通过一个 merge commit 汇合，历史保留分叉事实。pull --rebase = fetch + rebase：把你的本地提交逐个重放到远端新提交之上，历史保持一条直线、不产生合并节点。个人未推送过的功能分支上两者皆可——想保持线性历史用 rebase；本地已有共享的合并历史时用 merge，避免 rebase 改写哈希造成分叉。",
            bonus:
              "git config pull.rebase true 可把 rebase 设为默认；新版本 Git 在 pull 会产生分歧且未配置整合策略时会直接拒绝执行并提示选择——这是它在逼你显式表态 merge 还是 rebase。",
            depth: 3,
          },
          {
            q: "push 的时候 Git 怎么知道该传哪些对象？会不会把整个仓库重传一遍？",
            intent: "压轴题，检验能否把「哈希集合求差」的协商机制推广到上传方向。",
            a: "不会。push 协商和 fetch 对称：远端报出它已有的引用与哈希（它缺什么由它声明 haves），本地据此算出差集——只有远端缺失的对象会被打包传输，而且是 push 前临时生成的精简 packfile（只含差集、做好 delta 压缩）。由于内容寻址，两边仓库对「哪些对象已存在」的判断是精确的，无需任何版本号对齐。",
            bonus:
              "大文件协作的痛点也在这里：一旦某个 100MB 的二进制进了你的提交，此后每个没有它的协作者 clone/fetch 都必然拉下它——去重救不了「别人根本没有」的对象。这正是 Git LFS 要把大文件挪出对象库的根因，细节在存储与回收篇展开。",
            depth: 4,
          },
        ]}
      />

      <CrossRef
        notes={[
          {
            title: "同一文件为什么有时冲突有时不冲突？",
            to: "/note/devtools/git/merge/three-way-merge",
            description:
              "push 被拒的 non-fast-forward 与合并的 fast-forward 是同一概念——拓扑判断的完整推导在合并篇。",
          },
          {
            title: "ssh 免密推送是怎么配出来的？",
            to: "/note/devtools/git/remote/ssh-setup",
            description: "fetch/push 走的传输层：密钥认证、ssh-agent 与协议切换。",
          },
          {
            title: "SSH 是怎么保证远程登录安全的？",
            to: "/note/devtools/ssh/fundamentals/remote-access",
            description: "更底层的 SSH 机制：握手流程、签名挑战模型与 ~/.ssh/config 四件套。",
          },
        ]}
      />
    </NoteShell>
  );
}
