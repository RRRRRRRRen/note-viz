import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  Callout,
  CrossRef,
  DoDont,
  MemoryCard,
  MemoryMap,
  Prerequisite,
  SpecQuote,
} from "@/components/viz";
import { ShellBlock, StepThrough } from "@/components/demo";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        .gz 是一层轻薄的包装壳：<strong>头部</strong>最少 10 字节（魔数 <code>1f 8b</code>
        、压缩方法、 FLG 标志、MTIME 时间戳、可选的原文件名），中间是 <strong>DEFLATE 载荷</strong>
        ，<strong>尾部</strong>固定 8 字节（CRC32 校验 + 原始长度 ISIZE）——空输入压出来整整 20
        字节，一字节不多。 格式还规定「一个 .gz 可以装多段独立压缩数据（member）」，所以{" "}
        <code>cat a.gz b.gz</code> 拼接、往旧压缩包追加新段落都天然合法；CRC32 逐 member
        验收保证解压结果与原文逐字节一致。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "gzip 为什么能压小文件？",
            to: "/note/network/http/compression/gzip-deflate",
          },
        ]}
      >
        中间那段载荷是 DEFLATE 比特流——LZ77 加 Huffman 的产物；本篇拆的是它的包装壳。
      </Prerequisite>

      <Heading level={2} title="空输入压出来 20 字节：壳的固定成本" />
      <Paragraph>
        压缩一个空内容，得到的 .gz 恰好 20 字节——没有载荷可压，这 20 字节就是壳的全部固定开销。
        它解释了一个工程常识：小于 1KB 的文本不值得压缩，因为壳与码表的成本很容易吃掉压缩收益（43
        字节的小脚本压完变 45 字节）。逐字段看这 20 字节（来自 <code>printf '' | gzip | xxd</code>{" "}
        的真实输出）：
      </Paragraph>
      <MemoryMap
        label=".gz 空流字节布局 / gzip empty stream"
        regions={[
          {
            id: "head",
            title: "头部 · 10 字节",
            desc: "ID1 ID2 CM FLG MTIME×4 XFL OS",
            layout: "wrap",
            color: PALETTE.blue,
          },
          {
            id: "payload",
            title: "DEFLATE 载荷 · 2 字节",
            desc: "空输入也有块结构与结束标记",
            layout: "wrap",
            color: PALETTE.purple,
          },
          {
            id: "tail",
            title: "尾部 · 8 字节",
            desc: "CRC32 ×4 + ISIZE ×4",
            layout: "wrap",
            color: PALETTE.green,
          },
        ]}
        objects={[
          {
            id: "magic",
            label: "1f 8b",
            region: "head",
            fields: [{ name: "ID1/ID2", value: "魔数，gzip 身份证" }],
          },
          {
            id: "cm",
            label: "08",
            region: "head",
            fields: [{ name: "CM", value: "8 = DEFLATE，写死" }],
          },
          {
            id: "flg",
            label: "00",
            region: "head",
            fields: [{ name: "FLG", value: "无附加字段" }],
          },
          {
            id: "mtime",
            label: "87 b5 a2 6a",
            region: "head",
            fields: [{ name: "MTIME", value: "压缩时刻 Unix 秒" }],
          },
          {
            id: "xfl",
            label: "00",
            region: "head",
            fields: [{ name: "XFL", value: "压缩级别提示" }],
          },
          { id: "os", label: "03", region: "head", fields: [{ name: "OS", value: "3 = Unix" }] },
          {
            id: "defl",
            label: "03 00",
            region: "payload",
            fields: [{ name: "BFINAL+BTYPE", value: "空块 + 结束标记" }],
          },
          {
            id: "crc",
            label: "00 00 00 00",
            region: "tail",
            fields: [{ name: "CRC32", value: "空数据的校验和 = 0" }],
          },
          {
            id: "isize",
            label: "00 00 00 00",
            region: "tail",
            fields: [{ name: "ISIZE", value: "原始长度 mod 2^32 = 0" }],
          },
        ]}
        note="两个固定 4 字节零是尾部；MTIME 四字节每次压缩都不同——printf 不经文件名管道输入时，Apple gzip 也嵌入了当前时间。"
      />

      <Heading level={2} title="头部的两个彩蛋：FNAME 与 MTIME" />
      <Paragraph>
        FLG 是头部的能力开关位，置位就表示头部附带对应字段。最常见的是 <strong>FNAME</strong>——
        <code>gzip 文件名</code> 压缩本地文件时默认把原文件名嵌进头部，所以 <code>gunzip</code>{" "}
        能还原文件名。对比两个 hexdump：命令行压缩时 FLG 变成 <code>08</code>，紧跟的名字字节
        <code>6e 76 2d 66 ...</code> 正是「nv-fname.txt」的 ASCII：
      </Paragraph>
      <ShellBlock>{`$ printf '' | gzip | xxd            # 管道输入：FLG=00，无名无日期之外还嵌了时间
00000000: 1f8b 0800 87b5 a26a 0003 0300 0000 0000
$ printf '' | gzip -n | xxd         # -n：时间清零，不嵌名字
00000000: 1f8b 0800 0000 0000 0003 0300 0000 0000
$ seq 1 100 > nv-fname.txt && gzip -c nv-fname.txt | xxd | head -2
00000000: 1f8b 0808 87b5 a26a 0003 6e76 2d66 6e61  .......j..nv-fna
00000010: 6d65 2e74 7874 0015 9049 0100 410c 83fe  me.txt...I..A...`}</ShellBlock>
      <Paragraph>
        <strong>MTIME</strong> 是可复现构建的隐患：它嵌的是压缩那一刻的时间戳（据 RFC 1952 §2.3，
        「This gives the most recent modification time of the original file being compressed.」，
        MTIME = 0 表示无时间戳可用）。同一份源码，今天构建和明天构建产出的 .gz 字节不同——按内容寻址
        的缓存、对比构建产物的 CI 都会误判「文件变了」。解法是 <code>gzip -n</code>：时间清零、不嵌
        文件名，让「内容相同 ⇔ 字节相同」重新成立。npm 等生态发布 .tgz 时同样受此约束。
      </Paragraph>

      <Heading level={2} title="尾部 8 字节：解压结果的验收员" />
      <Paragraph>
        尾部两个字段是「逐字节一致」的保障机制。CRC32 是解压内容的校验和——解压器解完一段，对
        <strong>解出来的输出</strong>现场重算
        CRC32，与尾部存的值比对，差一个比特就报错退出、拒绝交出 结果；ISIZE 记录原始长度（mod
        2³²）做二次核对。<code>gzip -l</code> 能不解压报出原始大小、
        <code>gzip -t</code> 能只验完整性，读的都是这两个字段。
      </Paragraph>
      <SpecQuote source="RFC 1952 §2.3.2（GZIP file format specification version 4.3）">
        「This contains a Cyclic Redundancy Check value of the uncompressed data computed according
        to CRC-32 algorithm.」——CRC32 针对的是未压缩的原始数据，且由解压器现场重算比对，不是可选项。
      </SpecQuote>
      <Callout kind="warning" title="CRC32 防事故，不防攻击">
        CRC32 只有 4
        字节、线性可构造：蓄意篡改者可以同时改写数据和校验值让它对得上。它防的是传输翻转、
        截断、写坏这类<strong>意外</strong>，防不了恶意伪造——传输完整性由 TLS 负责，别把 CRC
        当安全机制用。
      </Callout>

      <Heading level={2} title="多 member：cat 拼接与日志追加为什么合法" />
      <Paragraph>
        .gz 格式允许多段独立压缩数据首尾相接装在同一个文件里，每段叫一个 member。这意味着{" "}
        <code>cat a.gz b.gz &gt; c.gz</code> 产出的文件完全合法，解压输出就是两段原文的顺序拼接；
        甚至可以往已有 .gz
        后面直接追加新的压缩段——历史字节一个不动。日志滚动归档「边产生边压进同一个
        .gz」的玩法，建立在这一点上。
      </Paragraph>
      <SpecQuote source="RFC 1952 §2.2（GZIP file format specification version 4.3）">
        「A gzip file consists of a series of 'members' (compressed data sets). The members simply
        appear one after another in the file, with no additional information before, between, or
        after them.」——多 member 是格式定义的一部分，不是工具的宽容。
      </SpecQuote>
      <StepThrough
        label="gunzip 读拼接文件的流程 / multi member"
        height={110}
        steps={[
          {
            title: "读头部：暗号对上了",
            desc: "开头两个字节 1f 8b 命中魔数，确认这是一段 gzip member，读 FLG 决定要跳过哪些可选字段。",
            color: PALETTE.blue,
          },
          {
            title: "解 DEFLATE 载荷",
            desc: "逐块解压比特流，边解边往输出缓冲区写。member 之间互相独立，第一段的字典进不了第二段的窗口。",
            color: PALETTE.orange,
          },
          {
            title: "验尾部：CRC32 + ISIZE",
            desc: "对解出的内容现场重算校验和、核对原始长度。不符 → 报 corrupt input、非零退出、拒绝输出。",
            color: PALETTE.purple,
          },
          {
            title: "探头：后面还有 1f 8b 吗？",
            desc: "有 → 这是个新 member，回到第一步接着解；没有 → 干净结束。cat 拼接的 c.gz 输出 AAA,BBB. 就是这么来的。",
            color: PALETTE.green,
          },
        ]}
      />
      <Paragraph>
        拼接合法，但有个代价要心里有数：每个 member 是独立压缩单元，
        <strong>LZ77 的窗口不跨 member</strong>
        ——两段里就算有大量重复内容也互相看不见。实测：先压再拼（两个 member）是 48
        字节，把同样的内容合并后压一次（单 member）只要 28 字节。拼接换来的从来不是压缩率，是
        <strong>追加能力</strong>与历史不可变性。
      </Paragraph>
      <ShellBlock>{`$ printf 'AAA,' | gzip > a.gz && printf 'BBB.' | gzip > b.gz
$ cat a.gz b.gz > c.gz && gunzip -c c.gz
AAA,BBB.                     # 拼接解压 = 原文顺序相连，逐字节一致
$ cat a.gz b.gz | wc -c      # 两个 member
48
$ printf 'AAA,BBB.' | gzip | wc -c   # 合并后单 member
28
$ cat b.gz >> a.gz && gunzip -c a.gz   # 追加日志模式：历史字节不动
AAA,BBB.`}</ShellBlock>
      <DoDont
        label="可复现构建 / reproducible build"
        dont={{
          code: `$ gzip dist/main.js     # 嵌入了构建时刻的 MTIME
# 同一份源码，两次构建的字节不同`,
          note: "内容寻址缓存、产物对比全部误判「文件变了」",
        }}
        do={{
          code: `$ gzip -n dist/main.js  # MTIME=0，不嵌文件名
# 内容相同 ⇔ 字节相同`,
          note: "据 RFC 1952：MTIME = 0 means no time stamp is available",
        }}
      />
      <DoDont
        label="往压缩日志追加新一天 / log rotation"
        dont={{
          code: `# 解压 → 合并 → 重新压缩
gunzip archive.gz
cat archive today.log > merged
gzip merged               # 历史数据全部重压`,
          note: "几 GB 的归档每次都要整体搬动，IO 与 CPU 双输",
        }}
        do={{
          code: `# 新一天单独压缩，压缩态直接追加
gzip -c today.log >> archive.gz`,
          note: "多 member 特性：历史字节一个不动，解压顺序输出",
        }}
      />
      <MemoryCard keyword="壳 = 头 + DEFLATE + 尾">
        头部 10 字节起（魔数 1f 8b、FLG、MTIME、可选 FNAME），载荷是 DEFLATE 流，尾部固定 8 字节
        （CRC32 + ISIZE）。member 相互独立——拼接与追加合法，但窗口不跨 member，压缩率略让。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "为什么 cat 拼起来的 .gz 能解压，而随便改一个字节就不行？",
            intent: "热身题，考「结构合法」与「内容完整」两层校验的区别。",
            depth: 1,
            a: "拼接是结构层面的合法操作：每段 member 的头尾完整、魔数各就各位，解压器解完一段看到下一个 1f 8b 就接着解第二段。而随手改字节破坏的是 DEFLATE 比特流或 CRC32——解压器要么解不出合法符号序列直接报错，要么解完了对不上校验和拒绝输出。前者问「结构像不像 .gz」，后者问「内容是否与压缩时逐字节一致」，两道关卡各自独立。",
            bonus:
              "这也是 gzip -t 能「只验不解」的原因：校验和解码在同一个流程里，验完丢弃输出即可，省的只是写盘。",
          },
          {
            q: "gunzip -t 和解压到 /tmp 再删掉，差别在哪？",
            intent: "考对「校验路径」的理解——两者校验相同，差异在 IO。",
            depth: 2,
            a: "校验完全相同：都要完整跑一遍 DEFLATE 解码并重算 CRC32，CPU 成本一样。差别只在 IO：-t 不写磁盘，解压再删则要把全部原始数据写出去再删掉——对几 GB 的归档，差的这段时间和磁盘写放大很可观。脚本里的完整性检查一律 -t。",
            bonus:
              "-t 的退出码就是脚本钩子：下载后 gzip -t xx.gz && 处理 || 重新下载，一行实现坏包重试。",
          },
          {
            q: "MTIME 字段是怎么把 CI 的缓存逻辑搞坏的？",
            intent: "考头部字段与工程实践的连接——能否从「字节不稳定」推到「内容寻址失效」。",
            depth: 3,
            a: "按内容寻址的缓存（构建产物哈希、镜像层、CDN 的 etag 类机制）默认「内容相同则字节相同」。MTIME 嵌的是压缩时刻，同一份源码两次构建产出的 .gz 字节不同，哈希全变，缓存全量失效——缓存命中率归零。解法是 gzip -n（时间清零、不嵌名字）；npm publish 的 .tgz、Docker 层等场景同理，都要锁死字节稳定性。",
            bonus:
              "验证方法：对同一文件间隔一分钟压两次 diff 一下，再用 -n 压两次 diff——前者的差异恰好落在 MTIME 那 4 个字节上。",
          },
          {
            q: "CRC32 校验能防止文件被恶意篡改吗？",
            intent: "安全意识题——分清「意外防护」与「恶意对抗」的量级差异。",
            depth: 3,
            a: "不能。CRC32 只有 4 字节且运算是线性的：攻击者改了数据后，可以精确算出「校验值该改成多少」让整体验证通过，成本几乎为零。它防的是无意图的损坏——传输位翻转、磁盘坏块、截断，这类事故撞上 4 字节校验和还能蒙混过关的概率约 2^-32，足够低。恶意对抗是密码学校验（如 SHA-256）和传输层（TLS）的职责。",
            bonus:
              "gzip 的安全实践结论：解压不可信来源的 .gz 时，CRC 只保证「和我声称的原文一致」，不保证「原文可信」——真正的防线在传输与签名层。",
          },
          {
            q: "拼接方案比单文件压缩大 20 字节，那什么时候该选拼接？",
            intent: "压轴题，考「压缩率之外的工程变量」——能不能说出不可变性与追加成本。",
            depth: 4,
            a: "看写入模式。静态归档、一次性分发：合并后单次压缩永远更小更优。流式追加场景（日志滚动、边产生边归档）：拼接是唯一不需要搬动历史的方案——新内容独立压缩追加在尾部，已写入的字节一个不动，追加成本 O(新数据) 而非 O(全量)。窗口不跨 member 造成的压缩率损失，对追加型场景是一笔值得付的保险费。",
            bonus:
              "反方向的专业玩法是 zstd：它的长距离匹配与「字典训练」能在类似场景下追回跨块冗余——这也是它统治现代日志管线（如 Kafka、ClickHouse）的原因之一。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "浏览器和服务器怎么协商压缩？",
            to: "/note/network/http/compression/content-negotiation",
            description:
              "这个文件格式走上 HTTP 之后：Accept-Encoding 声明、Content-Encoding 宣布与 Vary 缓存。",
          },
          {
            title: "gzip 命令行怎么用？",
            to: "/note/devtools/shell/file-basics/gzip-cli",
            description: "-l 与 -t 的实操：读尾部元数据与空跑校验的真实输出。",
          },
        ]}
      />
    </NoteShell>
  );
}
