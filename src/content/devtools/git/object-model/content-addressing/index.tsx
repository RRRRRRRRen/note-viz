import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo/FlowChart";
import { Callout, CompareTable, DoDont, MemoryCard, Timeline, CrossRef } from "@/components/viz";
import { ShellBlock } from "@/components/demo/ShellBlock";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        Git 快的本质只有一句话：<strong>它从不比较内容，只做哈希查找</strong>。每个文件的内容算出
        SHA-1
        哈希，哈希就是它在对象库里的地址；每次提交记录的是整个项目的快照（一棵指针树），没改的文件直接引用旧对象，所以取版本是
        O(1) 定位、diff 只是展示用的临时计算。<code>git cat-file -p HEAD</code>{" "}
        可以直接拆开任意一个对象看内部——理解了
        blob（内容）、tree（目录）、commit（历史）、tag（锚定版本的批注）四种对象，Git
        的一切行为都能从模型推出来，不再需要死记。
      </Conclusion>

      <Heading level={2} title="技术对照：HTTP 缓存的 ETag 与 CDN 内容寻址" />
      <Paragraph>
        Git 的对象库用的正是 <strong>HTTP 缓存里 ETag 的同款思路</strong>
        ：资源入库时不编流水号，而是直接用「内容的哈希」当地址——内容不变，ETag
        不变，永远命中同一份资源，天然去重。分支只是指向某个版本的可变指针，移动指针不动任何资源。
      </Paragraph>
      <Paragraph>
        这个对照里藏着后面所有内容的对应物：<strong>blob</strong> = CDN
        上按哈希存的响应体（只有内容本身）；<strong>tree</strong> = 描述目录结构的
        manifest（写着哪个名字对应哪个资源）；<strong>commit</strong> =
        带版本号的发布清单（指向一整套 manifest，还记着上一版清单的编号）；<strong>分支</strong> =
        一个可以随时改写的指针（如 <code>latest</code> 标签）。内容一旦入库永不修改，
        所有「版本变化」都只是写入新内容、重新发布一份清单。
      </Paragraph>

      <Heading level={2} title="快照，不是补丁" />
      <Paragraph>
        很多人对 Git 的第一印象是「它存修改记录」：第 1 版 → 打补丁 → 第 2 版 →
        再打补丁……这是早期一些 VCS（以及人对「版本管理」的直觉想象）。在这个模型下，取第 1000
        版要从第 1 版开始依次回放 999 个补丁，版本越老的项目越慢。
      </Paragraph>
      <Paragraph>
        Git 的选择完全相反：<strong>每次提交都存整个项目的完整快照</strong>
        。听起来像要爆炸的磁盘开销？不会——快照里没变的文件只是「指向旧对象的引用」，物理上一个字节都不重复写。于是取任意版本都变成读一张现成的快照，成本与版本新旧无关。
      </Paragraph>

      <CompareTable
        label="两种版本模型 / snapshot vs delta"
        left={{
          title: "增量补丁模型",
          color: "#8b5cf6",
          points: [
            "存储的是「变化」：每个版本 = 上一版 + 补丁",
            "取旧版本要从头回放全部补丁，越老越慢",
            "当前版本快，历史版本越来越慢",
            "历史链条一旦断一环，后面全废",
            "代表：早期 CVS / 直觉想象中的 Git",
          ],
        }}
        right={{
          title: "完整快照模型（Git）",
          color: "#3fb950",
          points: [
            "存储的是「状态」：每个版本 = 一棵完整的指针树",
            "没变的文件引用旧对象，物理上不重复存储",
            "取任何版本都是 O(1) 直接定位",
            "diff 只是展示用的临时计算，不参与存储",
            "对象不可变，损坏一环不影响其他版本",
          ],
        }}
      />
      <Paragraph>
        一个容易忽略的推论：<strong>diff 在 Git 的关键路径上根本不存在</strong>
        。存储靠哈希、取版本靠哈希、分支靠指针，全都不需要比较内容；只有你主动敲{" "}
        <code>git diff</code> 想看差异时，Git 才临时解压两个版本算一次——算完即弃。所以「Git
        对比差异为什么那么快」这个问题本身就问反了：它快不是因为对比快，而是因为绝大多数操作压根不需要对比。
      </Paragraph>

      <Heading level={2} title="一切皆对象，地址就是内容哈希" />
      <Paragraph>
        Git 仓库的核心是 <code>.git/objects/</code>{" "}
        目录——一个巨大的「内容寻址数据库」。任何内容进去，先算 SHA-1
        哈希，然后用哈希当地址存放。哈希即地址意味着两件事：<strong>内容变则地址变</strong>
        （改动必然产生新对象），<strong>内容同则地址同</strong>
        （相同内容天然去重，全宇宙通用）。
      </Paragraph>
      <Paragraph>
        验证只要一行命令。比如「空内容」的哈希在任何机器、任何仓库里都是同一个值：
      </Paragraph>

      <ShellBlock>{`$ git hash-object --stdin < /dev/null
e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`}</ShellBlock>
      <Paragraph>
        这串 40 位十六进制不是随机 ID，是 SHA-1(空串) 的数学结果——任何人、任何时间算都会得到它。你在{" "}
        <code>git log</code> 里见过的 <code>e69de29</code> 开头的 blob（比如某次提交里的空
        README），全都是同一个对象。这个性质后面还会反复出现：空目录、空文件之所以「免费」，就是因为它们的哈希是确定的，无需任何特殊处理。
      </Paragraph>

      <Heading level={3} title="blob：只管内容，不管名字" />
      <Paragraph>
        一个文件在 Git 里存为 <strong>blob</strong>（Binary Large OBject
        ，数据库老术语，泛指「一坨不解释内容的数据」）：zlib 压缩后的文件内容 + 大小头，仅此而已——
        <strong>没有文件名、没有路径、没有权限信息</strong>。
      </Paragraph>
      <Paragraph>
        「名字」存在哪？存在 tree 里。这个拆分是 Git
        设计的精髓：内容与名字分离之后，改名、移动文件变得几乎免费。真机验证——把文件改名后再算哈希：
      </Paragraph>

      <ShellBlock>{`$ echo hello | git hash-object --stdin
ce013625030ba8dba906f756967f9e9ca394464a

$ git hash-object a.txt      # 内容为 hello 的 a.txt
ce013625030ba8dba906f756967f9e9ca394464a

$ mv a.txt b.txt && git hash-object b.txt
ce013625030ba8dba906f756967f9e9ca394464a    ← 一模一样`}</ShellBlock>
      <Paragraph>
        三个哈希完全相同。对 blob 来说 <code>a.txt</code> 和 <code>b.txt</code>{" "}
        是同一个对象——改名只是 tree 里那一行文字变了，内容本体纹丝不动。这就是 Git 能自动识别 rename
        的全部原理：它看到「这个 blob 哈希以前挂在别的名字下」，不需要任何启发式猜测。
      </Paragraph>

      <Heading level={3} title="tree：目录就是一张哈希清单" />
      <Paragraph>
        <strong>tree</strong> 对应一个目录的快照：一张「名字 → 哈希」的映射表，每个条目是四元组——
        <strong>权限模式 + 对象类型 + 哈希 + 文件名</strong>。子目录就是指向另一个 tree
        的条目，层层嵌套构成整棵快照树。用 <code>git cat-file</code> 能直接拆开一个真实仓库的根
        tree：
      </Paragraph>

      <ShellBlock>{`$ git cat-file -p HEAD^{tree}
100644 blob 39fa2a5...	.dockerignore
100644 blob dfa9518...	.gitignore
040000 tree 6f00e3b...	.opencode              ← 子目录：又是一个 tree
100644 blob 0e278fd...	.oxfmtrc.json
100644 blob ca25cdb...	AGENTS.md
...`}</ShellBlock>
      <Paragraph>
        逐列读：第一列 <code>100644</code> 是权限模式——Git 只追踪「是否可执行」一位（
        <code>100644</code> 普通 / <code>100755</code> 可执行 / <code>040000</code> 目录），其余 rwx
        细节一概不管；第二列是类型（blob 或
        tree）；第三列是对象哈希；最后一列是文件名。这个四元组也解释了一个经典怪现象：{" "}
        <strong>空目录为什么不被 Git 追踪</strong>
        ——tree 是「有内容的清单」，目录里没有任何文件就没有东西可指，连 tree
        都不会生成。这不是功能缺失，是模型下的必然。
      </Paragraph>
      <Paragraph>
        把 blob、tree、commit 三层拼起来，一次提交的完整结构长这样（tag
        对象不参与提交图，它在引用层给某个 commit 钉锚点）：
      </Paragraph>

      <FlowChart
        label="对象引用图 / object graph"
        height={420}
        data={{
          direction: "TB",
          nodes: [
            { id: "commit2", label: "commit（第 2 次提交）", color: "#f59e0b" },
            { id: "commit1", label: "commit（第 1 次提交）", color: "#f59e0b" },
            { id: "tree2", label: "tree 根目录清单 v2", color: "#8b5cf6" },
            { id: "tree1", label: "tree 根目录清单 v1", color: "#8b5cf6" },
            { id: "blobA2", label: "blob a.txt（新内容）", color: "#1677ff" },
            { id: "blobB", label: "blob b.txt（复用）", color: "#3fb950" },
            { id: "blobA1", label: "blob a.txt（旧内容）", color: "#9ca3af" },
          ],
          edges: [
            { source: "commit2", target: "tree2", label: "tree" },
            { source: "commit2", target: "commit1", label: "parent", dashed: true },
            { source: "commit1", target: "tree1", label: "tree" },
            { source: "tree2", target: "blobA2", label: "a.txt" },
            { source: "tree2", target: "blobB", label: "b.txt" },
            { source: "tree1", target: "blobA1", label: "a.txt" },
            { source: "tree1", target: "blobB", label: "b.txt" },
          ],
        }}
      />
      <Paragraph>
        看第 2 次提交：只改了 <code>a.txt</code>，于是只有它是新 blob；<code>b.txt</code>{" "}
        的内容没变、哈希没变，第 2 棵 tree 直接引用第 1 次提交时的同一个对象——
        <strong>这就是「快照逻辑上完整、物理上只存增量」</strong>
        。改 1 个文件提交 100 次，仓库只多 100 个小 blob，不会膨胀 100 倍全量。
      </Paragraph>

      <Heading level={3} title="commit：唯一带历史的对象" />
      <Paragraph>
        blob 和 tree 都是「纯数据」，不含时间、作者、因果关系。<strong>commit</strong>{" "}
        是唯一携带历史的对象：它指向一棵根
        tree（这个时刻的完整快照）、指向一个（或合并时的两个）parent
        commit，外加作者、时间与提交说明。拆开一个真实 commit：
      </Paragraph>

      <ShellBlock>{`$ git cat-file -p HEAD
tree 9d186ecd31430d25dc114fba11ed557704c1e1c6
parent a266a083008bbc543b4fb79ac907998839ccdf30
author renguoqiang <dittorenard@outlook.com> 1787898618 +0800
committer renguoqiang <dittorenard@outlook.com> 1787898618 +0800

refactor: 事件循环笔记按最新规范重写——DoDont 陷阱对照、追问链面试模式……`}</ShellBlock>
      <Paragraph>
        四行头部信息读作：<strong>tree 行</strong>——「这个时刻的全部内容在这里」；
        <strong>parent 行</strong>
        ——「我是从那个提交长出来的」（没有 parent 就是根提交，merge 提交则有两行）；
        <strong>author/committer 行</strong>
        ——谁、什么时候。仅此而已，没有任何魔法字段。
      </Paragraph>

      <Heading level={3} title="tag：第四种对象，给提交钉上的批注" />
      <Paragraph>
        <strong>tag</strong> 是四种对象里最不常被拆开看的一种：它是「指向另一个对象 +
        一段批注」的封装，典型用途是给发布锚定的那个 commit
        附上版本号、打签名的人和时间。注意对象模型里说的 tag 指 <strong>annotated tag</strong>（
        <code>git tag -a</code> 创建）——它自己就是一个可 <code>cat-file</code> 的对象；而轻量 tag（
        <code>git tag v0.0</code>）只是 <code>refs/tags/</code> 下一个直接指向 commit
        的指针文件，和分支文件同构，没有对象本体。真机拆开对比：
      </Paragraph>

      <ShellBlock>{`$ git tag -a v0.1 -m "release v0.1"

$ git cat-file -t v0.1
tag                                    ← v0.1 是一个「tag 对象」

$ git cat-file -p v0.1
object 8e56b172a1571e1c91b1cc58fc846889886614a4    ← 指向哪个 commit
type commit                                        ← 指向的对象类型
tag v0.1                                           ← tag 的名字
tagger dev <dev@example.com> 1788973952 +0800      ← 谁打的、何时

release v0.1

$ git tag v0.0                         # 轻量 tag 对照
$ git cat-file -t v0.0
commit                                 ← 没有对象本体，直接就是 commit`}</ShellBlock>
      <Paragraph>
        tag 对象让「版本」从分支的移动状态里独立出来：分支会前进，tag 对象一经创建就钉死在那个
        commit 上——发布历史因此有了不可变的锚点。批量看一个仓库的对象构成，{" "}
        <code>git cat-file --batch-all-objects --batch-check</code>{" "}
        能列出全部对象的类型与大小，四种类型一目了然。
      </Paragraph>
      <Callout kind="tip" title="签名 tag">
        <code>git tag -s</code> 创建 GPG 签名的 tag 对象：批注区域带上{" "}
        <code>-----BEGIN PGP SIGNATURE-----</code>
        ，任何人都能用发布者的公钥验证「这个版本确实是本人发布的」。发布不可变锚点 +
        可验证来源，这是 tag 对象区别于分支文件的全部意义。
      </Callout>

      <MemoryCard keyword="哈希即地址，快照即版本" color="#8b5cf6">
        <p>
          内容决定哈希，哈希决定地址：内容变 → 必然新对象；内容同 →
          必然复用。每次提交是一棵完整的指针树（快照），没变的文件引用旧对象（物理增量）。版本管理的一切操作——存、取、分支、同步——都建立在这条之上。
        </p>
      </MemoryCard>

      <Heading level={2} title="一次 commit 之后发生了什么" />
      <Paragraph>
        把 <code>git commit</code> 放到显微镜下，它只做四步写操作，没有遍历、没有全局计算：
      </Paragraph>

      <Timeline
        label="commit 写入流程 / commit pipeline"
        steps={[
          { label: "存新 blob", sub: "改动文件算哈希、zlib 压缩入库", color: "#1677ff" },
          { label: "生成新 tree", sub: "没变的条目直接复用旧 tree", color: "#8b5cf6" },
          { label: "写新 commit", sub: "指向新 tree + 上一个 commit", color: "#f59e0b" },
          { label: "改写分支", sub: "分支文件指向新 commit（41 字节）", color: "#3fb950" },
        ]}
      />
      <Paragraph>
        每一步的输出都是「新增几个小文件 + 改写一个 41
        字节的指针文件」。这套流程快到什么程度？它不检查远程、不比对历史、不整理目录——
        <strong>「快速提交」不是优化出来的，是流程里根本没有慢的步骤</strong>
        。顺带一提，工作区到对象库的桥叫 index（暂存区），它的本质是「下次提交那棵 tree 的草稿」——
        <code>git add</code> 就是把文件写入这份草稿。
      </Paragraph>

      <DoDont
        label="心智模型校准 / mental model"
        dont={{
          code: `# 直觉模型：Git 存的是「修改」
commit = 补丁包
取 v99 = v1 打 98 个补丁
改文件名 = 文件被「重新保存」了一遍
空目录想提交 → 加 .gitkeep 纯属 Git 有 bug`,
          note: "把 Git 当成 diff 存储器，所有现象都会显得像补丁式特例。",
        }}
        do={{
          code: `# 对象模型：Git 存的是「状态」
commit = 完整快照（复用未变对象）
取 v99 = 直接读 v99 的树，O(1)
改文件名 = tree 里换一行字，blob 不动
空目录 = 没有任何东西可指，自然不追踪`,
          note: "有了正确的模型，这些行为全是推论，无需死记。",
        }}
      />

      <DoDont
        label="海量小文件仓库 / loose objects"
        dont={{
          code: `# 数十万文件的仓库 + 高频提交，从不整理
$ ls .git/objects/00 | wc -l
2002                        # 每个两位目录下塞满小文件
# inode、目录项、open 调用全面吃紧`,
          note: "松散对象是「写路径最便宜」的设计，但读路径与文件系统迟早为海量小文件买单。",
        }}
        do={{
          code: `$ git gc            # 打包成 packfile + idx 索引
$ ls .git/objects/pack
pack-xxx.pack  pack-xxx.idx   # 几十万个对象收敛成两个文件`,
          note: "「日常松散、定期打包」是设计意图——写入永不整理，整理交给 gc（存储篇细讲）。",
        }}
      />

      <DoDont
        label="改代码前的对齐 / before edit"
        dont={{
          code: `# 上周 clone 的仓库，直接开工
$ vim app.ts && git commit -am "fix: ..."
$ git push
 ! [rejected] main -> main (fetch first)`,
          note: "远端早前进了新提交，你的提交和它分叉——内容寻址下这是两个必然不同的新对象。",
        }}
        do={{
          code: `$ git pull --rebase   # 先对齐再开工（或开工前 fetch）
$ vim app.ts && git commit -am "fix: ..."
$ git push             # 快进关系成立，一次推过`,
          note: "改之前先让本地 main 与远端对齐，避免制造注定要合并的分叉历史。",
        }}
      />

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "在一个已有提交的基础上，同一文件修改并提交 10 次，仓库里存了几份？",
            intent:
              "检验是否真正区分「快照模型」与「全量复制」——这是对象模型的第一道分水岭。注意口径：已有 1 个首次提交，再改 10 次。",
            a: "该文件逻辑上 11 个版本，物理上 11 个 blob 对象（首次提交 1 个 + 后续 10 次修改各 1 个），但不是 11 份完整拷贝。每次修改内容变化 → SHA-1 变化 → 生成新 blob，旧 blob 原样保留（这正是版本回溯的依据）；同时其余没改的文件一个新对象都不产生。仓库整体是 11 个 commit + 有变化的 tree + 11 个该文件的 blob，增长与「变化量」成正比，与项目大小无关。",
            bonus:
              "Git 后台还会把松散对象打包成 packfile，对相似 blob 做字节级 delta 压缩——11 个版本在磁盘上可能只有 1 份基准 + 10 份增量。这是存储层的透明优化，不改变「每版一个对象」的逻辑模型。",
            depth: 1,
          },
          {
            q: "为什么 Git 改名文件不用重新存储，而某些系统「另存为」就翻倍占空间？",
            intent: "考察 blob「内容与名字分离」的设计是否真的理解，能否迁移到自己的系统设计。",
            a: "因为 Git 里文件名的存储位置根本不在 blob 里。blob 只封内容的字节流，名字、路径、权限全部记录在 tree 的清单条目中——改名只是改 tree 里那一行（而 tree 本身也要按内容寻址，所以是新建一个小 tree 对象），内容对象的哈希纹丝不动，自然零拷贝。凡是把「名字 + 内容」绑定存储的系统，改名都等于产生一份新内容。",
            bonus:
              "这也解释了 Git 的 rename 检测为什么可靠：比较新旧 tree 时发现「同一个 blob 哈希换了名字挂载」，是精确匹配而非相似度猜测。",
            depth: 2,
          },
          {
            q: "两个内容完全相同的文件（比如各目录下的 LICENSE），Git 存几份？",
            intent: "检验「内容寻址 = 天然全局去重」这条性质的掌握程度，很多人答成两份。",
            a: "只存一份。哈希由内容唯一决定，两个文件的内容字节完全一致 → 哈希一致 → 指向同一个 blob 对象。两份「文件」只是两棵 tree 里各自有一行清单指向同一个地址。哪怕这两个文件在不同分支、不同目录、不同提交里，去重同样生效——对象库是全仓库共享的一张地址表。",
            bonus:
              "推论：想验证「某个内容在历史里出现过没有」，把内容 hash-object 一遍、拿哈希去 cat-file 查即可，不需要遍历任何历史。",
            depth: 2,
          },
          {
            q: "SHA-1 哈希理论上会碰撞吗？Git 为什么敢把它当地址用？",
            intent:
              "进阶题。区分「背过 SHA-1 有碰撞新闻」和「理解 Git 工程上如何消化碰撞风险」的人。",
            a: "会，但 Git 的用法让碰撞的实际风险低到可忽略。SHA-1 作为校验和已被攻破（能伪造同哈希的两个文件），但 Git 2005 年起就按「防蓄意攻击的签名」以外的用途使用它：对象地址同时受内容格式约束（blob 前有长度头、tree/commit 有结构），伪造碰撞成本极高；且 Git 早已默认用 SHA-1 的加强变体（碰撞检测版）计算对象哈希，并正在推进 SHA-256 仓库格式作为彻底的出路。",
            bonus:
              "对「寻址」而言，最重要的性质其实是单向性与确定性，而不是抗碰撞：地址由内容算出、同内容必得同地址，去重和寻址已经成立；碰撞只影响「不同内容被误判为相同」这一种极端情况。",
            depth: 3,
          },
          {
            q: "既然每次提交都是完整快照，为什么一个大仓库改 1000 次、提交 1000 次后，.git 目录并没有膨胀 1000 倍？",
            intent: "压轴题，检验能否把「快照 + 复用 + 打包」三层机制串成一条完整的存储链。",
            a: "三层机制层层削减。第一层：快照里未变化的文件只是引用，物理上不写——每次提交的增量正比于改动量，1000 次小改动只产生小对象流。第二层：tree 也按内容寻址，只有路径上有变化的目录才生成新 tree，未动的子目录整棵复用。第三层：松散对象会被 git gc 打包成 packfile，其中相似的历史版本做 delta 压缩，只存基准 + 增量。",
            bonus:
              "能说出「逻辑快照、物理增量」这个分层表述，再补一句 packfile 的 delta 只是存储优化、随时可无损还原成完整对象，就同时覆盖了正确性和工程直觉两层。",
            depth: 4,
          },
        ]}
      />

      <CrossRef
        notes={[
          {
            title: "reset --hard 丢弃的提交去哪了？",
            to: "/note/devtools/git/refs/branch-head",
            description:
              "「分支只是文件」配合本篇的对象图，让 rebase、reset、checkout 全部变成看图说话。",
          },
          {
            title: "同一文件为什么有时冲突有时不冲突？",
            to: "/note/devtools/git/merge/three-way-merge",
            description: "对象模型之上的图算法：merge-base 与三方对比如何裁决冲突。",
          },
        ]}
      />
    </NoteShell>
  );
}
