import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  Callout,
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  OutputTimeline,
  ShortcutTable,
} from "@/components/viz";
import { ShellBlock, StepThrough } from "@/components/demo";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        高频动作就三组：<strong>压缩/解压</strong>用 <code>gzip -k</code>（保留原文件）与{" "}
        <code>gunzip</code>，拿不准就 <code>gzip -c 原文件 &gt; 新文件.gz</code> 走标准输出；
        <strong>只看不解</strong>交给 <code>zgrep</code> / <code>gunzip -c</code>（macOS 的 zcat
        只认 .Z，读 .gz 要用 gzcat）；<strong>打包目录</strong>是 tar 的活，<code>tar -czf</code>{" "}
        一条命令打包加压缩。最重要的安全常识：
        <strong>
          裸的 <code>gzip 文件名</code> 会删掉原文件
        </strong>
        ，只留 .gz。
      </Conclusion>

      <Heading level={2} title="压缩与解压：-c 是安全带" />
      <Paragraph>
        <code>gzip</code> 默认行为是<strong>原地替换</strong>：压完删原文件，只留
        .gz。批量操作服务器 日志前先想清楚要不要留原件。保留原文件有两条路：<code>-k</code>
        （keep）原地多留一份，或者
        <code>-c</code> 把压缩结果写到标准输出、由你重定向——后者全平台行为一致，是脚本里最稳的写法。
        用一个 57 万字节的文件走完整链路：
      </Paragraph>
      <ShellBlock>{`$ seq 1 100000 > big.txt          # 造一个约 57 万字节的文本
$ gzip -k big.txt                 # -k：保留原文件
$ ls -l big.txt big.txt.gz        # 588895 字节 → 212866 字节
$ gzip -l big.txt.gz              # 不解压，看账本
  compressed uncompressed  ratio uncompressed_name
      212866       588895  63.8% big.txt
$ zcat big.txt.gz | head -1       # macOS 会报错，见下节
$ gunzip -c big.txt.gz | wc -c    # 解压还原：588895 字节，一字不差
588895`}</ShellBlock>
      <DoDont
        label="压缩单个文件 / single file"
        dont={{
          code: `$ gzip access.log          # 原文件没了！
$ ls
access.log.gz`,
          note: "原地替换是默认行为，误删原件只能靠备份找回",
        }}
        do={{
          code: `$ gzip -k access.log       # -k 保留原件
$ gzip -c access.log > access.log.gz   # 或 -c 重定向，行为最可预期`,
          note: "脚本里统一用 -c，输出位置与文件名完全由你掌控",
        }}
      />

      <Heading level={2} title="级别 -1 到 -9：启发式，不是承诺" />
      <Paragraph>
        级别数字的含义是「压缩端肯花多大力气找冗余」，<strong>只影响压缩侧</strong>——解压速度与级别
        完全无关。但这串数字不是「越大必然越小」的保证：同一份 seq 生成的 57 万字节文本，macOS gzip
        的 <code>-1</code> 反而比 <code>-6</code>/<code>-9</code> 压得更小，而 Node zlib（同为
        DEFLATE 实现）在同一份数据上排序完全相反。级别是一组匹配策略的启发式参数，不同实现对不同数据
        各有胜负——<strong>要用哪一级发布，就用那一级实测</strong>。
      </Paragraph>
      <CompareTable
        label="级别怎么选 / level guide"
        left={{ title: "构建期 / 预压缩", color: PALETTE.green }}
        right={{ title: "实时 / 动态响应", color: PALETTE.orange }}
        rows={[
          { aspect: "典型级别", left: "-9（尽力压）", right: "-1 ~ -6（够用就收）" },
          {
            aspect: "理由",
            left: "压一次、分发千万次，压缩耗时无关紧要",
            right: "每个请求都要现压，CPU 是实打实的成本",
          },
          { aspect: "解压速度", left: "与级别无关", right: "与级别无关" },
          {
            aspect: "实例",
            left: "vite 构建产物 .gz / .br",
            right: "nginx gzip_comp_level 动态接口",
          },
        ]}
      />

      <Heading level={2} title="只看不解：z 系列，以及 macOS 的 zcat 陷阱" />
      <Paragraph>
        查压缩日志不必先解压出几百 MB 的临时文件——z 系列工具在<strong>管道里解压、用完即扔</strong>
        ：<code>zgrep "ERROR" app.log.gz</code> 直接在压缩文件里搜，
        <code>gunzip -c xx.gz | less</code> 分页翻看。但 macOS 用户会撞上一个经典报错：
        <code>zcat big.txt.gz</code> 报 <code>can't stat: big.txt.gz (big.txt.gz.Z)</code>——Apple
        自带的 zcat 是 compress 时代的遗产，它<strong>只认 .Z 后缀</strong>，看到 .gz 会固执地去找{" "}
        <code>xxx.gz.Z</code>。 解决方案：用 <code>gzcat</code>（macOS 专门提供的 gzip 版
        zcat）或直接 <code>gunzip -c</code>。
      </Paragraph>
      <ShellBlock>{`$ zgrep -n "^100000$" big.txt.gz     # 压缩文件里直接搜：行号 100000，内容 100000
100000:100000
$ gzip -t big.txt.gz && echo intact   # 只验校验码，不解压
intact
$ zcat big.txt.gz                     # macOS：翻车现场
zcat: can't stat: big.txt.gz (big.txt.gz.Z): No such file or directory
$ gzcat big.txt.gz | head -1          # gzcat 才是 macOS 上读 .gz 的 zcat
1`}</ShellBlock>
      <Callout kind="warning" title="Linux 与 macOS 的 zcat 不是同一个东西">
        GNU zcat 等价于 gunzip -c，直接读 .gz；Apple/BSD zcat 是 compress 的配套工具，只认
        .Z。跨平台 脚本里别依赖 zcat，用 <strong>gunzip -c</strong> 才是全平台一致的写法。
      </Callout>

      <Heading level={2} title="打包是 tar 的活：tar -czf 三件套" />
      <Paragraph>
        gzip 只会压「一串字节」，<strong>不会打包</strong>。想把整个目录变成一个文件，先 tar
        把文件树串成一串，再交给 gzip 压缩——tar 的 <code>-z</code> 旗子会自动替你调用 gzip，
        一条命令完成两步。三个动词记住：<code>-c</code> 创建、<code>-t</code> 看清单、
        <code>-x</code> 解开，全都配 <code>-z</code> 和 <code>-f 文件名</code>：
      </Paragraph>
      <ShellBlock>{`$ tar -czf demo.tar.gz demo/          # 打包 + 压缩
$ tar -tzf demo.tar.gz                # 只看清单不解压
demo/
demo/sub/
demo/a.txt
demo/sub/b.txt
$ tar -xzf demo.tar.gz                # 解开`}</ShellBlock>
      <Paragraph>
        两个容易混淆的点。<strong>其一</strong>：<code>gzip -r 目录</code>不是打包——它把目录里每个
        文件<strong>各自</strong>压成各自的 .gz，文件数量不变，只是每个都瘦了身；想要「一个文件装下
        整个目录」只能走 tar。<strong>其二</strong>：小文件打包压缩反而变大——两个 2 字节文本打成
        tar.gz 是 568 字节，tar 的块结构头部加 gzip 的固定开销（约 18 字节起）远超压缩收益， 这正是
        web 服务器对 1KB 以下文件不压缩的同一个道理。
      </Paragraph>
      <StepThrough
        label="往 .gz 追加内容 / append"
        steps={[
          {
            title: "起点：一份已压缩的日志",
            desc: "a.gz 里是 AAA,。今天又产生了一段 BBB. 想并进去。",
            color: PALETTE.gray,
          },
          {
            title: "错误直觉：解压→合并→重压",
            desc: "可行但笨重——历史数据要整体解压再重压，几 GB 的日志就灾难了。",
            color: PALETTE.red,
          },
          {
            title: "正确姿势：cat b.gz >> a.gz",
            desc: ".gz 格式允许一个文件里装多段独立压缩数据（多 member），直接把新段落以压缩态拼在后面。",
            color: PALETTE.blue,
          },
          {
            title: "结果",
            desc: "gunzip -c a.gz 输出 AAA,BBB.——历史字节一个没动，新内容顺序接上。日志滚动归档就是这么干的。",
            color: PALETTE.green,
          },
        ]}
      />

      <Heading level={2} title="看账与体检：gzip -l / -t / 管道压缩" />
      <Paragraph>
        <code>gzip -l</code> 不解压就能报出压缩前后的账目，而它报得出来，靠的正是 .gz
        文件尾部自带的元数据（ISIZE 原始长度、头部文件名）——机制详见格式篇。
        <code>gzip -t</code> 则空跑一遍校验码核对，下载大文件后验完整性比解压一遍便宜。
        管道压缩是大文件场景的杀手锏：导出数据库边导边压，磁盘上从头到尾只有压缩小文件。
      </Paragraph>
      <OutputTimeline
        label="gzip -l 输出逐行解读 / gzip -l explained"
        phaseColors={{ 压缩侧: PALETTE.orange, 原始侧: PALETTE.blue, 元数据: PALETTE.purple }}
        steps={[
          {
            output: "212866",
            phase: "压缩侧",
            why: "compressed：.gz 文件的实际字节数，头部 + DEFLATE 载荷 + 尾部的总和。",
          },
          {
            output: "588895",
            phase: "原始侧",
            why: "uncompressed：来自尾部 ISIZE 字段（原始长度 mod 2^32），解压器不用解压就能报出它。",
          },
          {
            output: "63.8%",
            phase: "压缩侧",
            why: "ratio：compressed ÷ uncompressed，seq 数字文本冗余密度一般，拿到六四开。",
          },
          {
            output: "big.txt",
            phase: "元数据",
            why: "uncompressed_name：压缩时嵌进头部的原文件名（FNAME 字段）——所以 gunzip 能还原文件名。",
          },
        ]}
      />
      <ShellBlock>{`$ mysqldump mydb | gzip > dump.sql.gz    # 边导出边压，不落中间盘
$ zgrep "INSERT" dump.sql.gz | head      # 压缩态直接搜`}</ShellBlock>
      <ShortcutTable
        label="gzip 常用旗子速查 / flags"
        rows={[
          { keys: ["-c"], desc: "结果写到标准输出，不动原文件——最安全的通用姿势" },
          { keys: ["-d"], desc: "解压（等价于 gunzip）" },
          { keys: ["-k"], desc: "压缩时保留原文件（keep）" },
          { keys: ["-t"], desc: "只验校验码不解压，测完整性" },
          { keys: ["-l"], desc: "列出压缩前后大小、比率与原文件名" },
          { keys: ["-n"], desc: "不嵌入时间戳与文件名——可复现构建必备" },
          { keys: ["-1", "-9"], desc: "最快到最小的级别区间，默认 -6；启发式非承诺" },
          { keys: ["-r"], desc: "递归压缩目录内每个文件（不是打包！）" },
        ]}
      />
      <MemoryCard keyword="拿不准就 -c">
        裸 gzip 会删原文件；-k 留原件、-c 走标准输出。tar 管打包、gzip 管压缩，gzip -r
        只是批量压缩不是打包。macOS 读 .gz 用 gzcat 或 gunzip -c，别用 zcat。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "手滑跑了裸 gzip，原文件还能找回来吗？",
            intent: "热身题考默认行为的后果意识——答「能找回」说明没理解原地替换删的是什么。",
            depth: 1,
            a: "基本找不回。gzip 压缩完成即删除原文件，这不是移到回收站，是文件系统层面的删除。理论上压缩前的内容完整包含在 .gz 里（gunzip 就能还原），所以数据没丢——丢的是「原文件」这个形态。预防手段：脚本里统一 -k 或 -c，alias gzip='gzip -k' 也是一招。",
            bonus:
              "顺带记住 gunzip 的对称行为：解压后默认删掉 .gz。想留压缩包同样用 gunzip -k 或 gunzip -c。",
          },
          {
            q: "macOS 上 zcat xx.gz 报 can't stat: xx.gz (xx.gz.Z)，是什么问题？",
            intent: "考跨平台工具差异的排查思路——错误信息里其实写着答案。",
            depth: 2,
            a: "Apple 的 zcat 是 compress 工具的配套品，只认 .Z 后缀：你给它 xx.gz，它固执地去找 xx.gz.Z，找不到就报 can't stat。报错括号里那个 .Z 结尾的路径就是它在找的文件。解决方案二选一：macOS 用 gzcat（gzip 版 zcat），跨平台脚本统一用 gunzip -c。",
            bonus:
              "Linux（GNU 工具链）的 zcat 等价于 gunzip -c，直接读 .gz——同一个名字两套行为，脚本里依赖 zcat 是隐藏炸弹。",
          },
          {
            q: "gzip -l 不解压怎么知道原始大小和文件名的？",
            intent: "把 CLI 行为连回文件格式——考是否知道元数据存在哪。",
            depth: 3,
            a: "元数据在压缩时就存进了 .gz 文件本体：尾部 8 字节里有 ISIZE 字段记录原始长度（mod 2^32），头部可选的 FNAME 字段记录原文件名。-l 只是读这几处字节做算术，全程不解压。推论：管道压缩（printf xxx | gzip）没有输入文件名，-l 报不出名字；ISIZE 是 32 位的，超过 4GB 的原始文件会显示溢出后的值。",
            bonus:
              "尾部还有 CRC32 校验码，gzip -t 验完整性用的就是它——-l 与 -t 的能力都来自格式设计，不是工具的魔法。",
          },
          {
            q: "-9 一定比 -1 压得小吗？",
            intent: "细节陷阱题，考有没有亲手对比过——背「数字越大压得越小」的人会翻车。",
            depth: 3,
            a: "不保证。级别是一组匹配策略的启发式参数，不是严格的优势排序：同一份 57 万字节的 seq 数字文本，macOS gzip -1 压到 208895 字节，-6 和 -9 都是 212866 字节——级别低的反而赢；而 Node zlib 对同一文件给出相反排序。两个实现都是合法 DEFLATE，只是策略参数不同、数据适性不同。结论：要用哪级发布就用那级实测，别按数字想当然。",
            bonus:
              "真正的跨级别收益差距通常在个位数百分比；与其死磕 -9，不如换成 brotli 这类下一代算法，差距立刻拉到 20% 以上。",
          },
          {
            q: "想往已压缩的 .gz 里加新内容，标准流程是什么？",
            intent: "考多 member 特性知不知道——大多数人只会解压重压一条路。",
            depth: 4,
            a: "直接 cat 新段落.gz >> 旧文件.gz 追加。gzip 格式允许一个文件里装多段独立压缩数据（member），解压器解完一段看到下一个 1f 8b 魔数会自动接着解——所以压缩态直接拼接完全合法，gunzip -c 输出按顺序首尾相连。历史字节一个不动，这是日志滚动归档的底层机制。注意代价：各 member 的压缩窗口互相隔离，拼接方案的压缩率略低于合并后重压。",
            bonus:
              "split + 按块压缩 + cat 拼接，是上世纪在磁带机上做增量备份的标准玩法——格式特性活了快四十年还没过时。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: ".gz 文件里都装了什么？",
            to: "/note/network/http/compression/gz-file-format",
            description: "-l 与 -t 的能力从哪来：头部、CRC 尾部与多 member 的逐字节解剖。",
          },
          {
            title: "文件类型由什么决定？",
            to: "/note/devtools/shell/file-basics/file-type-magic",
            description: "同知识面地基：拓展名、魔数与 Content-Type 三层身份判定。",
          },
        ]}
      />
    </NoteShell>
  );
}
