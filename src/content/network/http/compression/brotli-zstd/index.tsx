import { Conclusion, Heading, List, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  BarChart,
  CrossRef,
  DoDont,
  MemoryCard,
  Prerequisite,
  Table,
  Timeline,
} from "@/components/viz";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        三代算法不是替代关系，是<strong>分工格局</strong>：<strong>gzip 是地板</strong>——写进 HTTP
        标准，任何客户端都保证会，永远兜底；<strong>brotli 是 web 文本的天花板</strong>
        ——窗口更大、内置 web 词元字典，静态资源预压缩的首选；<strong>zstd 在基础设施开疆</strong>
        ——同级更快、长距离匹配 与训练字典适合容器、日志、数据库。2026 年的默认策略：静态资源 brotli
        最高档预压缩，gzip 全量兜底，内部数据管线交给 zstd。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "浏览器和服务器怎么协商压缩？",
            to: "/note/network/http/compression/content-negotiation",
          },
        ]}
      >
        选型的落地形式就是协商清单里的编码顺序——先有协商机制，才谈得上放谁进来。
      </Prerequisite>

      <Heading level={2} title="gzip 凭什么统治三十年：一场专利危机的遗产" />
      <Paragraph>
        gzip 的诞生动机写在 gzip.org 官方简史里：「Jean-loup Gailly and Mark Adler wrote the gzip
        utility to replace the Unix compress utility. At the time the continued use of compress was
        threatened by giant corporations holding patents on the LZW algorithm used by
        compress.」——前辈 compress 用的 LZW 算法（Welch 1984 年发表）握在 Unisys 手里，Unix
        世界需要一个法律上安全的替代品。1992 年 gzip 发布，1996 年 5 月 DEFLATE（RFC 1951）与 gzip
        格式（RFC 1952）定稿，1997 年起 Content-Encoding: gzip 写进 HTTP/1.1——恰好在 web
        爆发前夜完成了标准化。
      </Paragraph>
      <Timeline
        label="压缩算法三十年 / three decades"
        steps={[
          { label: "1984", sub: "LZW 发表，专利阴影埋下", color: PALETTE.gray },
          { label: "1992", sub: "gzip 诞生，为绕开专利而生", color: PALETTE.orange },
          { label: "1996", sub: "RFC 1951/1952 定稿", color: PALETTE.purple },
          { label: "1997", sub: "写进 HTTP/1.1 标准", color: PALETTE.blue },
          { label: "2003", sub: "LZW 专利到期，格局已定", color: PALETTE.gray },
          { label: "2015-16", sub: "brotli 与 zstd 登场", color: PALETTE.orange },
          { label: "2024", sub: "zstd 进主流浏览器", color: PALETTE.green },
        ]}
      />
      <Paragraph>
        此后的故事是「挑战者定律」的两次重演：挑战者从不正面打赢 gzip，而是攻下 gzip
        的短板场景。brotli 赢在压缩率（窗口更大、内置 web 字典），锁定静态资源预压缩；zstd
        赢在速度（同级压缩比 gzip 快得多），锁定实时与基础设施。gzip
        的护城河与算法优劣无关：免费出身 × HTTP 标准地位 × 够用的性能 × 无处不在的实现——
        它不是最好的压缩，是<strong>最不可能不在场</strong>的压缩。LZW 专利 2003
        年到期时，一切已尘埃落定。
      </Paragraph>

      <Heading level={2} title="三代参数对照" />
      <Table
        label="gzip / brotli / zstd 参数表 / spec"
        head={["维度", "gzip", "brotli", "zstd"]}
        rows={[
          [
            "算法内核",
            "LZ77 + Huffman",
            "LZ77 + Huffman + 上下文建模",
            "LZ77 + FSE(ANS) + Huffman",
          ],
          ["规范", "RFC 1951/1952（1996）", "RFC 7932（2016-07）", "RFC 8878（2021-02）"],
          [
            "滑动窗口",
            "32 KB（固定）",
            "上限 16 MiB−16 B（RFC 7932：window size = (1 << WBITS) − 16）",
            "实现层可配，长距离匹配默认扩到 128 MB",
          ],
          [
            "内置字典",
            "无",
            "静态字典 122,784 字节（web/html 常用词串）",
            "支持按业务数据训练专用字典",
          ],
          ["Content-Encoding 值", "gzip", "br", "zstd"],
          [
            "浏览器支持",
            "全部（标准保底）",
            "现代浏览器全支持",
            "Chrome 123 / Firefox 126 / Safari 26.3 起",
          ],
        ]}
      />
      <Paragraph>
        参数差异直接对应压缩率来源：brotli 的大窗口让它「看得见」gzip 窗口外的重复（上限是 gzip 的
        512 倍），122,784 字节的静态字典相当于把 web 文本高频词串预置成回引——HTML 里的{" "}
        <code>&lt;button</code>、常见 CSS 属性名不必再花比特去编码。zstd 则换了熵编码引擎：RFC 8878
        原文「Two types of entropy encoding are used by the Zstandard format: FSE and Huffman
        coding.」——FSE 基于 ANS，用更少的 CPU
        拿到接近算术编码的压缩率，这是它「同级更快」的机制根基。
      </Paragraph>
      <BarChart
        label="压缩比直觉 / ratio"
        title="Cloudflare 生产环境数十亿请求实测（HTML/CSS/JS，2024）：数值越大压得越小，仅供直觉"
        items={[
          { label: "gzip", value: 2.56, color: PALETTE.gray, suffix: ":1" },
          { label: "zstd", value: 2.86, color: PALETTE.blueSoft, suffix: ":1" },
          { label: "brotli", value: 3.08, color: PALETTE.green, suffix: ":1" },
        ]}
      />
      <Paragraph>
        生产数据与本地实测互相印证：Cloudflare 全网统计 zstd 平均压缩比 2.86:1，介于 gzip 的 2.56:1
        与 brotli 的 3.08:1 之间，但压缩耗时与 gzip 持平、比 brotli 快 42%。本地同一份 57 万字节 seq
        文本的 Node 实测更夸张：gzip -9 得 212816 字节，brotli 最高档 118159 字节—— 小了 44%。对
        HTTP Archive 头部站点的统计（Paul Calvano，2024）给出了工程口径：brotli 最高档比 gzip
        常用档再小约 15~25%，而「zstd 12 ≈ brotli 5」——体积相当、速度快得多。
      </Paragraph>

      <Heading level={2} title="地板与天花板：协商清单里的分工" />
      <Paragraph>
        三代算法的共存形式就写在协商头里：<code>Accept-Encoding: gzip, br, zstd</code>。浏览器只在
        安全上下文（HTTPS；localhost 亦视为安全）广告 br 与 zstd——Chromium 的官方表述是「like
        Brotli, Zstd is only available in secure contexts i.e. over https」——服务器按自己的支持情况
        从声明里挑最优先的编码。于是形成稳定分层：
        <strong>brotli/zstd 是天花板，能谈下来就用； gzip 是地板，任何客户端都保证会</strong>
        。连浏览器端的 JS 生态也是这个分层：Compression Streams API 目前只提供 gzip 与
        deflate（MDN：Baseline「available across browsers since May 2023」），zstd 形态仍标
        Experimental——网页里自己压数据，兜底依旧是 gzip。
      </Paragraph>
      <List
        items={[
          <>
            <strong>静态资源（JS/CSS/字体子集/JSON 快照）</strong>：构建期用 brotli 最高档生成 .br，
            同名再产一份 .gz 兜底，nginx 按协商二选一直接吐文件——零现压成本。
          </>,
          <>
            <strong>动态接口</strong>：现压选 gzip 4~6 档或 zstd/brotli
            低档，别碰最高档（耗时陡增）； 小于 1KB 的响应不压。
          </>,
          <>
            <strong>基础设施（容器层、日志管线、数据库备份、CI 产物缓存）</strong>：zstd
            的主场——速度与压缩比的平衡点远优于 gzip，训练字典对同构数据收益巨大。
          </>,
          <>
            <strong>兼容兜底</strong>：永远保留 gzip 一条路——老代理、嵌入式客户端、不支持 br
            的环境全靠它；测过协商链路再上线。
          </>,
        ]}
      />
      <DoDont
        label="动态接口的算法档位 / dynamic level"
        dont={{
          code: `# 每个动态请求都现压 brotli 最高档
brotli -q 11          # 压缩耗时可达 gzip 数倍，
                      # 高并发下 CPU 先崩`,
          note: "q11 是为「压一次发千万次」的预压缩设计的，不是为现压",
        }}
        do={{
          code: `# 现压用低档位，或交给同级更快的 zstd
gzip_comp_level 6;    # 或 brotli -q 5 / zstd -12
# 「zstd 12 ≈ brotli 5」：体积相当、更快`,
          note: "现压的预算是单请求毫秒级，静态预压才配得上最高档",
        }}
      />
      <DoDont
        label="静态资源的格式覆盖 / dual format"
        dont={{
          code: `# 只生成一份压缩格式赌兼容
dist/app.js.br        # 老客户端/特殊代理：解不开`,
          note: "br 没有 gzip 那样的标准保底，单发等于放弃兜底",
        }}
        do={{
          code: `dist/app.js.br       # brotli 主力（现代浏览器）
dist/app.js.gz       # gzip 兜底（永远保留）
# nginx gzip_static / brotli_static 按协商回`,
          note: "双格式同名共存，协商机制自动选最优、兜底永不缺席",
        }}
      />
      <MemoryCard keyword="地板、天花板与新大陆">
        gzip 是地板（HTTP 标准，人人会，永远兜底）；brotli 是 web 静态文本天花板（大窗口 + 122 KB
        字典，预压缩首选）；zstd 在基础设施开疆（ANS 熵编码，同级更快，长距离匹配 + 训练字典）。
      </MemoryCard>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "gzip 技术上早不是最优，为什么 2026 年还没被淘汰？",
            intent: "热身题，考「技术优劣」与「生态地位」的区分——只答压缩率的人没抓住重点。",
            depth: 1,
            a: "因为它的地位是标准合同给的，不是性能挣的：Content-Encoding: gzip 写在 HTTP/1.1 起的规范里，每个浏览器、每个服务端生态都保证支持。算法会被超越，合同不会被轻易作废——替换 gzip 意味着说服全世界所有历史客户端升级。事实上挑战者们也确实没有替换它，而是加入协商清单排在它前面：gzip 从霸主退居兜底，但兜底位置无比稳固。",
            bonus:
              "同构案例：IPv4、HTTP/1.1、TLS 1.2 都是「被架空而非被淘汰」——标准地位的半衰期远长于技术优势。",
          },
          {
            q: "brotli 的「内置字典」到底是什么？为什么对 web 文本特别有效？",
            intent: "考机制层——能否说清字典在 LZ77 框架里的角色（预置回引）。",
            depth: 2,
            a: "RFC 7932 附录 A 内嵌了一份 122,784 字节的静态字典，内容是人工收集的 web 文本高频词串——HTML 标签与属性、常见英文词、HTTP 头字段、JS/CSS 关键 token。它在压缩框架里的角色是「预置的窗口历史」：数据还没开始压，解码器就已经持有这份公共上下文，遇到字典里的词串直接引用，连第一个字节都不用写进输出流。gzip 的窗口永远从零开始，brotli 从 122 KB 的 web 先验起步——这是小文件上 brotli 优势尤其明显的原因（gzip 还没把窗口焐热，文件就结束了）。",
            bonus:
              "同思路的动态版是 zstd 的训练字典：对自家业务的同构数据（如大量相似 JSON）离线训练一份专用字典，Meta 官方数据把某 JSON 场景压缩比从 2.8x 提到 6.9x。",
          },
          {
            q: "zstd 凭什么做到压缩比 gzip 高、速度快还差不多？",
            intent: "压轴机制题，考对三代算法「差异在哪一层」的理解。",
            depth: 4,
            a: "三个来源。第一是熵编码换引擎：zstd 用 FSE（基于 ANS 有限状态熵）替代纯 Huffman，RFC 8878 原文明确「Two types of entropy encoding are used by the Zstandard format: FSE and Huffman coding.」——ANS 以接近算术编码的压缩率、接近 Huffman 的速度工作，这直接改写了压缩率-耗时的权衡曲线。第二是长距离匹配：实现层打开后窗口默认扩到 128 MB（zstd 手册：designed to improve compression ratio for large inputs, by finding large matches at long distance），大文件里 gzip 窗口外的重复它能抓住。第三是工程实现本身经过极限调优，同级速度全面领先（Cloudflare 实测 zstd 压缩 0.848ms vs gzip 0.872ms，压缩比却高一个档次）。",
            bonus:
              "代价是格式复杂度：ANS 的查表比 Huffman 分支难推理，早期浏览器对引入 libzstd 的体积与攻击面有顾虑——这正是 zstd 进浏览器比进服务器晚了八年的原因。",
          },
          {
            q: "为什么浏览器只在 HTTPS 上广告 br 和 zstd？纯 HTTP 就不能协商吗？",
            intent: "安全与协议演进题——考「协商头不可信」场景下的防御性设计。",
            depth: 4,
            a: "Chromium 的官方口径：「we'll be advertising support for 'zstd' encoding only if transferred data is opaque to proxies」，brotli 同理。原因是 Accept-Encoding 走在明文里，中间代理看得见却可能不认识：不支持 br 的旧代理会原样转发 br 字节流，或按自己的规则改写响应破坏协议一致性。HTTPS 让数据对中间层不透明——代理无法根据编码头做任何「聪明事」，协商才安全。推论：localhost 被浏览器视为安全上下文，本地 HTTP 开发环境照样能吃到 brotli。",
            bonus:
              "同一逻辑的镜像面：HTTPS 普及本身就是 br/zstd 得以铺开的前提——2015 年前明文 HTTP 为主的时代，这类「代理不认识的新编码」根本无法安全推广。",
          },
          {
            q: "2026 年给一个新站点做压缩选型，给出完整决策。",
            intent: "收官决策题，考把三代定位、协商机制、构建流程串成可执行方案的能力。",
            depth: 4,
            a: "静态资源：构建期生成双格式——brotli 最高档（q11）的 .br 与 gzip -9 的 .gz 同名共存，服务器按协商回最优、永远有兜底；构建期不计压缩耗时，白拿最小体积。动态接口：现压用低档位（gzip 6 或 zstd 12 / brotli 5 一档），配 gzip_min_length 免掉小响应；大流量接口把压缩卸载给 CDN 边缘。内部链路（镜像层、日志、备份、CI 缓存）全面 zstd。上线后用 curl -H 'Accept-Encoding: …' 逐格式验证协商链路，并保留 gzip 兜底回归测试。",
            bonus:
              "长期观察项：Compression Streams API 的 zstd 支持与 Safari 的推进节奏——浏览器端 JS 压缩一旦全面 zstd 化，前端侧的选型也要跟着重排。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "gzip 为什么能压小文件？",
            to: "/note/network/http/compression/gzip-deflate",
            description: "三代共同的算法地基：LZ77 回引与 Huffman 编码的两轮冗余消除。",
          },
          {
            title: "nginx.conf 解读",
            to: "/note/devtools/docker/deploy/nginx-conf-anatomy",
            description: "选型落地的地方：部署线里逐行拆 nginx 配置与压缩模块。",
          },
        ]}
      />
    </NoteShell>
  );
}
