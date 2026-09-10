import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  BarChart,
  CompareTable,
  CrossRef,
  DoDont,
  LayerStack,
  MemoryCard,
  Prerequisite,
  SpecQuote,
} from "@/components/viz";
import { ShellBlock } from "@/components/demo";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        因为 gzip 只会压缩<strong>一条字节流</strong>，而你要交付的往往是<strong>一个目录</strong>
        ：tar 负责把目录树连内容带元数据（名字、权限、时间戳）装订成一条流，gzip 再把这条流压小。
        <code>.tar.gz</code> 就是先装订、后压缩的两层套娃，解开时倒着剥。还有一件反直觉的事：tar
        自己不压缩，纯 <code>.tar</code> 打完包反而比原内容略大。
      </Conclusion>

      <Prerequisite
        notes={[
          { title: "gzip 命令行怎么用？", to: "/note/devtools/shell/file-basics/gzip-cli" },
          { title: "文件类型由什么决定？", to: "/note/devtools/shell/file-basics/file-type-magic" },
        ]}
      >
        本篇反复用到两块地基：gzip 的工作对象是「一条流」，以及「认文件先看魔数」。
      </Prerequisite>

      <Heading level={2} title="gzip 的能力边界：它眼里只有一条流" />
      <Paragraph>
        复习一下 gzip 的世界观，它极其单纯：<code>1F 8B</code>{" "}
        魔数开头，啃进一条字节流，吐出一条更小的字节流。除此之外它没有任何认识——目录、文件名、权限、修改时间，这些词在它的字典里统统不存在。上一章学过的多
        member 拼接能看出一点点弹性（多条 gzip
        流可以首尾相接），但那也只是「流和流拼接」，依然没有目录概念。
      </Paragraph>
      <Paragraph>
        现实需求却是：「把这个项目目录发出去」——十几个文件、嵌套层级、每个文件各带自己的元数据。这对
        gzip 是无从下嘴的一团。于是分工出现了：需要一个工具先把目录树<strong>摊平成一条流</strong>
        ，gzip 才有得压。这个活儿就是 tar 的。
      </Paragraph>

      <Heading level={2} title="tar：目录树的序列化" />
      <Paragraph>
        给一个前端味儿的对照：tar 之于文件系统，约等于 <code>JSON.stringify</code>{" "}
        之于内存对象——都是把一棵树序列化成一条线性产物。区别只在对象：
        <code>JSON.stringify</code> 吃内存里的对象树、产出字符串；tar 吃文件系统的目录树、产出
        <strong>一条字节流</strong>，解包就是反序列化。名字本身是 Tape Archive
        的缩写：磁带是顺序介质，只能从头读到尾，所以 tar
        从出生就长成一条从头到尾的顺序流——这个出身一句话解释了它的全部性格。
      </Paragraph>
      <Paragraph>
        关键在序列化范围：<strong>元数据一并进流</strong>
        。每个条目的名字、权限、属主、修改时间都写在流里，所以 <code>tar -tvf</code>{" "}
        不解包就能列出完整清单——清单不是猜出来的，是流里本来就写着：
      </Paragraph>
      <ShellBlock>{`$ tar -tvf demo.tar                # 只列清单，不碰包里的数据
drwxr-xr-x  0 demo  staff     0 Sep 10 22:18 app/
-rw-r--r--  0 demo  staff    22 Sep 10 22:18 app/README.md
-rw-r--r--  0 demo  staff    42 Sep 10 22:18 app/package.json
drwxr-xr-x  0 demo  staff     0 Sep 10 22:18 app/src/
-rw-r--r--  0 demo  staff    25 Sep 10 22:18 app/src/index.js`}</ShellBlock>
      <CompareTable
        label="tar 与 gzip 的分工 / division of labor"
        left={{ title: "tar：装订工", color: PALETTE.blue }}
        right={{ title: "gzip：压缩机", color: PALETTE.orange }}
        rows={[
          { aspect: "解决的问题", left: "目录树 → 一条流", right: "一条流 → 一条更小的流" },
          { aspect: "输入", left: "一棵目录树", right: "一条字节流" },
          { aspect: "元数据", left: "记录并在解包时原样还原", right: "完全不认识" },
          { aspect: "压缩", left: "不压缩", right: "DEFLATE 压缩" },
          { aspect: "典型产物", left: ".tar（常比原内容大）", right: ".gz" },
        ]}
      />

      <Heading level={2} title=".tar.gz：两层套娃，顺序不能反" />
      <Paragraph>
        两件工具串起来：先 tar 装订、再 gzip 压缩。顺序不能反的原因藏在输入类型里——gzip
        只吃「一条流」，而目录树还不是「一条」，必须先有 tar 这条流它才有得压。解开时倒着来：先剥
        gzip 壳还原出 tar 流，再拆装订。后缀倒着读就懂：
        <code>.tar.gz</code> = 先 <code>.tar</code> 后 <code>.gz</code>，剥的时候反着剥。
      </Paragraph>
      <LayerStack
        label=".tar.gz 剥壳视图 / onion view"
        layers={[
          {
            name: "gzip 压缩层（壳）",
            desc: "1F 8B 开头，整条 tar 流被 DEFLATE 压小",
            color: PALETTE.orange,
          },
          {
            name: "tar 装订层（流）",
            desc: "ustar 头部 + 数据块，一条从头到尾的字节流",
            color: PALETTE.blue,
          },
          {
            name: "文件内容 + 元数据",
            desc: "名字、权限、属主、时间戳，解包时原样还原",
            color: PALETTE.green,
          },
        ]}
      />
      <Paragraph>
        这个结构也解释了一个日常细节：图形界面解压软件打开 <code>.tar.gz</code>
        常要「解两次」——先得到 <code>.tar</code>
        ，再点一次才看到文件。因为那本来就是两种格式套在一起，不是一种格式。
      </Paragraph>
      <DoDont
        label="打包顺序 / order"
        dont={{
          code: "$ gzip demo/            # gzip 不认识目录，无从下手",
          note: "压缩的输入必须是一条流，目录树得先经 tar 摊平",
        }}
        do={{
          code: "$ tar -czf demo.tar.gz demo/    # 先装订后压缩，-z 只是糖衣",
          note: "一条命令完成两层，内部顺序依然是先 tar 后 gzip",
        }}
      />

      <Heading level={2} title="眼见为实：89 字节如何变成 5120 又变回 315" />
      <Paragraph>
        造一个三个文件共 89 字节的最小目录，走完整链路：<code>tar -cf</code> 打包得到 5120
        字节，gzip 后只剩 315 字节。先回答最反直觉的那件事——<strong>打包为什么反而变大</strong>
        ？开销花在三处：每个条目前一张 512
        字节的「元数据档案卡」、数据按固定块对齐补零、流末尾的收尾块。买 tar
        买的是「目录树变成一条流」的能力，不是变小。
      </Paragraph>
      <BarChart
        label="体积链 / size chain"
        items={[
          { label: "原始内容（3 个文件）", value: 89, color: PALETTE.gray, suffix: "字节" },
          { label: "打包 .tar", value: 5120, color: PALETTE.orange, suffix: "字节" },
          { label: "再压缩 .tar.gz", value: 315, color: PALETTE.green, suffix: "字节" },
        ]}
      />
      <Paragraph>
        拿 <code>xxd</code> 对准这个 <code>.tar</code>，序列化现场直接可见（ustar
        格式，节选关键三行）：
      </Paragraph>
      <ShellBlock>{`$ xxd app.tar
00000000: 6170 702f 0000 0000 0000 0000 0000 0000  app/............
00000060: 0000 0000 3030 3037 3535 2000 3030 3037  ....000755 .0007
00000100: 0075 7374 6172 0030 3072 656e 0000 0000  .ustar.00ren....`}</ShellBlock>
      <Paragraph>
        三个观察：第一行，流的最开头就是文件名 <code>app/</code> 的明文 ASCII（
        <code>61 70 70 2f</code>
        ），所以不解包就能列清单；<code>0x60</code> 行，<code>000755</code>，八进制权限也是明文；
        <code>0x100</code> 行，偏移 257（<code>0x101</code>）处躺着 <code>ustar</code>——这就是 tar
        的魔数，<code>file</code> 命令认出「POSIX tar archive」靠的就是它。
      </Paragraph>
      <SpecQuote source="IEEE Std 1003.1（POSIX）pax 工具规范 · ustar 头部">
        ustar 头部块的 magic 字段位于块内偏移 257 处，内容为 ustar\0，紧随的 version 字段为 00。
      </SpecQuote>
      <Paragraph>
        魔数藏这么深不是故弄玄虚：第一代 tar 格式根本没有魔数，后来标准化时只能在 512
        字节头部的既定布局里找空位，落在了第 257 字节。对照 gzip 的 <code>1F 8B</code> 堂堂正正在第
        1 字节——出生年代不同，格式习惯不同。
      </Paragraph>
      <DoDont
        label="期待 .tar 变小 / no compression"
        dont={{
          code: "$ tar -cf logs.tar big.log\n$ ls -l        # 比原文件还大了？！",
          note: "tar 只装订不压缩，变大是常态（头部卡 + 补零）",
        }}
        do={{
          code: "$ tar -czf logs.tar.gz big.log   # 压缩交给外挂 gzip",
          note: "要小就套压缩层；.tar 只负责「把一堆文件变成一件事」",
        }}
      />

      <Heading level={2} title="对照组：zip 为什么不用两步" />
      <Paragraph>
        zip 是「打包 + 压缩」一锅炖：格式内建目录结构理解，压缩算法焊死在格式里（deflate）。tar +
        gzip 是分工：tar 只管装订，压缩层完全可插拔——今天 <code>-z</code> 配 gzip，明天{" "}
        <code>-J</code> 配 xz，将来 <code>--zstd</code> 配
        zstd，装订产物不变，换压缩机不用换装订工。这是 Unix
        「每个工具只做一件事」的典型取舍，代价是你得理解两层结构。
      </Paragraph>
      <Paragraph>
        这套分工的现代身影到处都是：下载的源码包、<code>npm pack</code> 的 <code>.tgz</code>、
        <code>docker save</code> 导出的镜像包——里面每个镜像层还是一个
        tar，套娃的第三层。认识一层，处处都是它。
      </Paragraph>

      <MemoryCard keyword="tar 装订，gzip 压缩" color={PALETTE.blue}>
        gzip 只认一条字节流；tar 把目录树连元数据装订成那条流。.tar.gz = 先 tar 后
        gzip，解开时倒着剥；纯 .tar 不压缩，反而略大。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: ".tar.gz 的解压顺序是什么？为什么不能先解 tar？",
            intent: "热身题考两层结构是否真懂——背过命令但没理解套娃的人会在这里卡壳。",
            depth: 1,
            a: "先剥 gzip 壳还原出 tar 流，再拆装订取出文件。因为 gzip 的输入必须是一条字节流，而目录树还不是「一条」——得先由 tar 摊平成流它才有得压。后缀倒着读就记住了：.tar.gz = 先 .tar 后 .gz，剥的时候反着来。",
            bonus:
              "现代 tar -xf 一条命令完成两步剥：先偷看魔数认壳，自动调对应工具——顺序没变，只是工具替你走了。",
          },
          {
            q: "纯 .tar 打包后为什么比原内容还大？大在哪了？",
            intent: "考「打包 ≠ 压缩」是否真正落地——能用字节说出开销构成才算懂。",
            depth: 2,
            a: "开销来自三处：每个条目前 512 字节的元数据头部（名字、权限、属主、时间戳）、数据按块对齐补零、流末尾的收尾块。实测 89 字节的三个文件打包出 5120 字节。买 tar 买的是「目录树变一条流」，不是变小。",
            bonus:
              "gzip 能把 5120 压到 315，正是因为补零和重复模式是压缩算法最擅长吃掉的冗余——tar 无意中给 gzip 备好了粮。",
          },
          {
            q: "tar 和 zip 的本质区别是什么？",
            intent: "高频混淆点，考格式设计层面的理解而非「哪个好用」。",
            depth: 2,
            a: "zip 是打包 + 压缩一体：格式内建目录结构，压缩算法焊死（deflate）。tar + gzip 是分工：tar 只管装订成流，压缩交给外挂，所以压缩层可插拔——gzip、bzip2、xz、zstd 换个字母的事，zip 没这个自由。",
            bonus:
              "zip 的中央目录在文件末尾，支持随机访问单个文件；tar 是纯顺序流，只能从头读到尾——这是磁带出身的痕迹，也是容器镜像选它当层格式的原因之一：顺序流的读写逻辑最简单。",
          },
          {
            q: "不解包怎么知道 .tar.gz 里有哪些文件？依据是什么？",
            intent: "把 CLI 行为连回字节格式——考是否知道清单写在流里。",
            depth: 3,
            a: "tar -tvf。清单本来就在流里：tar 流的每个条目前面有一张头部块，文件名在其中是明文，顺序读完头部就能列出全部路径，一个数据块都不用碰。这和「文件类型看魔数」是同一条设计哲学——元数据就在字节里，工具只是读出来。",
            bonus:
              "同理 tar -xOf 包内路径 可以不解包直接打印包内某个文件——抠 docker 镜像包里的 manifest.json 就靠它。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "tar 命令行怎么用？",
            to: "/note/devtools/shell/file-basics/tar-cli",
            description: "分工懂了，三个动词 c/t/x 怎么使：五个够用命令与解包安检习惯。",
          },
          {
            title: ".gz 文件里都装了什么？",
            to: "/note/network/http/compression/gz-file-format",
            description: "外面那层压缩壳的逐字节解剖：魔数、头部与多 member。",
          },
          {
            title: "镜像怎么从构建机到部署机？",
            to: "/note/devtools/docker/registry/image-transport",
            description: "docker save 导出的就是这种 tar 包——套娃的第三层在 Docker 里。",
          },
        ]}
      />
    </NoteShell>
  );
}
