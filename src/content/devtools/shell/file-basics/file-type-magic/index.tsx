import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { Callout, CompareTable, CrossRef, DoDont, MemoryCard } from "@/components/viz";
import { FlowChart, ShellBlock } from "@/components/demo";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        文件类型由<strong>内容</strong>决定，不是名字。三层判定各司其职：<strong>拓展名</strong>
        是写在目录「花名册」里的标签，给人看、给图形界面用，一个 <code>mv</code> 就能改；
        <strong>魔数</strong>是内容开头几个字节的「正身暗号」，<code>file</code> 命令、
        <code>gunzip</code> 这类程序验的是它；<strong>Content-Type</strong>
        是传输层的声明，浏览器信它而不信 URL 后缀。把 .gz 改名成 .txt，<code>gunzip -c</code>{" "}
        照样解压出原文——验身看的是暗号，名字从头到尾没参与。
      </Conclusion>

      <Heading level={2} title="名字住在花名册里，内容才是那串字节" />
      <Paragraph>
        磁盘上的文件由两样互相独立的东西构成：<strong>内容</strong>是一串字节，<strong>名字</strong>
        是文件系统目录表里的一个条目。所谓「拓展名」只是名字里约定俗成的最后一段——它根本不存储在文件内容里。
        <code>mv a.gz a.txt</code> 改的只是花名册上的一行字，那串字节一个都不会动。
      </Paragraph>
      <Paragraph>
        亲眼看一遍：<code>xxd</code> 显示 hello.txt 的字节是 <code>68 65 6c 6c 6f 0a</code>
        ——正好是 h、e、l、l、o 加换行的编号，<strong>第一个字节就是正文，没有任何「文件头」</strong>
        。然后把它改名成 .md，再问 <code>file</code> 命令：
      </Paragraph>
      <ShellBlock>{`$ echo hello > nv-real.txt
$ file nv-real.txt
nv-real.txt: ASCII text
$ xxd nv-real.txt
00000000: 6865 6c6c 6f0a                           hello.
$ mv nv-real.txt nv-real.md      # 名字换了
$ file nv-real.md
nv-real.md: ASCII text           # 判定没变：它看的是内容`}</ShellBlock>

      <Heading level={2} title="魔数：内容开头的正身暗号" />
      <Paragraph>
        结构化格式都会在内容最前面放几个固定字节，圈内叫<strong>魔数</strong>：gzip 是{" "}
        <code>1f 8b</code>，PNG 是 <code>89 50 4e 47</code>，PDF 是 <code>25 50 44 46</code>
        （即 %PDF）。程序验身就是拿内容开头对照这张表——命中谁是 gzip 就是 gzip，与名字无关。把 gzip
        内容套上 .txt 的名字，<code>file</code> 一眼认出原形；而 <code>gunzip</code>{" "}
        直接带名字解压时拒绝它，拒绝理由也不是「类型不对」，而是
        <strong>输入名里没有可砍的后缀、起不出输出文件名</strong>
        ——换成走标准输出的 <code>gunzip -c</code>，照样解：
      </Paragraph>
      <ShellBlock>{`$ printf 'AAA,' | gzip > nv-fake.txt       # gzip 内容，.txt 名字
$ file nv-fake.txt
nv-fake.txt: gzip compressed data, last modified: Thu Sep 10 13:55:00 2026, from Unix, truncated
$ gunzip nv-fake.txt
gunzip: nv-fake.txt: unknown suffix -- ignored    # exit 1：不是不认，是起不出名
$ gunzip -c nv-fake.txt
AAA,                                              # -c 走标准输出，照样解`}</ShellBlock>
      <Paragraph>
        反过来，纯文本文件<strong>没有魔数</strong>——从第一个字节到最后一个字节全是内容本身。 所以{" "}
        <code>file</code> 对文本的判定是<strong>猜</strong>：按内容风格判断「像不像文字」。
        猜就会出错：一个 GBK 编码的中文文件被它报成 <code>ISO-8859 text</code>
        ——编码认错了，但「它只是个猜风格的家伙」这个行为本身是诚实的。魔数是写死的查表，文本是概率的
        猜测，这就是 <code>file</code> 输出里 gzip 那行笃定、txt 那行含糊的原因。
      </Paragraph>
      <CompareTable
        label="两种身份判定 / extension vs magic"
        left={{ title: "拓展名 .gz", color: PALETTE.purple }}
        right={{ title: "魔数 1f 8b", color: PALETTE.blueSoft }}
        rows={[
          {
            aspect: "存在哪里",
            left: "目录花名册的条目里，在内容之外",
            right: "内容的第 1~2 个字节，走到哪跟到哪",
          },
          {
            aspect: "谁在消费",
            left: "人眼、GUI 双击行为、服务端 MIME 映射表",
            right: "file 命令、gunzip、图片解码器等程序",
          },
          { aspect: "改动成本", left: "mv 一下就变，零成本", right: "得修改内容本体" },
          { aspect: "伪造难度", left: "无门槛", right: "要精确构造字节序列" },
          { aspect: "file 的态度", left: "不理会", right: "查表命中即宣布结论" },
        ]}
      />

      <Heading level={2} title="乱码是谁的错：cat 的字节接力" />
      <Paragraph>
        「<code>cat</code> 怎么知道要把字节变成字符？」——它不知道，也从来不做这件事。
        <code>cat</code> 只把字节<strong>原样搬运</strong>到输出通道；真正把字节翻译成字符的是
        <strong>终端</strong>：它拿着字节流逐个查 UTF-8
        对照表，查到合法序列就画出字符。文本文件的字节 恰好都是合法 UTF-8，所以显示正常；.gz
        的字节大多是非法组合，终端硬着头皮查表，查不出来就用
        <code>�</code> 占位符画上去——这就是乱码。
        <strong>乱码是终端的解码失败，不是 cat 的失败</strong>
        ，cat 搬运字节这件事从来都成功了。
      </Paragraph>
      <FlowChart
        label="cat 显示文件的四棒接力 / cat pipeline"
        data={{
          direction: "LR",
          nodes: [
            { id: "bytes", label: "文件里的字节", color: PALETTE.gray },
            { id: "cat", label: "cat：原样搬运，不解释", color: PALETTE.blue },
            { id: "term", label: "终端：按 UTF-8 查表", color: PALETTE.purple },
            { id: "char", label: "合法序列 → 画出字符", color: PALETTE.green },
            { id: "bad", label: "非法序列 → � 占位（乱码）", color: PALETTE.red },
          ],
          edges: [
            { source: "bytes", target: "cat", label: "read()" },
            { source: "cat", target: "term", label: "stdout，字节不变" },
            { source: "term", target: "char", label: "编码对上了" },
            { source: "term", target: "bad", label: "编码对不上" },
          ],
        }}
      />
      <Paragraph>
        编码不匹配的实验能同时验证「cat 不转码」和「终端只认死理」：造一个 GBK 字节的文件，
        <code>file</code> 猜错编码、<code>cat</code> 照搬字节、终端按 UTF-8 硬查——三连乱码； 换用{" "}
        <code>iconv</code> 指定「从 GBK 转 UTF-8」，同一个文件立刻还原。如果 cat
        会「自动识别编码」，这一节的所有乱码都不该发生——它们发生了，恰好证明没人转码：
      </Paragraph>
      <ShellBlock>{`$ printf '你好世界' | iconv -f UTF-8 -t GBK > nv-gbk.txt
$ file nv-gbk.txt
nv-gbk.txt: ISO-8859 text, with no line terminators   # 猜错了（其实是 GBK）
$ cat nv-gbk.txt
������                     # 终端按 UTF-8 硬查的产物
$ iconv -f GBK -t UTF-8 nv-gbk.txt
你好世界                    # 用对对照表就还原`}</ShellBlock>

      <Heading level={2} title="Web 上的同款哲学：Content-Type" />
      <Paragraph>
        浏览器判断「服务器发来的是 HTML 还是图片」，同样不看 URL 的拓展名，而是看响应头{" "}
        <code>Content-Type</code>。这和 <code>file</code> 命令看魔数是同一个原则：
        <strong>别信名字，验内容或验声明</strong>
        。拓展名真正「说了算」的地方其实在服务端配置层——nginx 的 <code>types</code> 表按拓展名映射出
        Content-Type 响应头，再把声明发给浏览器。也就是说：拓展名决定 MIME 的路径是「服务端查表 →
        生成声明 → 浏览器信声明」，浏览器从头到尾没看过你文件叫什么。
      </Paragraph>
      <Paragraph>
        这也解释了一个安全常识的由来：Content-Type 本质是<strong>声明</strong>而不是验身——声明可以被
        伪造或配错，所以涉及内容处理的程序（图片解码器、压缩工具）最终都会落到字节层面再验一次。
        拓展名、Content-Type、魔数三层各有受众，谁也不能完全替代谁，但「程序验正身」的那一票
        永远投给内容本身。
      </Paragraph>
      <DoDont
        label="上传校验 / upload check"
        dont={{
          code: `// 只看文件名后缀就放行
const ok = file.name.endsWith(".png");`,
          note: "拓展名是客户端可任意伪造的标签，改个名字就绕过",
        }}
        do={{
          code: `// 服务端读文件头，比对魔数表
// 89 50 4E 47 0D 0A 1A 0A 才是 PNG
const head = await readHead(file, 8);`,
          note: "内容里的暗号伪造成本高，验身才有意义",
        }}
      />
      <DoDont
        label="遇到乱码 / mojibake"
        dont={{
          code: `# 见乱码就反复转码碰运气
iconv -f UTF-8 -t GBK f.txt
iconv -f BIG5 -t UTF-8 f.txt ...`,
          note: "无对照地瞎转，只会把字节越搅越乱",
        }}
        do={{
          code: `# 先看真实字节，再定对照表
xxd f.txt | head        # c4e3 开头 → GBK 的「你」
iconv -f GBK -t UTF-8 f.txt`,
          note: "字节是事实，编码只是解读方式——先采集事实",
        }}
      />
      <MemoryCard keyword="验身看内容，别信名字">
        拓展名是花名册上的标签（给人看），魔数是内容开头的暗号（给程序验），Content-Type
        是传输层的声明（给浏览器定）。改名字动不了内容，验正身的程序就骗不到。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "cat 一个 .gz 文件满屏乱码，cat 是不是失败了？",
            intent: "热身题，筛选「搬运」与「解读」两个层次混为一谈的人。",
            depth: 1,
            a: "cat 没有失败。它的工作是把字节原样搬运到输出通道，这一步 100% 成功；乱码发生在下一环节——终端拿着这些字节查 UTF-8 对照表，查不出合法序列只能画 � 占位。cat 从头到尾不知道「这是 gz」，它对任何文件的动作都一模一样。",
            bonus:
              "顺带恢复被二进制搞乱的终端显示：敲 reset 回车——控制字节被终端当指令执行后，reset 能把终端状态复位。",
          },
          {
            q: "file 命令认出 gzip 靠什么？它认 txt 也是同样的方法吗？",
            intent: "考「查表」与「猜测」两条判定路径的区别，答不出说明没理解魔数的适用边界。",
            depth: 2,
            a: "认 gzip 是查表：内容开头命中魔数 1f 8b，直接宣布结论，笃定且可伪造性低。认 txt 没有表可查——纯文本没有文件头，file 只能按内容风格猜（输出含糊的 ASCII text）；猜就可能错，GBK 中文被它报成 ISO-8859 就是实证。结构化格式查表、纯文本靠猜，这是 file 输出语气差别的根源。",
            bonus:
              "file 的判定库叫 magic file（/usr/share/file/misc/magic.mgc），社区持续维护魔数条目——它本质是一张可扩展的特征码对照表。",
          },
          {
            q: "拓展名在这个体系里什么时候真正「生效」？",
            intent: "考边界意识——知道拓展名不可信不难，说清它哪里可信才算完整。",
            depth: 3,
            a: "三处：人眼识别、GUI 的双击行为（Finder/资源管理器按拓展名选打开方式）、以及最重要的服务端 MIME 映射——nginx 的 types 表按拓展名查出 Content-Type 写进响应头。注意第三处拓展名也没直接面向浏览器：它先被服务端翻译成声明，浏览器信的是声明。程序级验身（解压、解码、杀毒扫描）从头到尾不看拓展名。",
            bonus:
              "所以 nginx types 表配错（比如 .js 没映射成 text/javascript）时，文件内容完好但浏览器拒绝执行——拓展名的错误通过声明层传染。",
          },
          {
            q: "上传接口校验了拓展名和 Content-Type 请求头，双保险够吗？",
            intent: "安全场景题，考「声明可伪造」这个本质——两层声明叠加仍是声明。",
            depth: 3,
            a: "不够。拓展名和 Content-Type 请求头都是客户端可控的声明，攻击者把恶意脚本改名 photo.png、请求头写成 image/png，两层校验同时通过。唯一可靠的做法是服务端读取文件内容开头、比对魔数表，必要时再送到真实解码器里过一遍（解码失败即拒绝）——声明可以伪造，内容里的暗号伪造成本高得多。",
            bonus:
              "更稳的组合拳：验魔数 + 存储时重编码/重打包（把字节彻底洗一遍）+ 存储域名与业务域名分离，让「万一漏网」也执行不了。",
          },
        ]}
      />

      <Callout kind="tip" title="把实验跑一遍">
        本篇所有输出都在 macOS（Apple gzip / BSD file）实测采集。Linux 的 GNU 工具行为一致，仅输出
        措辞略有差异——魔数表、花名册模型、终端解码链路在所有 Unix 类系统上通用。
      </Callout>

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: ".gz 文件里都装了什么？",
            to: "/note/network/http/compression/gz-file-format",
            description: "把 1f 8b 这个暗号所在的文件整个拆开：头部、载荷、CRC 尾部逐字节解剖。",
          },
          {
            title: "grep 和管道怎么配合？",
            to: "/note/devtools/shell/text-pipeline/grep-pipe-basics",
            description: "字节流观的下一站：管道里流动的同样是字节，工具之间靠它接力。",
          },
        ]}
      />
    </NoteShell>
  );
}
