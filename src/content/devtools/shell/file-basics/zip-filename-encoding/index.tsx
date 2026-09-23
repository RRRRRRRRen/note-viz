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
import { ShellBlock } from "@/components/demo";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        因为 zip 的文件名是<strong>按原始字节存进包里的</strong>，用什么编码解读这串字节，
        由通用标志位的第 11 位（EFS）声明。老 Windows 压缩工具按系统本地编码（简体中文是
        GBK）写字节、<strong>不设这个标志位</strong>；macOS 解压时按 UTF-8
        去解读同一串字节，对不上就画乱码。
        <strong>坏的只是名字的显示，文件内容一个字节都不会坏</strong>
        ——识别用 <code>unzip -l</code> 看清单，急救用 <code>unar</code>（自动识别编码），
        预防靠约定打包工具。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "zip 为什么能只看清单不解压？",
            to: "/note/devtools/shell/file-basics/zip-central-directory",
          },
          {
            title: "文件类型由什么决定？",
            to: "/note/devtools/shell/file-basics/file-type-magic",
          },
        ]}
      >
        前者解释为什么 <code>unzip -l</code> 不解压就能看到文件名（名字登记在中央目录里）；
        后者立住「字节是事实、编码是解读方式」的地基——本篇是这句话在文件名上的一次实战。
      </Prerequisite>

      <Heading level={2} title="机制：名字是字节，编码靠声明" />
      <Paragraph>
        zip 格式诞生于 1989 年，对「文件名」的处理只保留了最小约定：局部头和中央目录里各存一份
        <strong>名字的原始字节</strong>，配一个标志位声明「这些字节是什么编码」。据 PKWARE 的 ZIP
        格式规范（APPNOTE.TXT），这个声明就是通用标志位（general purpose bit flag）的第 11 位：
      </Paragraph>
      <SpecQuote source="PKWARE APPNOTE.TXT（.ZIP File Format Specification），通用标志位 bit 11">
        Bit 11: Language encoding flag (EFS)。置 1 时，文件名与注释字段必须使用 UTF-8
        编码；未置位时，按规范默认是 CP437（早期的 DOS 扩展 ASCII）——现实中各工具普遍按
        自己的系统本地编码写入。
      </SpecQuote>
      <Paragraph>
        乱码的全部根源就在这句规范与现实的两层错位：<strong>规范说无标志按 CP437</strong>，但中文
        Windows 的老压缩器根本不理会 CP437，直接把 GBK 字节写进去、标志位留空；解压端拿不到任何
        「这是 GBK」的声明，macOS 只好按它自己认识的 UTF-8 去解——GBK 的「中」是两个字节{" "}
        <code>D6 D0</code>，在 UTF-8 里是非法序列，解不出来就画成乱码块。两种存储方式的对照：
      </Paragraph>
      <CompareTable
        label="文件名的两种存储方式 / name encoding"
        left={{ title: "老 Windows 工具（GBK）", color: PALETTE.red }}
        right={{ title: "现代工具（UTF-8 + EFS）", color: PALETTE.green }}
        rows={[
          {
            aspect: "名字字节",
            left: "GBK 编码（「中」= D6 D0）",
            right: "UTF-8 编码（「中」= E4 B8 AD）",
          },
          {
            aspect: "标志位 bit 11",
            left: "不设置——没有任何编码声明",
            right: "置位（EFS），白纸黑字声明 UTF-8",
          },
          {
            aspect: "解压端怎么读",
            left: "按规范退 CP437，macOS 实际按 UTF-8 硬解",
            right: "看到标志位，按 UTF-8 解读，无歧义",
          },
          { aspect: "跨平台结果", left: "非简中环境必然乱码", right: "支持标志位的工具全部正常" },
        ]}
      />

      <Heading level={2} title="识别与急救" />
      <Paragraph>
        识别零成本：收到包先 <code>unzip -l</code>——名字在中央目录里，不解压就能看到，
        乱码当场现形。模拟一个「名字不含编码标志」的包，macOS 的默认视角：
      </Paragraph>
      <ShellBlock>{`$ unzip -l win.zip
Archive:  win.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
       20  01-01-1980 00:00   ????????.txt      # 名字已成乱码块，Length 20 字节倒是正常
---------  ---------- -----   ----
       20                     1 file`}</ShellBlock>
      <Paragraph>
        急救的首选是 <code>unar</code>（The Unarchiver 的命令行版，<code>brew install unar</code>
        ）：它对文件名编码<strong>自动探测</strong>，GBK、Shift-JIS、CP437
        都在探测列表里，一条命令解出正确名字；探测失误时还能 <code>-e gbk</code> 手动指定。注意
        macOS 自带的 unzip 帮不上这个忙——发行版上的 <code>unzip -O 编码</code> 选项是 Debian
        系的补丁特性，Apple 构建版没有这个旗子（实测敲下去直接吐 usage、exit 10）：
      </Paragraph>
      <ShellBlock>{`$ unzip -O gbk win.zip -d out/    # macOS：没有这个选项
UnZip 6.00 of 20 April 2009, by Info-ZIP ...
Usage: unzip [-Z] [-opts[modifiers]] file[.zip] ...
$ unar win.zip                    # 自动探测编码，中文文件名还原
中文说明.txt   (20 bytes)  ... OK.`}</ShellBlock>
      <Callout kind="tip" title="内容从来不会坏">
        编码错位只发生在「名字」上：包里的文件内容是按字节原样压缩存储的，跟名字用什么编码毫无关系。
        乱码包解出来的文件，内容完好，坏的只是文件系统里的名字——所以抢救名字就行，别急着怀疑文件。
      </Callout>

      <Heading level={2} title="发送侧：预防比抢救省事" />
      <Paragraph>
        反方向基本无忧：macOS（以及现代 Linux）的 Info-ZIP 工具对非 ASCII 名字自动按 UTF-8
        写入并置位 EFS 标志，mac 与 Linux 之间互发中文名 zip
        往返无损（实测「中文说明.txt」压了再解，名字一字不差）。真正的坑始终是
        <strong>老 Windows 产的包流向 mac</strong>，以及{" "}
        <strong>mac 产的中文名包流向老 Windows</strong>—— Windows 自带解压对 EFS
        标志位的支持长期不完整，别赌它。
      </Paragraph>
      <Paragraph>
        所以团队里的稳态约定就三条：其一，跨平台交换代码和文本优先 <strong>tar.gz</strong>（gzip/tar
        全程 UTF-8，无编码声明问题，代价是对方得会解）；其二，必须用 zip 时，Windows 侧用{" "}
        <strong>7-Zip</strong>（完整支持 EFS 标志位）代替系统右键压缩；其三，接收端统一装{" "}
        <code>unar</code> 兜底。三条约定的共同逻辑是：
        <strong>别依赖「猜」，要么声明编码（标志位）， 要么干脆绕开编码声明这个历史包袱。</strong>
      </Paragraph>
      <DoDont
        label="遇到乱码包 / garbled names"
        dont={{
          code: `# 见乱码就瞎猜着反复转码碰运气
unzip win.zip          # 先解出一堆乱码名文件
mv '????txt' report.txt # 手工逐个猜名字重命名`,
          note: "字节是事实，编码是解读方式——瞎猜解码只会越搅越乱",
        }}
        do={{
          code: `$ unzip -l win.zip     # 确认只是名字乱、内容还在
$ unar win.zip          # 自动探测编码解出正确名字
$ unar -e gbk win.zip   # 探测失误时手动指定`,
          note: "换一个会看标志位/会探测编码的工具，问题在工具层解决",
        }}
      />
      <MemoryCard keyword="名字看标志，内容永不坏">
        文件名按原始字节存，bit 11（EFS）声明是不是 UTF-8；老 Windows 写 GBK 不设标志，macOS 按
        UTF-8 硬解就乱码。unzip -l 当场识别，unar 自动探测急救， 跨平台稳态是 tar.gz 或 7-Zip。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "乱码发生在存储端还是解码端？——包是坏的，还是解压工具是坏的？",
            intent: "热身题，定位问题层次——答「包坏了」说明没理解「字节+声明」模型。",
            depth: 1,
            a: "发生在解码端，而且准确说是「声明缺失导致的解读错位」。包里存的 GBK 字节本身完好无损、自洽合法；坏在没有编码声明（标志位空），解压端只能按自己的默认（UTF-8）去解读别人的编码。同一串字节配上正确的声明就毫无问题——所以这不是数据损坏，是协议失约。",
            bonus:
              "判断口诀：Length 列正常、乱码只在名字里 → 编码问题；Length 异常或解压报 CRC 错 → 才是包真坏了。",
          },
          {
            q: "为什么 unzip -l 不解压就能发现乱码？",
            intent: "把本篇和中央目录原理织起来——名字到底存在哪、什么时候被读到。",
            depth: 2,
            a: "因为文件名登记在包尾的中央目录里，unzip -l 只读目录就能列出全部名字，一个压缩字节不用解。名字的原始字节和它的标志位就存在目录条目里——看乱码这件事，本质是「解码错误在清单阶段就提前发生了」，反而帮我们零成本提前识别。",
            bonus:
              "顺带一个推论：局部头和中央目录各存一份名字，两份理论上可能不一致（手工改包或老 bug 的产物）——排错时若 -l 显示正常、解出来却乱码，就该怀疑两份名字不同步。",
          },
          {
            q: "乱码包解出来的文件，内容需要「转码修复」吗？",
            intent:
              "考「名字编码」与「内容编码」是否被混为一谈——混淆的人会去转码内容，造成真损坏。",
            depth: 3,
            a: "不需要，内容从来没问题。名字编码和内容编码是两条独立的通道：名字按原始字节存在目录条目里、靠标志位声明；内容是被压缩的字节流，原样进出，不经过任何编码转换。需要修的只有文件系统里的名字，而且用 unar 重新解一次就自动修好——对内容跑 iconv 之类的转码，才是把好数据真弄坏的错误操作。",
            bonus:
              "如果解出的文件「内容也乱」，那问题在内容生成端（比如对方拿 GBK 编码写的文本文件），和 zip 无关——文本文件本身的编码问题，回到 file / iconv 那条线去处理。",
          },
          {
            q: "Debian 的 unzip 有 -O gbk 能指定编码，macOS 为什么没有？",
            intent: "细节陷阱题，考知不知道工具构建差异的来源——和 zcat 陷阱同族但成因不同。",
            depth: 3,
            a: "因为 -O 不是 Info-ZIP 上游的功能，是 Debian 系发行版给 unzip 打的补丁；Apple 自带的 unzip 是上游原版构建，自然没有这个旗子——实测敲下去直接吐 usage、exit 10。macOS 上的替代就是 unar：默认自动探测，探测失误 -e gbk 手动指定，能力上还覆盖得更广（Shift-JIS、CP437 等）。",
            bonus:
              "这也解释了为什么网上搜「unzip 乱码」会有两种互相矛盾的答案：Linux（Debian 系）用户贴 -O 能用，macOS 用户照抄就报错——同一命令名的补丁差异，查任何工具行为都先确认平台和构建来源。",
          },
          {
            q: "团队要定一条跨平台发包规范，你怎么设计？",
            intent: "收官题，考能否把机制层面的理解落成工程约定——每一条约定都要能说出机制依据。",
            depth: 4,
            a: "按内容类型分流，每条都有机制依据：代码和文本一律 tar.gz——tar/gzip 全程 UTF-8、没有编码声明的历史包袱，还附带保留 Unix 权限位的红利；必须 zip 的场合（对方环境只认 zip），约定 Windows 侧装 7-Zip 做打包器（正确置位 EFS），禁用系统右键压缩；接收端统一装 unar 兜底，专治来历不明的老包。三条共同逻辑：要么有编码声明，要么绕开声明机制，永远不依赖「猜」。",
            bonus:
              "规范能不能落地，看检查点是否自动化：CI 或发包脚本里加一步 unzip -l 扫描，出现 .DS_Store、__MACOSX、非 UTF-8 名字条目直接打回——约定靠工具执行，不靠自觉。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "文件类型由什么决定？",
            to: "/note/devtools/shell/file-basics/file-type-magic",
            description:
              "「字节是事实、编码是解读方式」的地基课：魔数、拓展名与终端解码的完整链路。",
          },
          {
            title: "zip 命令行怎么用？",
            to: "/note/devtools/shell/file-basics/zip-cli",
            description: "回到操作层：发包前的垃圾条目清理与看账习惯，把本篇的预防约定落成命令。",
          },
        ]}
      />
    </NoteShell>
  );
}
