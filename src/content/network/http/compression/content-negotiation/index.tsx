import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import {
  Callout,
  CompareTable,
  CrossRef,
  DoDont,
  Prerequisite,
  SequenceDiagram,
  SpecQuote,
} from "@/components/viz";
import { ShellBlock } from "@/components/demo";
import { PALETTE } from "@/components/palette";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        协商是两句话的对话：浏览器用请求头 <code>Accept-Encoding: gzip, br</code>{" "}
        <strong>声明能力</strong>，服务器挑一种双方都懂的，用响应头{" "}
        <code>Content-Encoding: gzip</code> <strong>宣布结果</strong>——没声明就默认能拿未压缩原文，
        所以 curl 不带头就测不到压缩。缓存层靠 <code>Vary: Accept-Encoding</code>{" "}
        知道「编码也是资源版本」。工程落地三件套：
        <strong>文本类型必压、已压缩格式与小响应排除、 静态资源构建期预压缩</strong>。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "从输入 URL 到页面渲染",
            to: "/note/frontend/browser/fundamentals/url-to-render",
          },
        ]}
      >
        协商发生在请求流水线的响应阶段——先知道 HTTP 请求怎么走，压缩协商才有着力点。
      </Prerequisite>

      <Heading level={2} title="一轮协商的完整往返" />
      <Paragraph>
        HTTP 内容协商的原则是<strong>服务端说了算、客户端先表态</strong>
        。浏览器在每个文本资源请求上带上
        <code>Accept-Encoding</code>，列出自己能解的编码与偏好顺序；服务器据此选择一种（或选择不压，
        回 <code>identity</code>），把实际采用的编码写进 <code>Content-Encoding</code>
        响应头。浏览器收到响应后先按声明解压、再交给渲染管线——整条链路对页面代码完全透明。
        实测一个真实站点（Wikipedia，curl 采集）：
      </Paragraph>
      <ShellBlock>{`$ curl -s -o /dev/null -D - -H 'Accept-Encoding: gzip, br' https://zh.wikipedia.org/wiki/Gzip | grep -iE 'content-encoding|vary'
content-encoding: gzip
vary: Accept-Encoding,X-Subdomain,Cookie,Accept-Language,Authorization,User-Agent

$ curl -s -o /dev/null -D - https://zh.wikipedia.org/wiki/Gzip | grep -i 'content-encoding'
（没有任何输出——没声明，服务器就发未压缩原文）`}</ShellBlock>
      <SequenceDiagram
        label="压缩协商往返 / negotiation round trip"
        actors={["浏览器", "服务器"]}
        messages={[
          {
            from: 0,
            to: 1,
            label: "GET /assets/app.js",
            note: "Accept-Encoding: gzip, br — 声明我能解的",
            color: PALETTE.blue,
          },
          {
            from: 1,
            to: 0,
            label: "200 OK",
            note: "Content-Encoding: gzip — 宣布我用了哪种",
            color: PALETTE.green,
          },
          {
            from: 1,
            to: 0,
            label: "Vary: Accept-Encoding",
            dashed: true,
            note: "告诉缓存层：同一 URL 有多个编码版本",
            color: PALETTE.orange,
          },
        ]}
      />

      <Heading level={2} title="Vary：给缓存层的版本说明" />
      <Paragraph>
        同一个 URL 现在有多个合法表示：gzip 版、brotli 版、未压缩版。浏览器私有缓存无所谓——它只存
        自己收到的那份。麻烦在<strong>共享缓存</strong>
        （代理、CDN）：如果缓存不知道「编码影响表示」， 它可能把 A 用户的 brotli 版直接吐给不支持
        brotli 的 B 用户。<code>Vary: Accept-Encoding</code>{" "}
        就是解决这个问题的：它告诉缓存「选版本时要把 Accept-Encoding 计入缓存键」。
      </Paragraph>
      <SpecQuote source="MDN《HTTP compression》指南">
        「As content negotiation has been used to choose a representation based on its encoding, the
        server must send a Vary header containing at least Accept-Encoding alongside this header in
        the response; that way, caches will be able to cache the different representations of the
        resource.」——带 Vary 是协商机制的一半，不是可选项。
      </SpecQuote>
      <Paragraph>
        上面 Wikipedia 实测里 <code>vary</code> 头把 Cookie、User-Agent
        一并列入，说明它的缓存维度远不止编码。反过来看第二段实测：
        <strong>没发 Accept-Encoding 的请求拿不到 Content-Encoding</strong>——响应头里只剩
        vary。这就是「没声明就没协商」的直接证据， 也是下一节排查命令的原理。
      </Paragraph>

      <Heading level={2} title="服务器侧：默认值全是坑" />
      <Paragraph>
        「我 nginx 配了 gzip 怎么 JS 还是没压？」——几乎都是默认值惹的祸。据 nginx
        官方文档（ngx_http_gzip_module）：<code>gzip</code> 默认 <strong>off</strong>；
        <code>gzip_types</code> 默认只有 <strong>text/html</strong>（其他 MIME 一概不压，这是个历史
        遗留默认）；<code>gzip_comp_level</code> 默认是 <strong>1</strong>（不是手册惯性思维的 6）；
        <code>gzip_min_length</code> 默认仅 <strong>20 字节</strong>。现代 SPA 的响应全是
        application/javascript、application/json——落在默认清单之外，于是一行 <code>gzip on</code>{" "}
        什么都没压到。
      </Paragraph>
      <DoDont
        label="压缩类型清单 / gzip_types"
        dont={{
          code: `# nginx.conf
gzip on;    # 就这一行——默认 off 被打开，但
            # types 只有 text/html，级别还是 1`,
          note: "JS/CSS/JSON 全部漏网，偶尔只有内联 HTML 页被压到",
        }}
        do={{
          code: `gzip on;
gzip_types text/css application/javascript
           application/json image/svg+xml;
gzip_comp_level 6;      # 动态响应别拉满，CPU 要钱
gzip_min_length 1024;   # 小响应手续费不划算`,
          note: "文本清单 + 级别 + 阈值；png/mp4/woff2 永远别进清单",
        }}
      />
      <Paragraph>
        排除清单的价值不只是「省 CPU」：<strong>已压缩格式再压是净亏损</strong>（JPEG/MP4/woff2
        内部已是高熵压缩态），<strong>小文件再压是负收益</strong>（43 字节压成 45
        字节的固定开销账）。清单的本质是把压缩器对准它擅长的高冗余文本，其余全部绕行。
      </Paragraph>
      <DoDont
        label="验证压缩是否生效 / verify"
        dont={{
          code: `$ curl -I https://site.com/app.js
# 没有 Content-Encoding 就断定「没开压缩」`,
          note: "curl 默认不发 Accept-Encoding，服务器自然回未压缩——协商的前提是声明",
        }}
        do={{
          code: `$ curl -sI -H 'Accept-Encoding: gzip' \\
  https://site.com/app.js | grep -i content-encoding
content-encoding: gzip`,
          note: "主动声明能力，才能测出协商链路是否通畅",
        }}
      />

      <Heading level={2} title="动态现压 vs 静态预压缩" />
      <Paragraph>
        服务器拿到请求再现场压缩，CPU 开销每个请求都要付一遍；而静态资源的内容在构建时就已确定——
        更优的分工是<strong>构建期把 .gz 提前压好放在旁边</strong>，nginx 直接吐现成文件，零压缩
        开销。nginx 为此提供了独立模块，据官方文档：「The ngx_http_gzip_static_module module allows
        sending precompressed files with the '.gz' filename extension instead of regular files.」——
        请求 app.js 时若旁边有 app.js.gz 就直接回它，协商仍然照常进行。
      </Paragraph>
      <CompareTable
        label="两种压缩时机 / compress timing"
        left={{ title: "动态现压", color: PALETTE.orange }}
        right={{ title: "静态预压缩", color: PALETTE.green }}
        rows={[
          { aspect: "谁来压", left: "nginx 每个请求现场压", right: "vite 等构建工具在 CI 里压好" },
          { aspect: "CPU 成本", left: "每个请求都付一遍", right: "构建时付一次，服务期零成本" },
          {
            aspect: "内容时效",
            left: "永远与源一致（现算的）",
            right: "源文件更新必须重新生成 .gz",
          },
          { aspect: "适用", left: "动态接口、个性化响应", right: "带 hash 文件名的静态资源" },
          {
            aspect: "nginx 侧",
            left: "ngx_http_gzip_module",
            right: "ngx_http_gzip_static_module",
          },
        ]}
      />
      <Paragraph>
        两种方式在浏览器里汇合成一个日常景象：DevTools Network 面板的 Size 列显示两个数字（如{" "}
        <code>1.2 MB / 300 kB</code>）——斜杠前是解压后的真实大小，斜杠后是网络上
        实际传输的压缩后大小，两者的比值就是压缩协商给你省下的流量。构建期还能比 nginx
        更激进：不计时间用最高级别（甚至 zopfli 这类极限 DEFLATE 编码）压一次，服务期零成本白拿
        最小体积——「压缩贵、解压廉」的不对称性在架构上的全部兑现。
      </Paragraph>
      <Callout kind="info" title="br 与 zstd 只在 HTTPS 协商">
        浏览器只在安全上下文（HTTPS，localhost 亦视为安全）的广告里放 br/zstd——Chromium
        官方表述：「like Brotli, Zstd is only available in secure contexts i.e. over https」。纯
        HTTP 环境协商只能落在 gzip。算法间的取舍详见「gzip、brotli、zstd 怎么选？」篇。
      </Callout>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "浏览器不发 Accept-Encoding，服务器会主动压缩吗？",
            intent: "热身题，考协商的方向——「服务端说了算」的前提是客户端先表态。",
            depth: 1,
            a: "不会。内容协商由客户端声明驱动：没有 Accept-Encoding，服务器按未压缩表示响应（不写 Content-Encoding）。本篇实测里对 Wikipedia 不带头的 curl 请求就没有任何编码头。这一设计让「不支持压缩的 ancient 客户端」天然安全——它们根本不会声明。",
            bonus:
              "浏览器永远主动声明，curl 默认不声明——所以「用 curl 验证压缩」必须手动加 -H 'Accept-Encoding: gzip'，这是最常见的验证乌龙。",
          },
          {
            q: "响应少了 Vary: Accept-Encoding 会出什么事故？",
            intent: "考共享缓存的版本混淆——能否推演出「错版投递」的具体链路。",
            depth: 2,
            a: "共享缓存（代理、CDN）默认按 URL 做缓存键。A 用户（支持 br）的 brotli 响应被缓存后，B 用户（老客户端，只懂 gzip）请求同一 URL，缓存直接回 brotli 字节——B 无法解码，页面白屏或乱码。Vary: Accept-Encoding 把编码纳入缓存键，强制不同编码版本分开存。MDN 压缩指南把它定为「must」。",
            bonus:
              "反向事故也存在：无脑 Vary 一大堆头（如 Wikipedia 连 User-Agent 都 Vary）会让缓存键爆炸，命中率暴跌——Vary 是正确性与命中率的权衡。",
          },
          {
            q: "nginx 明明 gzip on 了，为什么 JS 响应还是没压缩？",
            intent: "考默认值的事实核查习惯——线上压缩问题多半是配置默认值踩坑。",
            depth: 3,
            a: "按官方文档：gzip_types 默认只有 text/html，application/javascript 不在清单里，压不到；另外 gzip_static、gzip 模块都默认关闭。SPA 场景必须显式列 gzip_types（css/javascript/json/svg），配 gzip_comp_level 与 gzip_min_length。调试顺序：先 curl -H 'Accept-Encoding: gzip' 看有没有 Content-Encoding，再核对响应的 Content-Type 是否在 gzip_types 清单里——两者对不上是最常见断点。",
            bonus:
              "还有个隐蔽断点：中间层（如某些代理）会剥离 Accept-Encoding 或替你重新压缩，本地 curl 直连正常、过 CDN 失效时先查中间层。",
          },
          {
            q: "DevTools 的 Size 列显示 1.2 MB / 300 kB，各是什么？",
            intent: "考工具读数与协商机制的连接——两个数字分别对应协商链路的哪一端。",
            depth: 3,
            a: "斜杠前是资源解压后的真实大小（渲染管线拿到的字节），斜杠后是网络上实际传输的字节数（Content-Encoding 生效后的压缩流）。两者差值即压缩收益；如果两个数字相等，说明这条请求没走压缩（类型不在清单、体积低于阈值、或中间层剥了协商）——Size 列是协商链路最直观的体检表。",
            bonus:
              "配合 Protocol 列还能看到 h2/h3：HTTP/2 下头部由 HPACK 单独压缩，与 Content-Encoding 的 body 压缩是两套互不相干的机制。",
          },
          {
            q: "动态 JSON 接口的压缩策略和静态资源有什么不同？",
            intent: "压轴题，考「现压的 CPU 账」——能否给出分场景的可执行策略而非一句话开/关。",
            depth: 4,
            a: "动态接口该压（JSON 是高冗余文本），但只能现压，账要算清：级别 6 以上压缩耗时陡增，高并发下 CPU 先于带宽成为瓶颈。可执行策略：响应体小于 1KB 的不压（手续费大于收益，nginx gzip_min_length 兜住）；常规接口 gzip_comp_level 4~6；大响应、大流量的接口优先考虑 CDN 边缘压缩或 zstd 这类「同级更快」的算法，把现压成本压下来。",
            bonus:
              "个别场景反着来：已经被业务层压缩过的响应（服务端手写了压缩、或返回的是压缩文件内容）务必从 gzip_types 排除，双重压缩纯烧 CPU。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "gzip、brotli、zstd 怎么选？",
            to: "/note/network/http/compression/brotli-zstd",
            description: "协商清单里该放谁：三代算法的参数、格局与 2026 年的选型策略。",
          },
          {
            title: "nginx.conf 解读",
            to: "/note/devtools/docker/deploy/nginx-conf-anatomy",
            description: "协商配置真正的落点：部署线里逐行拆 nginx 配置文件。",
          },
        ]}
      />
    </NoteShell>
  );
}
