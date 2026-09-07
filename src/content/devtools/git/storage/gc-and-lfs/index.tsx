import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo/FlowChart";
import { BarChart, CompareTable, DoDont, MemoryCard } from "@/components/viz";

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
count: 575        ← 575 个松散对象（独立小文件）
size: 2496        ← 共约 2.4 MB
in-pack: 0        ← 从未打包
packs: 0

$ ls .git/objects/
24/ 3d/ 9d/ ce/ e6/ ... info/ pack/     ← 哈希前两位做目录，剩下 38 位做文件名`}</ShellBlock>
      <Paragraph>
        575
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
count: 30        ← gc 前：30 个松散对象
size: 120

$ git gc         ← 后台大扫除

$ git count-objects -v | grep -E "count|in-pack|packs"
count: 0         ← 松散对象全部收纳
in-pack: 30      ← 30 个对象进了包
packs: 1         ← 只剩 1 个 packfile（+1 个 idx 索引）`}</ShellBlock>
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
            { id: "entry2", label: "所有 reflog 条目（默认 90 天）", color: "#1677ff" },
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
        抛弃（分支不再指着它）→ 仍被 reflog 指着 → 躺 90 天 → 条目过期 → 下一次 gc 物理删除。
        <strong>双重条件都满足才会真的丢</strong>——这就是「Git 里很难真正丢数据」的精确含义。
      </Paragraph>

      <MemoryCard keyword="逻辑删除 ≠ 物理删除" color="#1677ff">
        <p>
          branch -d、reset、rebase 抛弃的提交，只是从引用链上摘下来；只要 reflog
          未过期，随时能救回来。真正的删除 = reflog 过期 + gc
          修剪，两个条件缺一不可。反过来，想让机密文件彻底从仓库消失，光 revert 不够——历史里的旧
          blob 依然可达，必须改写历史（filter-repo）再让所有克隆重新同步。
        </p>
      </MemoryCard>

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
            "大文件出库（下一节的主角 LFS）",
            "构建产物绝不入库（.gitignore 前置）",
            "一个仓库一个领域，避免万物 monorepo",
            "历史臃肿后无法自愈——预防远便宜于治理",
            "git filter-repo 是事后手术，代价是全团队重克隆",
          ],
        }}
      />

      <Heading level={2} title="二进制文件：diff 没救，存储有解" />
      <Paragraph>
        二进制文件在 Git 里分两半说。<strong>diff：基本没救</strong>
        。Git 靠「内容里有没有 NUL 字节」判定二进制，然后只显示{" "}
        <code>Binary files a/x and b/x differ</code>。可以配 textconv
        让它转成文本再比（图片按尺寸/EXIF、docx 用 docx2txt），但线性文本 diff
        对二进制本质无意义，这只用于人类阅读。
        <strong>存储：delta 压缩对未压缩格式其实有效</strong>
        （字节级比对不认文本还是二进制），真正失效的是「已经压缩过的格式」——jpg/mp4/zip
        每版都是全新字节流。
      </Paragraph>
      <Paragraph>
        于是真正的大问题浮出水面：<strong>每个版本都是一个完整 blob</strong>
        。100 MB 的模型文件改 50 次 ≈ 5 GB
        进包；且对象库的「别人没有就必须传」原则（远程协作篇讲过），让每个新克隆的人都得拉下全部 5
        GB。社区方案思路高度一致——<strong>把大文件请出对象库</strong>：
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
      <Paragraph>
        <strong>Git LFS</strong>（Large File Storage）的做法：commit
        里只留一个小指针文本，真身放在外部内容服务器，checkout
        时按需下载、按哈希缓存去重。配套还有数据集场景的 <strong>DVC</strong>（Git 管元数据、S3
        等后端管数据）和 clone 侧的 partial clone。最有意思的是 LFS 的本质：它自己就是一个
        <strong>迷你内容寻址数据库</strong>——哈希寻址、指针引用、按哈希去重，和 .git/objects
        同构，只是把存储后端从 packfile 换成了 HTTP 服务。等于社区承认「巨型 blob
        不该住在提交图里」，但把 Git 的核心思想原样搬了过去。
      </Paragraph>

      <BarChart
        label="100MB 文件改 50 次的代价 / cost intuition"
        title="同一大文件两种管理方式的克隆体积（数量级直觉，非精确值）"
        items={[
          { label: "直接进 Git（50 个版本）", value: 5000, color: "#f85149", suffix: " MB" },
          { label: "Git LFS（按需拉取当前版）", value: 100, color: "#3fb950", suffix: " MB" },
        ]}
      />
      <DoDont
        label="大文件入库决策 / binary policy"
        dont={{
          code: `git add model_v3_final_final2.psd
git commit -m "update design"
# → 仓库永久多 200MB，每个克隆者买单
# → delta 压缩失效（psd 内部已压缩）
# → 后悔时 filter-repo 改写历史，全团队重克隆`,
          note: "大文件一旦入库就是永久负债：存储、克隆、filter 治理，处处付费。",
        }}
        do={{
          code: `# 超过几 MB、按版本演进的二进制 → LFS
git lfs install
git lfs track "*.psd" "*.mp4"     # 写进 .gitattributes
git add .gitattributes design.psd
# 偶发的小附件 → 网盘/对象存储发链接`,
          note: "先 track 再 add：LFS 靠 .gitattributes 识别文件类型，顺序反了就会漏网入库。",
        }}
      />
      <Paragraph>
        判断口诀收束本节：<strong>文本按行演进的进 Git</strong>（delta 友好、diff 有意义）；
        <strong>二进制大文件进 LFS 或对象存储</strong>；<strong>构建产物永远不进任何库</strong>
        （能随时重新生成的东西没有版本价值，只有垃圾价值）。
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
          {
            q: "Git LFS 为什么能解决大文件问题？它的本质是什么？",
            intent: "压轴题。检验能否识别 LFS 与 Git 对象库的同构性——这是整条内容寻址主线的回响。",
            a: "LFS 把大文件从提交图中剥离：仓库里只存一个小指针文件（SHA-256 哈希 + 大小），真身放在独立的内容服务器；checkout 时由 smudge 过滤器按指针的哈希去 LFS 服务器流式拉取，本地按哈希缓存去重。效果：.git 不膨胀、clone 不再连带全部历史版本的大文件、diff 也不再受无关二进制拖累。",
            bonus:
              "本质层面：LFS 就是一个迷你版内容寻址数据库——与 .git/objects 同构（哈希即地址、指针引用、天然去重），只是存储后端从本地 packfile 换成了 HTTP 服务。这说明「内容寻址 + 指针」不仅是 Git 的实现细节，而是可迁移的架构模式：DVC、Docker 镜像层、CAS 存储、IPFS 都在用同一套思想。",
            depth: 4,
          },
        ]}
      />

      <Heading level={2} title="下一步去哪" />
      <Paragraph>
        至此 Git 的五层模型闭环：对象（存什么）→ 引用（指什么）→ 合并（怎么汇合）→ 远程（怎么同步）→
        存储（怎么安放）。继续深挖的两个方向：一是把这套「内容寻址 + 不可变对象 +
        指针图」的思想迁移到别的系统——Docker
        镜像层、区块链、CRDT，你会发现它们都是同一个模式的不同化身；二是动手实验——本篇所有输出都来自临时目录里{" "}
        <code>git init</code> 出来的实验仓库，亲手做一遍比读十遍记得牢。
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
