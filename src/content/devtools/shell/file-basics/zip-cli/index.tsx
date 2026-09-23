import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  Callout,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  ShortcutTable,
} from "@/components/viz";
import { ShellBlock } from "@/components/demo";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        日常就四组动作：<strong>打包</strong> <code>zip -r x.zip 目录/</code>（<code>-r</code>{" "}
        绝不能省）；<strong>解压</strong>三姿势 <code>unzip x.zip</code>、<code>-d 目标目录</code>、
        指包内路径单抽；<strong>只看不解</strong>四件套 <code>-l</code> 清单、<code>-p</code> 内容、
        <code>zipgrep</code> 搜索、<code>-t</code> 验完整性；<strong>增量维护</strong> 直接{" "}
        <code>zip x.zip 文件</code> 追加或更新、<code>zip -d</code> 删条目。
        安全常识四条：打包不删原文件、解压保留 .zip、撞同名先问不覆盖、陌生包先{" "}
        <code>unzip -l</code> 看账再解。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "zip 为什么能只看清单不解压？",
            to: "/note/devtools/shell/file-basics/zip-central-directory",
          },
        ]}
      >
        本篇每个命令的能力都来自 zip 的「末尾中央目录」结构——为什么清单秒回、为什么能单抽、
        为什么能增量更新，机制在原理篇。
      </Prerequisite>

      <Heading level={2} title="打包：-r 不能省，坑是静默的" />
      <Paragraph>
        zip 对目录的默认行为是「说什么装什么」——目录条目本身不是文件，所以不带 <code>-r</code>{" "}
        时它只把 <code>demo/</code> 这个条目登记进去就收工。 阴险之处在于<strong>全程不报错</strong>
        ，退出码还是 0：
      </Paragraph>
      <ShellBlock>{`$ zip demo.zip demo
  adding: demo/ (stored 0%)     # 「成功」了——包里只有一个空的目录条目
$ unzip -l demo.zip
        0  demo/                # 文件一个没进，包大小 22 字节
$ zip -r demo.zip demo         # 正确姿势：-r 递归进去捞文件
  adding: demo/
  adding: demo/sub/
  adding: demo/sub/b.txt
  adding: demo/a.txt`}</ShellBlock>
      <DoDont
        label="打包目录 / archive a directory"
        dont={{
          code: `$ zip demo.zip demo        # 忘了 -r
  adding: demo/ (stored 0%)   # 不报错，静默生成空包`,
          note: "退出码 0，脚本检查不出来，只有解开才发现是空的",
        }}
        do={{
          code: `$ zip -r demo.zip demo   # -r 递归，目录里所有文件入包
$ unzip -l demo.zip      # 打包完顺手看一眼清单核对条目数`,
          note: "zip 的哲学是你说什么我装什么，目录必须显式 -r",
        }}
      />
      <Paragraph>
        <code>-r</code> 还有一件必须主动做的事：<strong>排除垃圾文件</strong>。macOS 的 Finder
        会在目录里留下 <code>.DS_Store</code>（视图缓存），<code>zip -r</code>{" "}
        会原样打包（实测清单里赫然在列），发给同事前用 <code>-x</code> 排除。更隐蔽的是{" "}
        <code>._</code> 开头的影子文件——带 Finder 资源属性的文件经 Finder 或 <code>ditto</code>{" "}
        风格打包时，资源信息会变成 <code>._a.txt</code> 这类条目混进包里（实测同一个目录：
        <code>zip -r</code> 打出 5 个条目，<code>ditto -c -k</code> 打出 9 个）。发代码和文本，用{" "}
        <code>zip -r</code> 加排除，别用 Finder 右键压缩。
      </Paragraph>
      <ShellBlock>{`$ zip -r project.zip project/ -x "*.DS_Store"
  adding: project/src/app.js      # .DS_Store 被拦在包外`}</ShellBlock>
      <Callout kind="warning" title="macOS 天生不删原件">
        和裸 <code>gzip 文件名</code> 压完即删原文件相反，<code>zip</code>{" "}
        打包后原文件全部保留，不需要 <code>-k</code> 之类的安全带——压缩工具里它是
        「礼貌默认」阵营的。
      </Callout>

      <Heading level={2} title="解压三姿势，撞名先问" />
      <Paragraph>
        解压有三个常用姿势，覆盖 99% 的场景：<code>unzip x.zip</code> 解到当前目录（自动还原
        目录树）、<code>unzip x.zip -d 目标/</code> 解到指定目录（不存在会创建）、
        <code>unzip x.zip 包内路径</code> 单抽一个文件——第三种的参数是<strong>包内路径</strong>，
        目录条目在包里长什么样就写什么，机制是查中央目录拿到 offset 后只解那一段。
      </Paragraph>
      <ShellBlock>{`$ unzip demo.zip                    # 姿势一：当前目录
   creating: demo/
   creating: demo/sub/
  extracting: demo/sub/b.txt
  extracting: demo/a.txt
$ unzip demo.zip -d out2            # 姿势二：指定目录
$ unzip demo.zip demo/sub/b.txt     # 姿势三：单抽，其余字节不碰`}</ShellBlock>
      <Paragraph>
        撞上已存在的文件时，unzip <strong>不覆盖、逐个问</strong>，答 <code>y</code> 覆盖这一个、
        <code>A</code> 后续全覆盖、<code>N</code> 全跳过、<code>r</code>{" "}
        换名保存。实测全跳过时它仍会解出不冲突的新文件，但退出码给 1（有事发生）——脚本里别留交互，
        用 <code>-o</code>（全部覆盖）或 <code>-n</code>（从不覆盖）显式表态。
      </Paragraph>
      <ShellBlock>{`$ printf 'n\\n' | unzip demo.zip
replace demo/sub/b.txt? [y]es, [n]o, [A]ll, [N]one, [r]ename:
  skipping: demo/sub/b.txt         # 跳过已有文件
  extracting: extra.txt            # 不冲突的新文件照常解出
$ echo $?                          # 退出码 1：有跳过，不是失败`}</ShellBlock>

      <Heading level={2} title="只看不解：四件套" />
      <Paragraph>
        凡是「不知道包里有啥就先看看」的需求，都不用真的解压——zip
        的中央目录让这些操作全部瞬间完成，macOS 与 Linux 的这套工具同源（Info-ZIP）， 没有 zcat
        那种平台陷阱。
      </Paragraph>
      <ShortcutTable
        label="只看不解速查 / inspect without extract"
        rows={[
          { keys: ["unzip -l x.zip"], desc: "看清单：大小、时间戳、名字、总计，秒回" },
          {
            keys: ["unzip -p x.zip 路径"],
            desc: "打印某文件内容到屏幕，不落盘（配合 head/less/grep）",
          },
          { keys: ["zipgrep 关键词 x.zip"], desc: "包内所有文件搜内容，输出 文件名:行" },
          { keys: ["unzip -t x.zip"], desc: "逐条目校验 CRC32，下载大包后先验完整性" },
          { keys: ["unzip -Z1 x.zip"], desc: "仅列文件名（zipinfo 模式），给脚本用" },
        ]}
      />

      <Heading level={2} title="增量维护：不用重打整包" />
      <Paragraph>
        tar.gz 改一个文件要整体解开重压，zip 直接对已有包操作：<code>zip x.zip 文件</code>{" "}
        时包里没有就 <code>adding</code> 追加，已有且时间戳更新就 <code>updating</code>{" "}
        原地更新——只有变动条目和中央目录被动，其余文件数据一个字节不动。删除条目用{" "}
        <code>zip -d</code>。唯一的规则是<strong>路径即包内路径</strong>：
        <code>zip x.zip extra.txt</code> 会把文件放进包根；想放进包内的 <code>src/</code> 下，
        命令行就写 <code>zip x.zip src/extra.txt</code>，或者先 cd 过去再压。
      </Paragraph>
      <ShellBlock>{`$ echo v2 > demo/a.txt && zip demo.zip demo/a.txt
  updating: demo/a.txt            # 已有且更新 → 原地更新
$ zip demo.zip extra.txt
  adding: extra.txt               # 没有 → 追加到包根
$ zip -d demo.zip extra.txt
  deleting: extra.txt             # 删条目，同样只动目录`}</ShellBlock>

      <Heading level={2} title="陌生包：先看账，再解压" />
      <Paragraph>
        解压是「按目录条款目逐个还原」，来路不明的包在动手前值得先看一眼账：
        <code>unzip -l</code> 的清单里查两样——<strong>Length 总计</strong>（解压后实际占多大） 和
        <strong>条目路径</strong>。前者防 zip bomb：极端高度冗余的内容压缩比能到几百倍 （实测 200MB
        重复文本压到 581KB，344:1；恶意构造可达千倍），看账一眼识破； 后者防路径穿越：正常包不该出现{" "}
        <code>../</code> 开头或绝对路径的条目。 确认无害再 <code>unzip -t</code> 验校验码，解压时用{" "}
        <code>-d</code> 落到指定目录而不是裸解在当前目录。
      </Paragraph>
      <DoDont
        label="处理陌生 zip / untrusted archive"
        dont={{
          code: `$ unzip download.zip        # 直接解到当前目录
# 清单没看过：里面是 10GB 还是 ../ 攻击条目都不知道`,
          note: "解压是逐条目还原，先看账是零成本的习惯",
        }}
        do={{
          code: `$ unzip -l download.zip     # 看总计 + 条目路径
$ unzip -t download.zip     # 验完整性
$ unzip download.zip -d out # 落到指定目录再检查`,
          note: "看账 → 验码 → 隔离解压，三步走完再碰内容",
        }}
      />
      <MemoryCard keyword="四组动作，四条默认">
        打包 zip -r（-r 不能省），解压 unzip / -d / 单抽，只看不解 -l -p zipgrep -t， 维护
        adding/updating/zip -d。默认行为：不删原件、保留 .zip、撞名先问、 陌生包先 -l 看账。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "zip demo.zip demo 没报错、退出码 0，包里到底有什么？",
            intent: "热身题考默认行为的后果意识——静默失败比报错更危险，必须能说出包里实际是什么。",
            depth: 1,
            a: "只有一个 demo/ 目录条目，文件一个都没进。zip 的哲学是「说什么装什么」，目录条目不是文件，不带 -r 它就不会递归进去；整个过程无警告、退出码 0，只有解开或 unzip -l 才能发现是空包。预防两手：目录必配 -r，打包完顺手 unzip -l 核对条目数。",
            bonus:
              "顺带记住 stored 0% 的含义：目录条目没有内容可压，原样存放——zip 输出里每个条目都会标注实际压缩率，stored 0% 不代表压缩失败。",
          },
          {
            q: "zip 对已有包重压一个文件时，凭什么判定该 updating 还是 adding？",
            intent: "考增量机制的判定依据——用过 updating/adding 不稀奇，说清判定条件才算懂。",
            depth: 2,
            a: "按「包内是否已有同名条目 + 磁盘文件时间戳是否更新」判定：包里没有这个名字就 adding 追加；有同名且磁盘上的时间戳比包里记录的新，才 updating 原地替换。所以只改内容不触发时间戳变化的文件不会被更新——怀疑不同步时用 zip -f（freshen，只更新包里已有时效落后的条目）或干脆删掉重打。",
            bonus:
              "unzip 侧有对称的旗子：-f 只解出包里比磁盘新的（freshen），-u 解出新的且补上缺的（update）——两侧构成完整的「按时间戳同步」语义。",
          },
          {
            q: "macOS 的 zip/unzip 会有 zcat 那种「同一个名字两套行为」的平台陷阱吗？",
            intent: "把 zcat 陷阱的排查经验迁移到 zip，考是否理解陷阱的成因而不是背结论。",
            depth: 3,
            a: "没有。zcat 的坑在于 Apple 和 GNU 各自实现了同名工具且行为分叉（一个只认 .Z，一个读 .gz）；而 macOS 的 zip/unzip 与 Linux 发行版同宗——都是 Info-ZIP 项目的 zip 3.0 / unzip 6.0，行为、旗子、输出措辞一致。同一个脚本里的 zip -r、unzip -l、zipgrep 可以放心跨平台。",
            bonus:
              "唯一要留意的跨平台差异不在工具在名字编码：Windows 老压缩器产的包在 mac 上解开中文乱码——那是格式层面的编码声明问题，与工具实现无关。",
          },
          {
            q: "发包给 Windows 同事前，怎么确认包是干净的？",
            intent: "实战流程题，考能不能把「垃圾条目」知识落成一套可执行检查。",
            depth: 3,
            a: "打包前用 -x 排除 .DS_Store 等垃圾；对来历复杂的包（比如经手过 Finder/ditto 的），unzip -l 扫一遍条目，重点看三类：.DS_Store、._ 开头的 AppleDouble 影子文件、__MACOSX/ 目录——有就重新打包而不是手工删。源头上就用 zip -r 而不是 Finder 右键压缩，影子文件根本不会产生。",
            bonus:
              '更稳的姿势是把排除写成习惯别名：alias zipclean=\'zip -r x.zip . -x "*.DS_Store" "__MACOSX*" "*._*"\'——排除模式支持通配，一条命令出干净包。',
          },
          {
            q: "mysqldump 边导出边压缩的管道，为什么不能换成 zip？",
            intent: "收官题，把命令层的选择回收到结构层——答不出「回写目录」说明只背了结论。",
            depth: 4,
            a: "因为 zip 必须在最后回头往文件末尾写中央目录——它得先知道所有条目的位置才能登记造册，而管道场景里导出何时结束、有多少字节都未知，无处「回头」。gzip 是一条边收边压的流，压完收工天然适配。zip 格式上有数据描述符支持流式生成，但解压端依旧需要可 seek 的文件来查目录，所以「生成可流式、消费不可流式」，管道场景整体仍是 gzip 的主场。",
            bonus:
              "真要流式搬运目录，社区的标准答案也不是硬塞 zip，而是 tar 走管道：tar -czf - dir/ | ssh host 'tar -xzf -'——两边都是流，全程无临时文件。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "Windows 压的 zip 为什么中文乱码？",
            to: "/note/devtools/shell/file-basics/zip-filename-encoding",
            description: "跨平台发包的另一坑：中央目录里登记的名字用什么编码，谁说了算。",
          },
          {
            title: "gzip 命令行怎么用？",
            to: "/note/devtools/shell/file-basics/gzip-cli",
            description:
              "隔壁单文件压缩工具的操作全景——对照着看，「礼貌默认」与「危险默认」的差别更清楚。",
          },
        ]}
      />
    </NoteShell>
  );
}
