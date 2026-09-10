import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo/FlowChart";
import { CompareTable, DoDont, MemoryCard, CrossRef } from "@/components/viz";
import { ShellBlock } from "@/components/demo/ShellBlock";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        Git 的存储分两层：<strong>日常写入</strong>时每个对象都是 <code>.git/objects/</code>{" "}
        下的独立小文件（松散对象），零整理成本，这是提交快的另一重原因；<strong>后台 GC</strong>{" "}
        时打包成 packfile、对相似对象做 delta 压缩（存一份基准 +
        若干增量），并按可达性修剪真正无主的对象。delta
        压缩是字节级的、与文本/二进制无关，它是存储优化，不改变「每版一个完整对象」的逻辑模型。checkout
        慢的根源从来不是解压，而是文件系统的逐文件操作——超大仓库的全部优化思路都是「少碰文件系统」。
      </Conclusion>

      <Heading level={2} title="松散对象：日常形态，快就快在从不整理" />
      <Paragraph>
        每次 <code>git commit</code> 产生的新对象，Git 的处理方式朴素到令人意外：zlib
        压缩、按哈希取前两位建目录、直接写成一个独立小文件。不排队、不合并、不重组——写完即返回。这是「提交快」在存储侧的另一半答案：
        <strong>写入路径上没有任何整理工作</strong>。
      </Paragraph>
      <Paragraph>看一个真实仓库的体量统计：</Paragraph>

      <ShellBlock>{`$ git count-objects -v
count: 774        ← 774 个松散对象（独立小文件）
size: 3484        ← 共约 3.4 MB
in-pack: 0        ← 从未打包
packs: 0
size-pack: 0      ← 完整输出还有 size-pack / prune-packable / garbage 等行
prune-packable: 0
garbage: 0
size-garbage: 0

$ ls .git/objects/
00/ 01/ 02/ 03/ 04/ 05/ 06/ 07/ ... info/ pack/   ← 哈希前两位做目录，剩下 38 位做文件名`}</ShellBlock>
      <Paragraph>
        774
        个小文件对文件系统毫无压力，但一个十万提交级仓库会积累数百万个松散对象——小文件本身会拖垮文件系统（inode、目录项、open
        调用全是开销）。所以 Git
        的设计是「日常松散、定期打包」：写入永远走最便宜的路，整理交给后台的 <strong>git gc</strong>
        （garbage collect）。
      </Paragraph>

      <Heading level={2} title="GC 的两件事：打包与修剪" />
      <Heading level={3} title="打包：delta 压缩登场" />
      <Paragraph>
        GC 把松散对象合并成一个 <strong>packfile</strong>（一个大数据包 + 一个 idx
        索引），打包时做第二层压缩——<strong>delta</strong>：在一群相似对象（比如同一文件的 10
        个历史版本）里选一个做基准，其余版本只存「相对基准的差异」。文件改 10 次，磁盘上可能是 1
        份完整 + 9 份增量。
      </Paragraph>
      <Paragraph>
        两个必须纠正的认知：<strong>第一</strong>，delta
        压缩是字节级的，跟文本/二进制无关——决定效果的是相邻版本是否共享长段相同字节。源码、未压缩格式（BMP/WAV）效果极好；jpg/mp4/zip
        这类压缩格式改一个字节整条压缩流重新洗牌，delta 找不到公共片段，效果差。
        <strong>第二</strong>，delta 只存在于 packfile 内部：随时可以无损还原出任何完整对象（
        <code>git cat-file</code> 就是这么工作的），「每版一个完整对象」的逻辑模型从未被破坏。
      </Paragraph>
      <Paragraph>真实打包实验：一个 200 行文本文件提交 10 个版本（每次追加一行改动）——</Paragraph>

      <ShellBlock>{`$ git count-objects -v | grep -E "count|size"
count: 33        ← gc 前：33 个松散对象
size: 132
size-pack: 0     ← grep "size" 还会带出 size-pack 与 size-garbage 两行
size-garbage: 0

$ git gc         ← 后台大扫除

$ git count-objects -v | grep -E "count|in-pack|packs"
count: 0         ← 松散对象全部收纳
in-pack: 33      ← 33 个对象进了包
packs: 1         ← 只剩 1 个 packfile（+1 个 idx 索引）
# 完整输出里 size-pack 也从 0 变为 4（KiB）——33 个对象压进 4 KB`}</ShellBlock>
      <Paragraph>
        10 个版本的对象最终只占一个包——其中就包含 delta 压缩的功劳。触发时机：松散对象数量超阈值（约
        6700 个）自动触发、push 时服务端打包、以及你手动 <code>git gc</code>
        。日常开发几乎感知不到它的存在——这正是设计意图。
      </Paragraph>

      <Heading level={3} title="修剪：提交什么时候才真的消失" />
      <Paragraph>
        GC 的第二件事是<strong>物理删除</strong>。删除的判定标准不是「你执行了删除命令」，而是
        <strong>可达性</strong>：从三类入口出发顺着指针走——
      </Paragraph>

      <FlowChart
        label="对象生死判定 / reachability"
        height={360}
        data={{
          direction: "TB",
          nodes: [
            { id: "entry1", label: "所有引用：分支 / 标签 / 远程书签", color: "#8b5cf6" },
            {
              id: "entry2",
              label: "所有未过期 reflog 条目（可达 90 天 / 不可达 30 天）",
              color: "#1677ff",
            },
            { id: "entry3", label: "当前 index（暂存区）", color: "#3fb950" },
            { id: "scan", label: "gc：从三个入口遍历", color: "#f59e0b" },
            { id: "alive", label: "可达 → 留下（可打包，不删除）", color: "#3fb950" },
            { id: "dead", label: "不可达 → 修剪：物理删除", color: "#f85149" },
          ],
          edges: [
            { source: "entry1", target: "scan", dashed: true },
            { source: "entry2", target: "scan", dashed: true },
            { source: "entry3", target: "scan", dashed: true },
            { source: "scan", target: "alive" },
            { source: "scan", target: "dead" },
          ],
        }}
      />
      <Paragraph>
        把引用系统篇的 reflog 保险串起来，一次「事故提交」的完整生命周期是：被 reset
        抛弃（分支不再指着它）→ 成为不可达，reflog 里的记录默认再保 30 天（
        <code>gc.reflogExpireUnreachable</code>；仍被引用指着的提交走 90 天档）→ 条目过期 → 下一次
        gc 物理删除。<strong>双重条件都满足才会真的丢</strong>——这就是「Git
        里很难真正丢数据」的精确含义。
      </Paragraph>

      <MemoryCard keyword="逻辑删除 ≠ 物理删除" color="#1677ff">
        <p>
          branch -d、reset、rebase 抛弃的提交，只是从引用链上摘下来；只要 reflog
          未过期，随时能救回来。真正的删除 = reflog 过期 + gc
          修剪，两个条件缺一不可。反过来，想让机密文件彻底从仓库消失，光 revert 不够——历史里的旧
          blob 依然可达，必须改写历史（filter-repo）再让所有克隆重新同步。
        </p>
      </MemoryCard>

      <DoDont
        label="清理对象库 / housekeeping"
        dont={{
          code: `# .git 目录太大，手动「清理」
$ rm -rf .git/objects/ab .git/objects/pack
# → 历史对象缺失，仓库从此 fsck 报损、
#   checkout 旧版本报错，基本只能重新克隆`,
          note: "对象库里没有「垃圾文件」可手删——每个对象都被哈希索引着，删任意一个都是挖仓库的地基。",
        }}
        do={{
          code: `$ git count-objects -v      # 先看松散对象数量
$ git gc                    # 打包 + 修剪不可达对象（受 reflog 保护）
$ git gc --prune=now        # 确认不要 reflog 后悔药时的激进修剪`,
          note: "清理只有一条正路：让 gc 自己判断可达性。--prune=now 会连 reflog 时间窗一起放弃，慎用。",
        }}
      />

      <DoDont
        label="敏感文件的事后处理 / leaked secrets"
        dont={{
          code: `$ git rm credentials.env
$ git commit -m "fix: 移除密钥文件"
$ git push
# → 最新版本干净了，但历史里那个 blob 仍可达，
#   checkout 旧版本即可原样取回密码`,
          note: "删除只影响之后的版本；可达性不变，历史里的对象一个字节都不会少。",
        }}
        do={{
          code: `# ① 先作废泄露的凭据（改密码/换 key），再做 Git 侧清理
$ git filter-repo --path credentials.env --invert-paths
$ git push --force
# ② 通知所有协作者重新克隆`,
          note: "改写历史让旧 blob 不可达，下一次 gc 才可能物理删除；凭据作废永远排在清理前面。",
        }}
      />

      <Heading level={2} title="checkout 的真实成本模型" />
      <Paragraph>
        「频繁切换分支会不会把 CPU/磁盘搞坏」——不会，因为 checkout 有一个前置步骤：
        <strong>先对比当前与目标的 tree，只重写有差异的文件</strong>。100 个文件的仓库切到只差 2
        个文件的分支，Git 只解压重写那 2 个，其余 98 个原地不动。日常切分支的实际成本正比于
        <strong>两棵树的差异</strong>，不是项目大小——「频繁
        checkout」不等于「频繁全量重建」，又是同一个主题：靠哈希对比跳过所有没变的东西。
      </Paragraph>
      <Paragraph>
        就算真的要大量物化文件，成本结构也和你直觉的不同。zlib 解压单核几百 MB/s，真正的大头是
        <strong>每个文件的系统调用链</strong>（open/create/write/close、目录元数据更新，Windows
        上还有杀毒扫描）。证据是业界优化超大仓库（Chromium 级，千万文件、数百 GB
        历史）时，没有一家在做「解压加速」，方向清一色是「少碰文件系统」：
      </Paragraph>

      <CompareTable
        label="超大仓库的解法 / monorepo"
        left={{
          title: "sparse-checkout：少检出",
          color: "#3fb950",
          points: [
            "工作区只物化你需要的子目录",
            "对象库仍然完整（历史都在）",
            "checkout 只写选中的那部分文件",
            "Chromium / Android 团队的日常形态",
            "配 partial clone：连用不到的 blob 都不下载",
          ],
        }}
        right={{
          title: "治本：别让仓库变大",
          color: "#f59e0b",
          points: [
            "大文件出库（LFS / 对象存储，见大文件专篇）",
            "构建产物绝不入库（.gitignore 前置）",
            "一个仓库一个领域，避免万物 monorepo",
            "历史臃肿后无法自愈——预防远便宜于治理",
            "git filter-repo 是事后手术，代价是全团队重克隆",
          ],
        }}
      />

      <Heading level={2} title="与大文件问题的交界" />
      <Paragraph>
        本篇的成本模型还能推出大文件问题的根源：内容寻址按「内容是否相同」去重，二进制大文件的每个版本都是全新字节流——既没有
        blob 复用，delta 压缩对已压缩格式（jpg/mp4/zip 每版字节全变）也几乎失效，于是{" "}
        <strong>每个版本都是一个完整 blob 进包</strong>
        ，再乘上「别人没有就必须传」的同步原则，克隆体积随历史线性膨胀。
      </Paragraph>
      <Paragraph>
        解法是把大文件请出对象库——Git LFS 的指针文件机制、数据集场景的 DVC、clone 侧的{" "}
        <code>--filter</code> 部分克隆，以及已经入库后的 filter-repo
        清史手术，这些是另一条完整的故事线，全部在大文件专篇展开。本篇剩下的部分回答纯 Git
        侧的问题：对象何时打包、何时被物理删除。
      </Paragraph>

      <Heading level={2} title="追问链" />
      <QAChain
        items={[
          {
            q: "git gc 会不会把我没提交的工作区改动删掉？",
            intent: "热身题，检验对 GC 作用范围的理解——它管对象库，不管工作区。",
            a: "不会。GC 的工作对象是 .git/objects 里的对象，工作区和 index 是它的「保护对象」而不是清理对象：可达性入口之一就是当前 index，暂存过的内容 gc 必然保留；工作区里未 add 的文件根本不在对象库里，与 gc 无关。gc 能删的只有「三个入口都不可达」的对象，你的工作内容几乎总能从 index 或 reflog 追溯到。",
            bonus:
              "唯一理论例外：git stash 的悬挂暂存超过默认保留期后会被清——stash 本质是 commit 对象，可达性靠 stash 引用维持，drop 掉又过期的 stash 才真正无主。",
            depth: 1,
          },
          {
            q: "为什么 Git 对文本文件的存储效率这么高？说出一层以上的原因。",
            intent: "检验能否分层作答：对象级去重与包级 delta 是两个独立机制。",
            a: "至少两层。第一层（逻辑）：内容寻址的天然去重——没改的文件哈希不变、直接复用旧 blob，每次提交只新增变化部分；相同的文本（LICENSE、模板、依赖声明）全仓库只存一份。第二层（物理）：gc 打包时对相似 blob 做 delta 压缩，同一文件的多个历史版本只存一份基准加若干增量。两层叠加，源码仓库的增长率通常远低于「每次改动的工作量」。",
            bonus:
              "zlib 还会吃掉一层：源码文本压缩比通常 2-4 倍，这是与内容无关的通用压缩，打包前后都在生效。",
            depth: 2,
          },
          {
            q: "频繁切换分支对 CPU 和磁盘压力大吗？成本到底花在哪？",
            intent:
              "检验能否推翻「全量重建」的直觉，建立「差异物化 + 系统调用主导」的正确成本模型。",
            a: "压力很小，因为 checkout 只物化两棵 tree 的差异：先对比当前与目标，只有哈希不同的文件才解压重写，日常切分支通常只动几个文件。成本大头不是解压（zlib 单核几百 MB/s），而是逐文件的系统调用——文件多才慢，单个文件解压极快。回到「Git 快靠不做无关工作」：切分支快不是因为解压优化好，是因为绝大多数文件根本不碰。",
            bonus:
              "极端案例（千万文件级 monorepo）的官方解法 sparse-checkout + partial clone 全是「减少碰文件系统的数量」，从侧面证明瓶颈永远在文件系统操作而不在解压。",
            depth: 2,
          },
          {
            q: "误提交了一个带密码的文件后来删掉了，仓库还安全吗？",
            intent: "安全题。检验「逻辑删除 vs 物理删除」的理解能否落地到安全事故处置。",
            a: "不安全。后续的删除只是让最新版本不含密码，历史里那个 blob 完好可达（旧提交还指着它），任何有仓库的人 checkout 旧版本就能拿到。彻底清除需要改写历史：git filter-repo 抹掉该文件的全部历史版本 → 强推覆盖远端 → 所有协作者重新克隆 → 立刻作废泄露的密码。最后一步与 Git 无关，但最重要——历史改写只保证「新克隆看不到」，挡不住已经拉取过的人。",
            bonus:
              "BFG Repo-Cleaner 是 filter-repo 的替代品；GitHub 对敏感数据还有官方协助渠道（撤下缓存视图）。事故处置的优先级永远是：先作废凭据，再清理历史——历史清理慢一步没关系，密码泄露多一刻都是事故。",
            depth: 3,
          },
        ]}
      />

      <CrossRef
        notes={[
          {
            title: "仓库为什么被几张大文件撑爆？",
            to: "/note/devtools/git/storage/large-files",
            description:
              "delta 救不了的二进制大文件：LFS 指针机制、DVC、partial clone 与清史手术。",
          },
          {
            title: "git 为什么不存 diff：内容寻址怎么做的？",
            to: "/note/devtools/git/object-model/content-addressing",
            description: "GC 修剪与打包的对象从哪来：blob/tree/commit/tag 的物理形态。",
          },
        ]}
      />
    </NoteShell>
  );
}
