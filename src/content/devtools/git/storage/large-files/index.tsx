import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo/FlowChart";
import { BarChart, Callout, DoDont, Prerequisite, CrossRef } from "@/components/viz";
import { ShellBlock } from "@/components/demo/ShellBlock";

export default function Note() {
  return (
    <NoteShell>
      <Prerequisite
        notes={[
          {
            title: "git 的垃圾是怎么被回收的？",
            to: "/note/devtools/git/storage/gc-and-lfs",
          },
          {
            title: "origin/main 是远程上的分支吗？",
            to: "/note/devtools/git/remote/fetch-pull",
          },
        ]}
      >
        本篇的成本推导建立在「对象按内容寻址 + packfile delta 压缩 +
        同步按哈希集合求差」三层机制上。
      </Prerequisite>

      <Conclusion>
        大文件撑爆仓库是内容寻址模型的必然死角：<strong>diff 依赖行语义，二进制没有</strong>；
        <strong>delta 压缩靠公共字节段，已压缩格式每版字节全变</strong>；于是{" "}
        <strong>每个版本都是一个完整 blob</strong>，再乘上「别人没有就必须传」的同步原则——100 MB
        的文件改 50 次，每个克隆者都要为 5 GB 历史买单。出路是把大文件请出对象库：
        <strong>Git LFS</strong> 在仓库里只留三行指针文本、真身放内容服务器；数据集场景用{" "}
        <strong>DVC</strong>；clone 侧用 <code>--filter</code>{" "}
        部分克隆。已经入库的只有一条路：filter-repo 改写历史 + 全团队重克隆。
      </Conclusion>

      <Heading level={2} title="二进制在 Git 里的两半：diff 没救，存储看格式" />
      <Paragraph>
        先把「Git 存不了二进制」这个流行说法拆准。Git 判定文件是否二进制的方式很朴素：内容前 8000
        字节里有没有 NUL 字节。判定为二进制后，<code>git diff</code> 只会显示{" "}
        <code>Binary files a/x and b/x differ</code>——这不是偷懒，而是行级 diff
        算法的前提（按行切分、按行对齐）对二进制根本不成立：一行「字节」的粒度太细，两个版本之间几乎不存在「没变的行」。
        可以配 textconv 让 diff 前先转文本（图片比 EXIF/尺寸、docx 用
        docx2txt），但那只是给人类看的近似，存储层与此无关。
      </Paragraph>
      <Paragraph>
        存储这一半要分开说。packfile 的 <strong>delta 压缩是字节级的</strong>
        ，它不认文本还是二进制——决定效果的是相邻版本是否共享长段相同字节。未压缩格式（BMP、WAV、某些
        CAD 格式）改个头部，主体字节原样保留，delta 效果极好；而 jpg/mp4/zip/psd 这类
        <strong>内部已经压缩过的格式</strong>
        ，哪怕视觉上没改，重新导出一次整条压缩流就全部洗牌，delta
        找不到任何公共片段——退化成「每版存一份完整拷贝」。真正的死穴在这里，不在「二进制」三个字。
      </Paragraph>

      <Heading level={2} title="克隆税：每版一个完整 blob 的代价" />
      <Paragraph>
        内容寻址的去重靠「内容相同 →
        哈希相同」，但二进制大文件的每个新版本都是不同的内容，必然生成新 blob——
        <strong>逻辑快照、物理增量在它身上失效</strong>。100 MB 的模型文件改 50 次 ≈ 5 GB
        进包；而且对象库的同步原则是「远端报出它有的哈希，缺什么传什么」（fetch-pull
        篇讲过协商机制），<strong>去重救不了「别人根本没有」的对象</strong>——每个新克隆、每个 CI
        环境、每个新同事，都得把全部 5 GB
        拉下来。仓库一旦背上这份历史，它无法自愈：后续的删除只影响之后的版本，历史里的旧 blob
        依旧可达（GC 篇的可达性法则）。
      </Paragraph>

      <BarChart
        label="100MB 文件改 50 次的代价 / cost intuition"
        title="同一大文件两种管理方式的克隆体积（数量级直觉，非精确值）"
        items={[
          { label: "直接进 Git（50 个版本）", value: 5000, color: "#f85149", suffix: " MB" },
          { label: "Git LFS（按需拉取当前版）", value: 100, color: "#3fb950", suffix: " MB" },
        ]}
      />

      <Heading level={2} title="Git LFS：仓库里只留三行指针" />
      <Paragraph>
        <strong>Git LFS</strong>（Large File Storage）的机制：被 track 的文件在 commit
        时被一个干净的文本指针替换，真身按哈希存进独立的内容服务器；checkout 时 smudge
        过滤器按指针的哈希把真身下载回来，本地按哈希缓存去重。指针文件的格式出自 LFS
        规范，只有三行——下面是一个 12 MB 二进制（oid 与 size 为该文件的实际计算值）：
      </Paragraph>

      <ShellBlock>{`# .gitattributes 声明哪些路径走 LFS（必须先 track 再 add，顺序反了会漏网）
*.psd filter=lfs diff=lfs merge=lfs -text

# 仓库里实际存储的「文件」内容——三行文本指针：
version https://git-lfs.github.com/spec/v1
oid sha256:bc340bb394b0e991eccb19514aeac0bc620c71bc6ccbb62bb8e5a9e0ae2ada41
size 12582912`}</ShellBlock>
      <Paragraph>
        指针文本大约 130 字节，随提交图正常存储、正常 diff（改了哪版一目了然）；对象库里膨胀的{" "}
        <code>.git/objects</code> 变成了 LFS 服务器上按哈希寻址的存储条目。最有意思的是它的本质：LFS
        自己就是一个<strong>迷你内容寻址数据库</strong>——哈希即地址、指针引用、天然去重，与{" "}
        <code>.git/objects</code> 同构，只是后端从 packfile 换成了 HTTP 服务。等于社区承认「巨型
        blob 不该住在提交图里」，但把 Git 的核心思想原样搬了过去。
      </Paragraph>

      <FlowChart
        label="Git LFS 指针流 / lfs pointer"
        height={430}
        data={{
          direction: "TB",
          nodes: [
            { id: "commit", label: "仓库里：只有指针文件（SHA-256 + 大小）", color: "#1677ff" },
            { id: "lfsstore", label: "LFS 内容服务器：存真实大文件", color: "#f59e0b" },
            { id: "localgit", label: "你的 .git/objects：不膨胀", color: "#3fb950" },
            { id: "worktree", label: "checkout 时按需流式拉取 → 工作区", color: "#8b5cf6" },
          ],
          edges: [
            {
              source: "commit",
              target: "lfsstore",
              label: "指针 → 真身（按哈希取）",
              dashed: true,
            },
            { source: "commit", target: "localgit", label: "普通 blob：照旧入库" },
            { source: "lfsstore", target: "worktree", label: "smudge 过滤器下载" },
          ],
        }}
      />

      <Callout kind="warning" title="CI 是 LFS 最常见的翻车现场">
        LFS 的真身在 smudge 过滤器 checkout 时下载——CI 容器里没装 <code>git-lfs</code> 时，clone
        下来的是 130 字节的指针文本，构建时才报「文件太小/格式不对」。CI 镜像必须安装 git-lfs 并在
        clone 前执行 <code>git lfs install</code>（GitHub Actions 提供 <code>actions/checkout</code>{" "}
        的 <code>lfs: true</code> 选项）。
      </Callout>

      <Heading level={2} title="两条替代路线：DVC 与 partial clone" />
      <Paragraph>
        <strong>DVC</strong>（Data Version Control）面向数据集场景：Git 仓库里只存 <code>.dvc</code>{" "}
        元数据文件（记录数据文件的哈希与远端位置），数据本体推到 S3/GCS/SSH 等对象存储后端。它与 LFS
        的差别在定位：LFS 把「代码 + 大文件」当作同一个仓库的两种资产，托管平台原生集成；DVC
        把数据管线独立管理，适合几个 GB 起步、按目录整体版本化的 ML 数据集——本质同样是「Git
        管元数据指针，后端管数据」。
      </Paragraph>
      <Paragraph>
        <strong>partial clone</strong> 则是纯 Git 官方机制的路线：clone 时声明{" "}
        <code>--filter=blob:none</code>，先不下载任何
        blob，检出或查看时按需向远端补拉（需要服务端开启 <code>uploadpack.allowFilter</code>
        ）。临时仓库实测（源仓库含 3 个 5 MB 随机文件的不同版本）：
      </Paragraph>

      <ShellBlock>{`$ git clone --filter=blob:none --no-checkout file:///tmp/bigsrc part
$ cd part && du -sh .git
120K	.git                              ← 只有 3 commit + 3 tree，blob 全没来
$ git count-objects -v | grep in-pack
in-pack: 6

# 对照：完整克隆
$ du -sh /tmp/bigfull/.git
15M	.git                              ← 9 个对象：多出 3 个 5MB blob

$ git checkout main                       # 检出触发按需补拉
$ du -sh .git
15M	.git                              ← 当前版本的 blob 此刻才到`}</ShellBlock>
      <Paragraph>
        注意两个前提：
        <strong>
          必须走 <code>file://</code> 或真实网络协议
        </strong>
        ——本地路径 clone 会被 Git 降级为硬拷贝并忽略 filter（有 warning）；
        <strong>要配 --no-checkout</strong>
        ——clone 默认检出 HEAD，检出动作会把当前版本的 blob
        立刻按需拉下来，只有「先不检出」才能拿到那个 120K 的极小仓库。partial clone
        省的是「历史里的版本」和「你还没用到的文件」，对稀疏检出（sparse-checkout）的 monorepo
        是官方组合拳。
      </Paragraph>

      <Heading level={2} title="已经入库的大文件怎么清" />
      <Paragraph>
        大文件一旦进了历史，「删掉文件再提交」毫无用处——旧版本的 blob
        仍被旧提交指着，可达性法则保证它继续活在每个克隆里。 唯一的根治是<strong>改写历史</strong>：
        <code>git filter-repo --path 大文件 --invert-paths</code> （或 BFG
        Repo-Cleaner）把该文件的全部历史版本从每个提交中抹除，随后强推覆盖远端、所有协作者重新克隆。代价清单很长：全部哈希改变、挂着的
        PR 和 issue 引用失效、没来得及同步的本地克隆变成孤岛。所以决策口诀永远是预防优先：
        <strong>
          文本按行演进的进 Git；按版本演进的大二进制进 LFS
          或对象存储；能重新生成的构建产物什么都不进
        </strong>
        。
      </Paragraph>

      <DoDont
        label="历史清洗 / history cleanup"
        dont={{
          code: `$ git rm model_v7.bin
$ git commit -m "chore: 移除大文件"
$ git push
# 仓库并没有变小：旧版本的 blob 仍被历史提交可达，
# 每个克隆者照样拉全部 5 GB`,
          note: "删除只改「之后的版本」，可达性不变——这是 GC 篇「逻辑删除 ≠ 物理删除」在大文件场景的直接推论。",
        }}
        do={{
          code: `$ git filter-repo --path model_v7.bin --invert-paths
$ git push --force
# 通知团队：全部重新克隆，旧克隆作废`,
          note: "改写历史让旧 blob 不可达，之后的 gc 才可能回收；先备份再动手，hash 全变不可逆。",
        }}
      />

      <DoDont
        label="LFS 的适用边界 / what belongs in lfs"
        dont={{
          code: `$ git lfs track "*.ts" "*.json"
# 把源码交给 LFS：diff 失去行语义、每次检出多一次网络请求、
# 平台 UI 不再显示代码 diff，评审功能报废`,
          note: "LFS 文件没有内容 diff、没有行级评审——文本源码进 LFS 是纯倒退。",
        }}
        do={{
          code: `$ git lfs track "*.psd" "*.mp4" "*.blend"
# 按版本演进的大二进制才进 LFS；
# 偶发的小附件（<1MB、不再改动）→ 对象存储发链接更省`,
          note: "判断维度两个：是否二进制、是否按版本演进。二者同时成立才值得付 LFS 的集成成本。",
        }}
      />

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "Git 为什么没法像文本那样压缩二进制文件的历史版本？",
            intent:
              "热身题，检验能否把「delta 压缩是字节级」这个认知精确化，而不是笼统说「二进制压不动」。",
            a: "分两类：未压缩格式（BMP/WAV）其实压得动——packfile 的 delta 是字节级 diff，相邻版本共享的长段字节会被提取为基准 + 增量。真正失效的是内部已压缩的格式（jpg/mp4/zip/psd）：压缩流的设计目标是消除字节冗余，重新导出一次全部字节重排，delta 算法找不到公共片段，只能整份存储。所以准确的说法不是「二进制压不动」，而是「压缩过的格式压不动」。",
            bonus:
              "由此能推出一个工程技巧：必须入库的数值数据用未压缩或列存格式（如未压缩 CSV/Parquet）比 zip 打包后入库更省——前者能吃到 delta，后者每版全量。",
            depth: 1,
          },
          {
            q: "Git LFS 为什么能解决大文件问题？它的本质是什么？",
            intent: "检验能否识别 LFS 与 Git 对象库的同构性——这是整条内容寻址主线的回响。",
            a: "LFS 把大文件从提交图中剥离：仓库里只存一个小指针文件（SHA-256 哈希 + 大小的三行文本），真身放在独立的内容服务器；checkout 时由 smudge 过滤器按指针的哈希流式拉取，本地按哈希缓存去重。效果：.git 不膨胀、clone 不再连带全部历史版本的大文件、指针文本本身可正常 diff（能看到「哪一版换了哪个文件」）。",
            bonus:
              "本质层面：LFS 就是一个迷你版内容寻址数据库——与 .git/objects 同构（哈希即地址、指针引用、天然去重），只是存储后端从本地 packfile 换成了 HTTP 服务。「内容寻址 + 指针」是可迁移的架构模式：DVC、Docker 镜像层、CAS 存储、IPFS 都在用同一套思想。",
            depth: 2,
          },
          {
            q: "CI 上 clone 一切正常，构建时却报「模型文件只有 130 字节」，怎么回事？",
            intent:
              "实战场景题，LFS 在 CI 的翻车是最高频的线上事故，考察对 smudge 过滤器时机的理解。",
            a: "CI 环境没装 git-lfs（或没执行 git lfs install），clone 时 smudge 过滤器缺席，仓库里的 LFS 指针文本被原样检出——130 字节正是指针文件的大小。修复：CI 镜像安装 git-lfs，并在 checkout 之前初始化（GitHub Actions 用 actions/checkout 的 lfs: true；自建流程在 clone 前 git lfs install）。顺带确认 LFS 服务器的认证凭据在 CI 环境可用，否则 smudge 会以 404 的形式失败。",
            bonus:
              "git lfs ls-files 能列出哪些文件是 LFS 指针、哪些已检出（前面带 - 或 * 标记），是排查这类问题最快的一条命令。",
            depth: 2,
          },
          {
            q: "filter-repo 清完历史、强推之后，团队里每个协作者要做什么？为什么不能直接 pull？",
            intent:
              "压轴题，检验「改写历史 = 全员重克隆」背后的对象模型原因，以及事故处置的完整性。",
            a: "正确动作是删除本地克隆、重新 clone——不能 pull。filter-repo 改写了所有受影响提交的哈希，远端历史是一条全新哈希链；本地旧克隆的提交与新链没有任何公共祖先关系，pull 只会制造巨大的无意义合并或直接拒绝（divergent branches）。处置顺序：先作废泄露凭据（如果有）→ filter-repo → 强推 → 通知全员重克隆 → 旧克隆限期作废。历史改写只保证「之后的克隆干净」，挡不住已经拉取过的人手里那份。",
            bonus:
              "GitHub 上被清除文件的 PR 引用、缓存视图可能残留（官方有协助撤下的渠道）——托管平台的边缘缓存是 filter-repo 管不到的盲区。",
            depth: 3,
          },
          {
            q: "partial clone 既然是官方机制，为什么不默认开启？它和 LFS 是竞争关系吗？",
            intent:
              "进阶辨析题，考察对两种方案定位差异的理解——答「用 LFS 就行」说明没分清要解决的问题。",
            a: "不默认开启是因为它把成本转移到了运行时：每次检出、git log --stat、blame 都可能触发按需网络拉取，离线场景直接不可用——对「全量工作」的日常开发是负优化，只适合稀疏检出（sparse-checkout）的巨型 monorepo。它与 LFS 也不是竞争关系：partial clone 解决「历史里已有的大 blob 别急着下载」，LFS 解决「大 blob 根本不进对象库」。前者是拉取策略，后者是存储架构——大仓库实践中两者共存。",
            bonus:
              "promisor remote 是 partial clone 的底层概念：仓库声明「缺的对象可以找某个 remote 要」，补拉动作对用户透明，git log --filter=blob:none 还能只列提交不展开文件。",
            depth: 4,
          },
        ]}
      />

      <CrossRef
        notes={[
          {
            title: "git 的垃圾是怎么被回收的？",
            to: "/note/devtools/git/storage/gc-and-lfs",
            description: "可达性法则与 packfile 机制的本篇源头：为什么「删了」不等于「没了」。",
          },
          {
            title: "origin/main 是远程上的分支吗？",
            to: "/note/devtools/git/remote/fetch-pull",
            description: "克隆税的由来：同步按哈希集合求差，别人没有的对象必须传。",
          },
        ]}
      />
    </NoteShell>
  );
}
