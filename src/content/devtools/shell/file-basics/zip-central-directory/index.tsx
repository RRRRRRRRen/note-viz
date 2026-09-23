import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  Callout,
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  SpecQuote,
} from "@/components/viz";
import { FlowChart, ShellBlock } from "@/components/demo";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        因为 zip 把一份「账本」记在包的末尾——<strong>中央目录</strong>，里面登记着每个文件的
        名字、原始大小、校验码和所在位置。<code>unzip -l</code> 看清单、单抽一个文件、增量更新，
        全都是先翻账本再精准定位，<strong>一个压缩字节都不用多解</strong>。这是 zip 和 tar.gz
        最大的结构差异：tar.gz 把所有文件串成一条压缩流，想看第 100 个文件的清单，必须把前 99
        个的字节顺序解压出来扔掉。代价也有一个：目录要回写在末尾，所以 zip
        做不了「边生成边压缩」的流式管道。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "gzip 命令行怎么用？",
            to: "/note/devtools/shell/file-basics/gzip-cli",
          },
        ]}
      >
        本篇反复对照 tar.gz 的「先打包、再压缩」两步流水线——gzip 只会压一串字节、打包归
        tar，这条心智模型先立住，zip 的结构选择才有参照系。
      </Prerequisite>

      <Heading level={2} title="包里长什么样：三段式结构" />
      <Paragraph>
        一个 zip 文件从上到下就三段：<strong>局部条目</strong>若干、<strong>中央目录</strong>一份、
        <strong>目录结束标记</strong>
        （EOCD）一个。每个要装进去的文件各自压缩成一段，前面挂一个局部头，
        登记自己的名字和大小；所有条目写完后，统一在文件末尾建中央目录，把每个文件再登记一遍——
        这次带上了「它在包里的位置」。最后以一个目录结束标记收尾。据 PKWARE 的 ZIP
        格式规范（APPNOTE.TXT），三段各有固定签名：
      </Paragraph>
      <SpecQuote source="PKWARE APPNOTE.TXT（.ZIP File Format Specification）">
        局部文件头签名 0x04034b50，中央目录文件头签名 0x02014b50，目录结束记录（EOCD）签名
        0x06054b50——三个值的前两字节都是字母 P、K（0x50 0x4b），即格式发明人 Phil Katz
        的姓名缩写，只是后两字节区分记录类型。
      </SpecQuote>
      <Paragraph>
        拿 <code>xxd</code> 看一个真实 zip 的头尾，两处 PK 签名肉眼可见：
      </Paragraph>
      <ShellBlock>{`$ xxd demo.zip | head -2
00000000: 504b 0304 0a00 0000 0000 14b2 2a5d 0000  PK..........*]..
00000010: 0000 0000 0000 0000 0000 0500 1c00 6465  ..............de
$ xxd demo.zip | tail -2
020f4410: 0100 0004 0000 0000 504b 0506 0000 0000  ........PK......
020f4420: 1f00 1f00 410a 0000 d739 0f02 0000       ....A....9....`}</ShellBlock>
      <FlowChart
        label="zip 三段结构与目录定位路径 / zip structure"
        data={{
          direction: "TB",
          nodes: [
            { id: "tail", label: "拿到文件 → 从尾部倒着找", color: PALETTE.gray },
            { id: "eocd", label: "EOCD（PK\\x05\\x06）：目录在哪、有几条", color: PALETTE.orange },
            {
              id: "cd",
              label: "中央目录（PK\\x01\\x02）：名字 / 大小 / CRC / 位置",
              color: PALETTE.purple,
            },
            {
              id: "entry",
              label: "局部条目（PK\\x03\\x04）：跳到 offset 直接解",
              color: PALETTE.blue,
            },
          ],
          edges: [
            { source: "tail", target: "eocd", label: "定位收尾标记" },
            { source: "eocd", target: "cd", label: "读出目录起始 offset" },
            { source: "cd", target: "entry", label: "按条目跳读" },
          ],
        }}
      />

      <Heading level={2} title="只看不解的能力，全部来自「目录在末尾」" />
      <Paragraph>
        解压器拿到 zip 后干的第一件事不是从头读，而是<strong>从文件尾部倒着找 EOCD</strong>——
        找到它，就拿到了中央目录的位置和条目数；翻完目录，每个文件在哪、多大、校验码多少全部就位。
        这个设计让 zip 天生长着一副「索引」：<code>unzip -l</code> 只读目录就交出清单，
        单抽一个文件就是查目录拿到 offset、跳过去只解那一段——和数据库先查索引再取行一个道理，
        从不扫全表。而 tar.gz 面对的是一条 gzip 压缩流，gzip 流不支持从中间开始解（只能顺着魔数
        一段段往后解），想知道第 30 个文件叫什么，必须把前 29 个的字节全部解出来扔掉。 同一批 750MB
        的日志文件，两种包的清单速度实测：
      </Paragraph>
      <CompareTable
        label="清单怎么读：查目录 vs 顺序解压 / listing access"
        left={{ title: "unzip -l 读 zip", color: PALETTE.green }}
        right={{ title: "tar -tzf 读 tar.gz", color: PALETTE.orange }}
        rows={[
          {
            aspect: "读什么",
            left: "包尾的中央目录（几 MB）",
            right: "整条压缩流（750MB 全解一遍）",
          },
          { aspect: "实测耗时", left: "0.004 秒", right: "0.077 秒" },
          { aspect: "访问模型", left: "索引点查", right: "全表扫描" },
          { aspect: "随包增大的趋势", left: "目录线性变大，数据无关", right: "耗时与包体积成正比" },
        ]}
      />
      <Paragraph>
        在解压速度高达 GB/s 量级的现代 CPU 上，绝对差距常被吃掉，但<strong>倍数是结构性的</strong>：
        包越大倍数越悬，换到慢 CPU 的服务器或网络盘上，「秒回」和「等半分钟」就是这两种格式。
      </Paragraph>

      <Heading level={2} title="打包模型对照：逐文件压缩 vs 整体流压缩" />
      <Paragraph>
        把两种格式并排放，差异的根源一目了然。tar.gz 是先把整个文件树
        <strong>串成一条长字节流</strong>， 再对整条流做一次
        DEFLATE——压缩器的滑动窗口能横跨文件边界，前面文件里出现过的词汇后面直接复用。 zip 是
        <strong>每个文件各自压缩</strong>成独立小段（用的同样是 DEFLATE，算法不分家），
        然后装订成册、末尾登记目录。直觉上「整体压」该更小，同一批 750MB 日志的实测却是：
        <code>demo.zip</code> 34,554,926 字节，<code>demo.tar.gz</code> 34,567,965 字节—— zip
        反而略小 0.04%。单个文件内部冗余已经压到极限时，「跨文件复用窗口」捡不到残羹， tar
        反还要垫条目头的开销。
        <strong>
          两种格式吃同一套压缩算法，压缩率差距通常在个位数百分比， 选型时别拿它当决定因素。
        </strong>
      </Paragraph>
      <DoDont
        label="压缩率选型 / compression myth"
        dont={{
          code: `# 教条：「整体压缩能跨文件复用字典，tar.gz 一定更小」
$ tar -czf demo.tar.gz demo/    # 34,567,965 字节
$ zip -r demo.zip demo/         # 34,554,926 字节，反而更小`,
          note: "同套 DEFLATE，压缩率差距个位数百分比，教条不可靠",
        }}
        do={{
          code: `# 按访问模型选型，压缩率实测说话
# 需要清单秒回 / 单抽 / 增量更新  → zip
# 需要管道流式（边导出边压缩）    → tar.gz`,
          note: "结构性能力差异才是选型依据，数字要实测",
        }}
      />

      <Heading level={2} title="代价：zip 走不了流式管道" />
      <Paragraph>
        目录记在末尾，意味着压缩时必须<strong>先知道所有文件各在哪，才能回头登记造册</strong>。
        所以「边生成边压缩」的管道写法 zip 做不了——
        <code>mysqldump mydb | gzip &gt; dump.sql.gz</code>
        这类流式场景永远是 gzip 的主场。方向反过来也一样：解压要回头翻目录、跳读任意条目，
        两件事都需要 seek，而管道是一条不可回退的字节河，所以 zip 也
        <strong>不能从管道里被解压</strong>：
      </Paragraph>
      <ShellBlock>{`$ cat demo.zip | unzip -          # 喂给 unzip 一条流
UnZip 6.00 of 20 April 2009, by Info-ZIP ...
Usage: unzip [-Z] [-opts[modifiers]] file[.zip] ...
                                  # 直接拒收（exit 10）：没有可 seek 的文件，一切免谈`}</ShellBlock>
      <Callout kind="tip" title="一句话记住两套格式的分工">
        zip 是「装订成册 + 末尾索引」——随机访问是它的主权，流式是它的软肋；tar.gz
        是「一条压缩的长河」——流式是它的主权，随机访问是它的软肋。两边swap不了。
      </Callout>
      <Paragraph>
        末尾目录还有一个日常红利：<strong>增量更新</strong>。改了包里某个文件，不用整体重打—— zip
        追加一个新的局部条目、改写中央目录那一行登记即可，其余文件的数据一个字节不动。 这也是 tar.gz
        做不到的：改一个文件意味着整条流重新压缩。
      </Paragraph>
      <Paragraph>
        这套「装订 + 索引」的结构还解释了一个常见现象：docx、jar、apk、epub
        这些后缀各异的东西，底层全是 zip——把后缀改成 .zip 或直接 <code>unzip -l</code>，
        目录就老实交代清单。实测一个手工构造的 docx 结构：
      </Paragraph>
      <ShellBlock>{`$ printf 'demo' > word/document.xml
$ printf 'x' > '[Content_Types].xml'
$ zip -qr fake.docx '[Content_Types].xml' word
$ file fake.docx
fake.docx: Microsoft Word 2007+   # file 认的是「zip 头 + 内部结构组合」
$ unzip -l fake.docx
        1  [Content_Types].xml
        0  word/
        4  word/document.xml`}</ShellBlock>
      <MemoryCard keyword="账本在包尾">
        中央目录登记位置，EOCD 从文件尾倒着找：清单、单抽、增量更新全靠查账本，
        压缩字节不动。数据放不了管道（要回写目录），压缩率与 tar.gz 打平——
        选型看访问模型，不看压缩率教条。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "unzip -l 列出清单，它读取的是包里的哪些字节？",
            intent: "热身题，筛选「把 zip 当黑盒」的人——清单能力必须能落到结构上。",
            depth: 1,
            a: "只读包尾的中央目录（以及定位它的 EOCD 记录），不碰任何局部条目的压缩数据。中央目录每条登记了文件名、原始大小、CRC32 和局部条目的位置，清单需要的字段全在这本账上。",
            bonus:
              "这也是为什么 zip 包可以被「裁剪」：只截取文件的末尾几十 KB，unzip -l 照样能报出全部清单——账本自洽，与数据在不在无关。",
          },
          {
            q: "zip 为什么敢把目录放在文件末尾？tar 为什么不敢？",
            intent:
              "考结构差异背后的历史约束——知道「目录在尾」不难，说清「为什么这样设计」才算懂。",
            depth: 2,
            a: "因为 zip 的使用场景默认「先写完、再登记」：所有条目落盘后位置确定，最后统一建目录，读的时候从文件尾倒找 EOCD 定位。tar 不行——它的血统是磁带机备份，介质只能顺序读写，根本回不了头，所以每个条目的元数据必须内联在数据前面，边读边解释。一个为随机访问介质而生，一个为顺序流介质而生，目录放哪只是这个出身差异的表象。",
            bonus:
              "gzip 流同样继承了顺序性：不支持从中间开始解。所以 tar -tzf 本质是把整条流顺序解压一遍——zip 与 tar.gz 的差距不是实现优劣，是介质假设不同。",
          },
          {
            q: "gzip 能用 cat a.gz b.gz >> all.gz 拼接追加，zip 行吗？",
            intent: "把前面 gzip 多 member 的知识迁移过来，考格式差异是否真正理解。",
            depth: 3,
            a: "不行。gzip 格式允许一个文件里装多段独立的压缩数据（多 member），解压器看到下一个魔数会自动接着解，所以压缩态拼接合法。zip 没有这个机制——它的追加是「记账式」的：zip 命令对已有包操作时，追加新局部条目、改写中央目录，等价于增量更新，而不是字节层面的随便拼接。拿 cat 硬拼两个 zip，得到的是一个只有前一个包的目录、后一段字节无人认领的坏包。",
            bonus:
              "格式上 zip 有「数据描述符」（通用标志位 bit 3）：先写占位头部、数据后面补登记，这是流式生成 zip 的基础——但即便生成可流式，消费端 unzip 仍要 seek，管道里照样解不了。",
          },
          {
            q: "cat demo.zip | unzip - 被 macOS 拒绝了（exit 10），这是 Apple 的锅吗？",
            intent:
              "细节陷阱题，考能不能区分「工具实现差异」和「结构必然」——类似 zcat 陷阱但结论相反。",
            depth: 3,
            a: "不是。unzip 不吃管道是结构必然：解压第一步要从文件尾倒找 EOCD、翻中央目录，之后按 offset 跳读任意条目——每一步都需要 seek，而管道是一条不可回退的字节河，想解就得把整条流先落盘。macOS 的 unzip 连 stdin 入口（- 参数）都不提供，直接吐 usage。这与 zcat 的 macOS 陷阱不同：那是 Apple 的历史遗留，这是谁实现都得遵守的结构约束。",
            bonus:
              "反方向（zip 流出去）是通的：unzip -p x.zip file | 下游命令 就是官方推荐的管道姿势——zip 只出不进，因为「读一个文件再输出」不需要回头 seek 整个包。",
          },
          {
            q: "磁盘只剩 1GB，来了一个解压后 10GB 的 zip，怎么取出里面 200MB 的那个文件？",
            intent: "场景题，考随机访问能力能否落到操作上——只会「全解」的人当场露馅。",
            depth: 4,
            a: "直接单抽：unzip big.zip path/to/file -d out/。zip 按条目独立存储，解压一个文件只需要它自己的压缩段加目标空间，与整个包的解压体积无关——10GB 只是所有条目加起来的账面数字。更省的方式是 unzip -p big.zip path/to/file | 下游命令，内容走管道不落盘。",
            bonus:
              "来路不明的包先 unzip -l 看账再动手：清单里的 uncompressed 总量能提前暴露 zip bomb（一个 581KB 的包申报解压 200MB 就该警惕），避免「取个文件」变成磁盘灾难。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "zip 命令行怎么用？",
            to: "/note/devtools/shell/file-basics/zip-cli",
            description: "查账本的能力落到手上：打包、解压、只看不解、增量更新的完整命令操作。",
          },
          {
            title: "Windows 压的 zip 为什么中文乱码？",
            to: "/note/devtools/shell/file-basics/zip-filename-encoding",
            description: "中央目录里登记的除了位置还有名字——名字的编码规则，是跨平台乱码的根源。",
          },
        ]}
      />
    </NoteShell>
  );
}
