import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { Callout, CrossRef, DoDont, MemoryCard } from "@/components/viz";
import { FlowChart, StepThrough } from "@/components/demo";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        gzip 的压缩内核 DEFLATE（据 RFC 1951）是两轮性质不同的冗余消除串联：
        <strong>LZ77</strong> 把重复出现的序列替换成一个「回引」——往回多少字节、抄多长——序列重复
        在这一步被消灭；<strong>Huffman</strong>{" "}
        再把高频符号分配短编码、低频符号分配长编码，频率不均 在这一步被榨干。gzip
        命令产出的文件只是这股比特流外面的一层包装壳。记住「级别 1-9
        只是压缩端找冗余的卖力程度旋钮，解压速度与级别无关」，级别选择的纠结就省了。
      </Conclusion>

      <Heading level={2} title="两个极端实验：压的到底是文件，还是冗余" />
      <Paragraph>
        先看两个真实实验。<code>abcdefghij</code> 十个字符循环 10000 次得到的 100000 字节文件，gzip
        后只剩 <strong>241 字节</strong>；而 <code>/dev/urandom</code> 吐出的 100000
        字节真随机数据，压完反而<strong>变成 100053 字节</strong>。同是
        100KB，一个几乎归零、一个不降 反升——因为压缩器吃的从来不是「文件」，是<strong>冗余</strong>
        ：循环文本的本质是一句话在 32KB 窗口内无限自引用，随机数据则一个冗余字节都没有。
      </Paragraph>
      <Callout kind="info" title="没有任何算法能压小所有输入">
        这是鸽笼原理的直接推论：如果所有输入都能压小，反复套用就能把任意大文件压到 1 字节，而 1
        字节只有 256 种取值，装不下无限多种文件。所以无损压缩必然有输有赢——赢的是低熵
        （高冗余）数据，输的是高熵数据。「随机数据变大」不是 gzip 失败，是数学上注定要认的账。
      </Callout>
      <Paragraph>
        「压的是冗余不是文件」这个模型一路通到底：源代码是重复密度极高的文本（<code>function</code>
        、<code>console.</code>、JSON 的 key 反复出现），所以文本类资源能打二三折；JPEG、MP4
        的内部编码已经把冗余榨干，属于高熵数据，再压只赔不赚。工程上「什么该压、什么不压」的全部判断，
        都是在问这一个问题：这份数据的冗余还剩多少？
      </Paragraph>

      <Heading level={2} title="第一轮：LZ77 把重复序列变成回引" />
      <Paragraph>
        LZ77 的输出是三种东西的混合流：<strong>字面量</strong>（没被匹配掉的原始字节）、
        <strong>回引</strong>（一对数字：往回 distance 字节、抄 length 字节）。解码方读到回引，就
        回到指定位置抄写还原——逐字节精确，这就是「无损」。两个硬参数由格式刻死（据 RFC 1951
        §9）：窗口 32768 字节——回引的 distance 不能超过它，超出窗口的重复互相看不见；匹配长度 3~258
        字节——短于 3 字节的重复连回引本身的开销都摊不平，不如直接存字面量。
      </Paragraph>
      <StepThrough
        label="LZ77 逐步编码 / lz77 walk-through"
        height={120}
        steps={[
          {
            title: "扫描：前面没有重复，原样输出字面量",
            desc: '压缩器从左往右扫，维护最近 32KB 的滑窗（=已编码内容本身）。开头的 console.log("hello"); 没有任何历史可引用，作为字面量原样进入输出流。',
            color: PALETTE.blue,
            render: (
              <pre className="overflow-x-auto rounded-md bg-surface-2 p-2.5 font-mono text-[11px] leading-relaxed">
                {`console.log("hello");\n^^^^^^^^^^^^^^^^^^^^^ 22 个字面量`}
              </pre>
            ),
          },
          {
            title: "发现重复：空格之后找到了整段旧文",
            desc: "扫到第二段的 c 时，压缩器在滑窗里检索：往回 22 字节处，有一段 21 字节的内容和接下来要写的完全相同。",
            color: PALETTE.orange,
            render: (
              <pre className="overflow-x-auto rounded-md bg-surface-2 p-2.5 font-mono text-[11px] leading-relaxed">
                {`console.log("hello"); console.log("hello");\n                      ^^^^^^^^^^^^^^^^^^^^^ 往回 22 字节、抄 21 字节`}
              </pre>
            ),
          },
          {
            title: "输出回引 ⟨distance=22, length=21⟩",
            desc: "21 字节的重复被折成一对数字。distance 22 < 32768（窗口内）、length 21 在 3~258 区间——一次合法回引。重复密度越高，字面量被替换掉的比例越高。",
            color: PALETTE.purple,
          },
          {
            title: "解码：抄写即还原",
            desc: "解压方读到回引，回到自己输出缓冲区往回 22 字节处，抄 21 字节接在末尾。不查表、不猜语义，逐字节精确还原——无损的来源。",
            color: PALETTE.green,
          },
        ]}
      />
      <Paragraph>
        这个思路你其实天天在用：CSS 把重复的内联样式抽成一个 class 到处引用、minify
        给高频标识符起单字符名字——都是「重复模式 → 短引用」。LZ77
        把它做成了滑动窗口内的自动化流水线。它也解释了 32KB 窗口的工程含义：1MB 的 bundle
        里，同一个工具函数出现在相距 500KB 的两处，gzip 对这对重复是<strong>失明</strong>的—— 这是
        gzip 在大文件上吃亏的机制级原因，也是 brotli 把窗口上限放大到 16 MiB 的动机之一。
      </Paragraph>

      <Heading level={2} title="第二轮：Huffman 按频率重新分配编码长度" />
      <Paragraph>
        LZ77 之后，流里是字面量与回引的混合符号序列，而这些符号的频率极不均匀：文本里
        <code>e</code> 和空格霸榜，代码里 <code>;</code>、<code>(</code>、单字符标识符霸榜。Huffman
        的动作是按频率重新分配编码长度——高频符号给短码，低频符号给长码，把「频率差异」这最后一种冗余
        也榨出来。minify 给高频变量起 <code>a</code>、<code>b</code> 这样的名字，就是手工版的
        Huffman；算法只是把它推到了信息论的极限。
      </Paragraph>
      <Paragraph>
        变长编码不会解错，靠的是<strong>前缀性质</strong>：任何码都不是另一个码的前缀（例如码表
        <code>{`{0, 10, 110, 111}`}</code>）。解码时从比特流左往右读，一个码一成形就唯一确定，
        不用回溯——这是压缩和解压都能单遍顺序处理的前提，也是解压快的基础。gzip 用的是动态
        Huffman：压缩器为每一块数据现场统计频率、生成定制码表，把码表放在块头一起写进输出；甚至码表本身（各符号的码长序列）还先做了一遍游程压缩再用一个小
        Huffman 编码——数据的冗余用 Huffman 消，码表的冗余再套一层 Huffman 消，抠到极致。
      </Paragraph>
      <Paragraph>
        整个 DEFLATE 流由块拼成，每块开头 3 个比特：1 bit 标记「是否最后一块」，2 bit
        选块类型——原样存储（stored）、固定码表、动态码表。流水线全景如下：
      </Paragraph>
      <FlowChart
        label="DEFLATE 两轮流水线 / deflate pipeline"
        data={{
          direction: "TB",
          nodes: [
            { id: "raw", label: "原始字节（高冗余文本）", color: PALETTE.gray },
            { id: "lz", label: "LZ77：字面量 + 回引（消序列重复）", color: PALETTE.orange },
            { id: "huf", label: "Huffman：变长码流（消频率不均）", color: PALETTE.purple },
            { id: "pack", label: "分块 + 码表打包成 DEFLATE 比特流", color: PALETTE.blue },
            { id: "gz", label: "gzip 壳：头部 + CRC/ISIZE 尾部", color: PALETTE.green },
          ],
          edges: [
            { source: "raw", target: "lz", label: "滑窗匹配 32KB / 3~258" },
            { source: "lz", target: "huf", label: "符号频率统计" },
            { source: "huf", target: "pack", label: "动态码表随块携带" },
            { source: "pack", target: "gz", label: "RFC 1952 容器" },
          ],
        }}
      />
      <Paragraph>
        还有一块常被忽略的拼图：<strong>stored 块（逃生舱）</strong>。当一段数据实在压不动（高熵、
        比特流反而更大），压缩器可以直接输出「原样存储块」，字节照抄，每块只付约 5 字节手续费。这是
        「JPEG 再 gzip 反而变大」的机制级解释——不是压缩器失败，是它按设计主动弃权。
      </Paragraph>

      <Heading level={2} title="级别与不对称性：压缩贵，解压廉" />
      <Paragraph>
        级别 1-9 调的是压缩端的搜索力度：哈希链翻多深、要不要做惰性匹配——本质是「多卖力找冗余」的
        旋钮。无论哪一级，产出的都是合法 DEFLATE 流，解压永远是同一套单遍算法，速度与级别无关。而
        压缩端要反复检索滑窗，天然比解压贵。这个不对称性是整个 CDN 模式的技术前提：
        <strong>一次压缩、千万次分发</strong>——贵的部分付一次，便宜的部分每个用户各跑一遍。
      </Paragraph>
      <Paragraph>
        推论：构建期预压缩可以无脑用最贵的档位——<code>-9</code> 慢没关系，构建机的时间不值钱；甚至
        zopfli 这类「用 80 倍耗时再抠 3~8% 体积」的极限 DEFLATE 编码器也值得上，因为它输出的仍是
        标准 DEFLATE，浏览器解压无感知。级别具体怎么选、以及「-1 反而比 -9 小」的实测反例，
        见命令篇的级别一节。
      </Paragraph>
      <DoDont
        label="minify 与压缩的关系 / pipeline order"
        dont={{
          code: `// 「有 minify 就够了，压缩是重复劳动」
vite build   // 只产出了 minify 过的 JS，服务器裸传`,
          note: "两者消的是不同层的冗余，二选一等于白扔一层收益",
        }}
        do={{
          code: `// minify → 压缩，两道流水线各吃各的
vite build && gzip -k9 dist/assets/*.js`,
          note: "minify 消语法层冗余（长名→短名、删空白），gzip 接着消字节层冗余",
        }}
      />
      <DoDont
        label="对高熵数据关压缩 / skip high entropy"
        dont={{
          code: `gzip_types
  image/png image/jpeg video/mp4 font/woff2;`,
          note: "这些格式内部已是压缩态，再压只赔手续费（43 字节压成 45 字节的同款账）",
        }}
        do={{
          code: `gzip_types text/css application/javascript
  application/json image/svg+xml;`,
          note: "只让压缩器吃它擅长的高冗余文本，图片字体绕行",
        }}
      />
      <MemoryCard keyword="压缩 = 消除冗余">
        LZ77 管序列重复（回引，窗口 32KB，长度 3~258），Huffman
        管频率不均（前缀码，动态码表随块走）， stored
        块是无冗余时的合法弃权。级别只调压缩端卖力程度——压缩贵、解压廉，一次压缩千万次分发。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "为什么 100KB 随机数据 gzip 后反而变成了 100053 字节？",
            intent: "热身题，筛掉「压缩器万能」的直觉——理解输入空间与输出空间的鸽笼关系。",
            depth: 1,
            a: "随机数据没有可消除的冗余，DEFLATE 只能选 stored 块原样照抄，另付头部尾部与块头的固定开销，净增 53 字节。这不是实现缺陷而是数学必然：无损压缩的输出空间不可能小于输入空间，否则反复压缩就能把任意文件压到 1 字节——而 1 字节装不下无限多种文件。压缩器永远在赢面大的数据上赢。",
            bonus: "工程推论：nginx、CDN 对图像视频默认不压缩，不是疏忽，是替你算了这笔必输的账。",
          },
          {
            q: "32KB 窗口对优化大体积 JS bundle 意味着什么？",
            intent: "考把窗口参数翻译成工程直觉——能否说出「远处重复不可见」决定了答案质量。",
            depth: 3,
            a: "相距超过 32768 字节的两段相同内容，gzip 完全看不见它们的关系——第二段只能当全新内容重新压一遍。bundle 越大、公共代码分布越散，这种「窗口外重复」越多，压缩率越稀释。所以拆包让同源代码聚簇、把公共依赖提频（commons chunk），本质都是在帮 LZ77 把重复搬进同一个窗口。",
            bonus:
              "brotli 的应对是窗口上限放大到 16 MiB（RFC 7932：window size = (1 << WBITS) - 16，WBITS 最高 24），常见配置 4~16 MiB——能看到 window 外重复的距离是 gzip 的 128~512 倍，这是它压缩率优势的重要来源之一。",
          },
          {
            q: "为什么解压速度和压缩级别完全无关？",
            intent: "考「级别到底调了什么」——能否把级别定位在压缩端的搜索策略上。",
            depth: 2,
            a: "级别调的是压缩端找冗余的搜索力度：哈希链遍历深度、惰性匹配开关等，全是「产出比特流之前」的策略。最终产出永远是同一种合法 DEFLATE 比特流，而解压器的输入只有这股流——它不知道也不需要知道压缩时用了哪一级。所以 -1 与 -9 的产物解起来一样快。",
            bonus:
              "更极端的证明是 zopfli：比 gzip -9 多花 80 倍时间，产物仍是标准 DEFLATE，浏览器解压速度不变——压缩端可以无限卷，解压端纹丝不动。",
          },
          {
            q: "先 minify 后 gzip，为什么这个顺序不能反？",
            intent: "考两层冗余消除的分工与粒度——「顺序」背后是字节态与语法态的依赖关系。",
            depth: 3,
            a: "minify 工作在语法层：删空白、换短名、死代码消除——它必须读到「代码」才能动手。gzip 的输出是高熵比特流，minify 工具既读不懂也写不动它，顺序天然只能 minify 在前。反过来，minify 之后的代码依然是自然语言级重复密度的文本（关键字、标点、常见 token 满天飞），gzip 照样吃得动——两层消除的收益是叠加的，谁也替代不了谁。",
            bonus:
              "同类叠加还有一层：brotli 对 JS/CSS 的收益比 gzip 大，部分原因是它内置了常见 web 词元的静态字典——相当于自带一层预置回引，与 minify 也是正交叠加的。",
          },
          {
            q: "动态 Huffman 的码表本身也要占空间，压缩器怎么避免「码表吃掉收益」？",
            intent:
              "压轴题，考对「开销与收益平衡」的机制级理解——知道有码表的人多，知道码表也被压缩的人少。",
            depth: 4,
            a: "三重账：第一，码表按「块」为单位生成，只有数据量大到值得定制码表时才用动态块，小数据直接用固定码表块甚至 stored 块，避免码表摊不平；第二，码表传输的不是完整编码树，而是每个符号的码长序列；第三，这个码长序列本身高度重复（大量符号码长为 0 或相同），先跑长度编码再用一个预置小 Huffman 编码后才写入——码表的冗余也被榨了一遍。RFC 1951 里这是 HLIT/HDIST/HCLEN 加码长字母表那一节。",
            bonus:
              "这套「描述信息的再压缩」思想在 tar 里也有影子：归档元数据同样可以被外层 gzip 整体压一遍——嵌套的不是内容，是各自层面的冗余。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: ".gz 文件里都装了什么？",
            to: "/note/network/http/compression/gz-file-format",
            description: "这股比特流怎么打包成文件：魔数、MTIME、CRC32 与多 member 的容器解剖。",
          },
          {
            title: "gzip 命令行怎么用？",
            to: "/note/devtools/shell/file-basics/gzip-cli",
            description: "级别 1-9 的实测数据与选择场景，-c/-k 的安全姿势。",
          },
        ]}
      />
    </NoteShell>
  );
}
