import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { FlowChart } from "@/components/demo/FlowChart";
import {
  BarChart,
  CompareTable,
  CrossRef,
  DoDont,
  MemoryCard,
  Timeline,
  VizBlock,
} from "@/components/viz";
import { motion } from "framer-motion";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        「输入 URL 到渲染」是浏览器面试的总纲：
        <strong>
          缓存判定（Service Worker 拦截 → 强缓存）→ DNS 解析 → TCP 握手 → TLS → HTTP
          请求（协商缓存随请求头走）→ 响应 → 渲染管线
        </strong>
        （解析 HTML 建 DOM/CSSOM → 渲染树 → 布局 → 绘制 →
        合成）。性能优化的全部套路都是这两句话的展开：
        <strong>减少网络往返</strong>（强缓存 + 指纹文件名、CDN、HTTP/2）和
        <strong>不阻塞渲染管线</strong>（关键 CSS、JS 异步加载、动画只动合成属性）。
        缓存先强缓存后协商，强缓存命中时连 DNS
        都不会发生；渲染成本三档位（回流＞重绘＞合成）的引擎机制见专题篇「回流与重绘」。
      </Conclusion>

      <Heading level={2} title="全景流水线" />
      <Paragraph>
        这道题能答多深，取决于你能否把散落的知识点挂到一条主线上。从敲下回车开始，
        <strong>缓存判定走在一切网络动作之前</strong>
        ：请求先被 <strong>Service Worker</strong>{" "}
        拦截（注册了的话，它可以直接用本地资源应答）；随后是
        <strong>强缓存判定</strong>——<code>Cache-Control</code> 有效期内直接使用本地副本，
        <strong>一个字节都不会发上网络，连 DNS 都不会发生</strong>。判定未命中才走 DNS（浏览器缓存 →
        系统 → 路由器 → 运营商 → 根/顶级/权威服务器）拿到 IP，TCP 三次握手建立连接（HTTPS 再加 TLS
        握手协商密钥）；然后发送 HTTP 请求——
        <strong>协商缓存</strong>的校验头（If-None-Match / If-Modified-Since）就随这枚请求一起出发，
        由服务器裁定 304 复用还是 200 新内容。拿到响应后浏览器进入渲染阶段。
      </Paragraph>

      <FlowChart
        label="全景流水线 / pipeline"
        height={560}
        data={{
          direction: "TB",
          nodes: [
            { id: "url", label: "输入 URL", color: "#1677ff" },
            { id: "sw", label: "Service Worker 拦截（可编程直接应答）", color: "#8b5cf6" },
            { id: "strong", label: "强缓存判定：max-age 未过期？", color: "#8b5cf6" },
            { id: "local", label: "使用本地副本（0 网络往返）", color: "#3fb950" },
            { id: "dns", label: "DNS 解析（多级缓存 → 权威服务器）", color: "#f59e0b" },
            { id: "tcp", label: "TCP 三次握手 + TLS 握手", color: "#f59e0b" },
            { id: "req", label: "发送 HTTP 请求（协商缓存头随请求走）", color: "#f59e0b" },
            { id: "neg", label: "服务器比对 ETag / Last-Modified", color: "#8b5cf6" },
            { id: "resp", label: "HTTP 响应（200 新内容 / 304 复用）", color: "#3fb950" },
            { id: "parse", label: "解析 HTML → DOM 树 + CSSOM 树", color: "#1677ff" },
            { id: "tree", label: "合成渲染树（排除 display:none）", color: "#1677ff" },
            { id: "layout", label: "布局 Layout（计算几何 → 回流）", color: "#f85149" },
            { id: "paint", label: "绘制 Paint（像素填充 → 重绘）", color: "#f85149" },
            { id: "composite", label: "合成 Composite（GPU 层合成）", color: "#3fb950" },
          ],
          edges: [
            { source: "url", target: "sw" },
            { source: "sw", target: "strong", label: "未拦截 / 放行" },
            { source: "strong", target: "local", label: "命中：不发任何网络请求", dashed: true },
            { source: "strong", target: "dns", label: "未命中" },
            { source: "dns", target: "tcp" },
            { source: "tcp", target: "req" },
            { source: "req", target: "neg", label: "带 If-None-Match / If-Modified-Since" },
            { source: "neg", target: "resp", label: "未变更 → 304" },
            { source: "req", target: "resp", label: "无校验头 → 直接 200" },
            { source: "resp", target: "parse" },
            { source: "local", target: "parse", label: "本地副本同样进入解析" },
            { source: "parse", target: "tree" },
            { source: "tree", target: "layout" },
            { source: "layout", target: "paint" },
            { source: "paint", target: "composite", label: "分层上传 GPU" },
          ],
        }}
      />
      <Paragraph>
        渲染管线的五个阶段是所有「为什么页面卡」问题的根：解析（HTML/CSS 变成 DOM 与
        CSSOM）、渲染树合成、布局（算几何位置）、绘制（填充像素）、合成（GPU
        把各层拼成最终画面）。改几何属性触发全链路，改颜色跳过布局，改 transform/opacity
        连绘制都跳过——只走合成。这个「管线跳级」就是动画优化的底层逻辑。
      </Paragraph>

      <BarChart
        label="阶段耗时直觉 / rtt scale"
        title="典型网络下的量级直觉，仅供直觉（实际取决于 RTT、缓存与资源形态）"
        items={[
          { label: "DNS 解析", value: 87, suffix: "ms", color: "#f59e0b" },
          { label: "TCP 握手", value: 28, suffix: "ms", color: "#f59e0b" },
          { label: "TLS 握手", value: 56, suffix: "ms", color: "#f59e0b" },
          { label: "请求 + 响应", value: 42, suffix: "ms", color: "#1677ff" },
        ]}
      />

      <Heading level={2} title="缓存体系：面试必考的主战场" />
      <Paragraph>
        缓存是这场考试里区分度最高的部分。判定顺序固定，且先于任何网络请求：
        <strong>先查强缓存</strong>
        ——
        <code>Cache-Control: max-age</code> 在有效期内直接用本地副本，一个字节都不问服务器（
        <code>no-cache</code> 不是不缓存，而是「跳过强缓存、每次都协商」；<code>no-store</code>{" "}
        才是真不存）；<strong>强缓存过期后走协商缓存</strong>——带上 <code>If-None-Match</code>
        （对应响应里的 ETag）或 <code>If-Modified-Since</code>
        （对应 Last-Modified）问服务器「资源变了吗」，没变返回 304 复用本地文件，变了返回 200
        加新内容。
      </Paragraph>
      <Paragraph>
        为什么有了 Last-Modified 还要 ETag？因为 mtime
        只有秒级精度（一秒内多次修改检测不到）、内容不变仅 mtime 变会误判、分布式集群各机器 mtime
        可能不一致。ETag 基于内容指纹（hash 或 inode+size+mtime 组合）解决这三个问题，两者同时存在时
        <strong>ETag 优先</strong>。工程实践的最佳组合是：<strong>带内容指纹的文件名 + </strong>
        <code>Cache-Control: max-age=31536000, immutable</code>
        ——文件变了名字就变，等于永远命中强缓存，协商缓存只在 HTML 入口上使用。
      </Paragraph>

      <Timeline
        label="缓存判定链 / cache flow"
        steps={[
          { label: "Service Worker", sub: "可编程拦截，可短路应答", color: "#8b5cf6" },
          { label: "强缓存", sub: "max-age 内直接用，不发请求", color: "#1677ff" },
          { label: "DNS + 建连", sub: "强缓存未命中才发生", color: "#f85149" },
          { label: "协商缓存", sub: "校验头随请求走，304/200", color: "#f59e0b" },
        ]}
      />
      <CompareTable
        label="对比 / cache compare"
        left={{
          title: "强缓存",
          color: "#3fb950",
          points: [
            "决策方：浏览器本地，服务器不参与",
            "命中表现：from memory/disk cache，0 RTT",
            "控制 Header：Cache-Control / Expires",
            "过期后：转入协商缓存继续判断",
          ],
        }}
        right={{
          title: "协商缓存",
          color: "#1677ff",
          points: [
            "决策方：服务器裁定，需要一个 RTT",
            "命中表现：304 Not Modified（空体）",
            "控制 Header：ETag/If-None-Match、Last-Modified/If-Modified-Since",
            "适用对象：HTML 入口（保证新版本可被发现）",
          ],
        }}
      />
      <DoDont
        label="缓存策略 / caching"
        dont={{
          code: `Cache-Control: no-cache
# 用在所有资源上 → 每次都协商
# 高频访问的 JS/CSS 全在浪费往返`,
          note: "全部资源都协商缓存：强缓存形同虚设，304 满天飞，延迟至少一个 RTT",
        }}
        do={{
          code: `# JS/CSS：文件名带指纹，一年强缓存
app.a3f9c2.js → max-age=31536000, immutable
# HTML 入口：永远协商，保证新版本能被发现
index.html  → no-cache`,
          note: "指纹文件名让「永久缓存」安全——内容变即名字变，新版本经 HTML 入口发现",
        }}
      />
      <MemoryCard keyword="缓存口诀" color="#1677ff">
        先强后协商；<code>no-cache</code> 是「每次协商」、<code>no-store</code> 才是不缓存； ETag
        优先于 Last-Modified；<strong>指纹文件 + 长强缓存 + HTML 入口协商</strong>{" "}
        是现代前端的标配组合。
      </MemoryCard>

      <Heading level={2} title="渲染成本的三档位" />
      <Paragraph>
        渲染管线的成本递减：<strong>回流</strong>（几何变化，重新布局，最贵）→
        <strong>重绘</strong>（外观变化，重新填充像素）→ <strong>合成</strong>
        （GPU 拼层，几乎免费）。改 width/top 走满整条管线；改 color/background
        跳过布局；transform/opacity
        由合成器线程直改，主线程卡死照样播放。这条成本线背后有一套完整的引擎机制——脏位标记、失效传播边界、读写交错的强制同步布局——全部展开在独立专题「
        <strong>为什么改一个样式会引发重排</strong>」一篇里，含布局抖动模拟器与度量手段。
      </Paragraph>

      <BarChart
        label="成本三档 / cost tiers"
        title="同规模改动的相对成本直觉，仅供直觉；触发清单与引擎机制见专题篇"
        items={[
          { label: "回流", value: 100, suffix: "%", color: "#f85149" },
          { label: "重绘", value: 35, suffix: "%", color: "#f59e0b" },
          { label: "合成", value: 5, suffix: "%", color: "#3fb950" },
        ]}
      />

      <Heading level={2} title="HTTP 演进与安全轮廓" />
      <Timeline
        label="HTTP 演进 / evolution"
        steps={[
          { label: "HTTP/1.0", sub: "短连接，每请求一次握手", color: "#8b5cf6" },
          { label: "HTTP/1.1", sub: "长连接 · 管道未启用 · 队头阻塞", color: "#f59e0b" },
          { label: "HTTP/2", sub: "二进制分帧 · 多路复用 · HPACK", color: "#1677ff" },
          { label: "HTTP/3", sub: "QUIC over UDP · 0-RTT · 流独立重传", color: "#3fb950" },
        ]}
      />
      <Paragraph>
        HTTP/1.1 的核心痛点是<strong>队头阻塞</strong>：一个 TCP
        连接上响应必须按序返回，前一个没完后面的全等着（浏览器只能靠开 6 个连接缓解）。HTTP/2 用
        <strong>二进制分帧</strong>把报文拆成帧、在一条连接上多路复用，帧属于哪个响应由流 ID
        标注，互不排队；头部压缩（HPACK）顺带解决了 1.1 时代重复 header 的浪费。HTTP/2 的残余问题在
        TCP 层——丢包时整条连接的所有流都要等重传，于是 HTTP/3 换用基于 UDP 的
        QUIC，在传输层彻底解决。两条泳道直观感受「串行」与「帧交错」的差别：
      </Paragraph>

      <HolLanes />
      <Paragraph>
        HTTPS = HTTP + TLS：用<strong>非对称加密</strong>（证书公钥）交换 <strong>对称加密</strong>
        的会话密钥，之后全部流量走对称加密（性能好）；证书由 CA 签名防中间人。
      </Paragraph>
      <Paragraph>
        与「响应拿到手之后」这条主线交汇的还有一类话题——<strong>安全</strong>
        ，本篇只勾轮廓。两大高频攻击的信任模型完全相反：<strong>XSS</strong>{" "}
        把恶意脚本当成本站代码执行，利用的是「站点对输出的信任」，防御走输出转义、CSP、HttpOnly
        cookie；<strong>CSRF</strong> 让第三方页面借用户 cookie
        发伪造请求，利用的是「服务器对请求来源的信任」，防御走 CSRF token、 SameSite cookie、校验
        Origin。一句话分野：一个防「注入执行」、一个防「伪造请求」—— 展开属于独立的 Web
        安全专题，这里记住信任模型的分野即可。
      </Paragraph>

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "强缓存和协商缓存的判断顺序？no-cache 和 no-store 区别？",
            intent: "热身题，缓存体系的准入门槛——no-cache 的语义错误是每年都能刷掉一批人的经典坑。",
            depth: 2,
            a: "先强缓存后协商：max-age 有效期内直接用本地副本（不发请求）；过期后带 If-None-Match/If-Modified-Since 发协商请求，未变返回 304。no-cache 是「可以缓存但每次使用前必须协商」；no-store 才是彻底不缓存——把 no-cache 理解成「不缓存」是最常见的面试事故。",
            bonus:
              "强缓存命中在 DevTools 里显示为 from memory cache（短周期，渲染进程内存）或 from disk cache（长周期，磁盘），两者的分配策略浏览器自定，不是规范强制的。",
          },
          {
            q: "为什么有了 Last-Modified 还需要 ETag？两者冲突时听谁的？",
            intent:
              "考协商缓存设计动机——答出「秒级精度」算合格，能把分布式一致性问题带出来的是加分层。",
            depth: 3,
            a: "mtime 方案有三个盲区：精度只有秒级（一秒内多次修改检测不到）；内容没变但 mtime 变了会误判；分布式集群各节点 mtime 不一致导致协商结果摇摆。ETag 用内容指纹解决这三个问题，两者同时下发时按规范 ETag 优先（If-None-Match 优先于 If-Modified-Since）。",
            bonus:
              "ETag 的代价是服务器要做内容 hash（CPU 开销），大文件场景 nginx 默认用 size+mtime 组合而非全量 hash——这也是「ETag 是怎么生成的」的真实答案。",
          },
          {
            q: "HTTP/2 的多路复用为什么能解决队头阻塞？彻底解决了吗？",
            intent:
              "考协议演进的理解层次——多数人停在「2.0 有多路复用」，能指出 TCP 层残余问题的才到进阶线。",
            depth: 3,
            a: "HTTP/1.1 的响应在一个连接上必须按序完整返回，前面的响应慢，后面全部排队——这是应用层的队头阻塞。HTTP/2 把报文拆成二进制帧，一条 TCP 连接上多个流交错传输、按流 ID 重组，单个慢响应不再堵住别人。但没彻底解决：TCP 只认识字节流，一旦丢包，内核要等重传补齐才能交付后续字节——所有流一起卡住，这是传输层的队头阻塞，最终由 HTTP/3 用 UDP 基础上的 QUIC（流间独立重传）解决。",
            bonus:
              "HTTP/1.1 其实有过 pipeline 尝试，但因「响应必须按序」且中间代理兼容性差，浏览器默认从未开启——「1.1 支持管道化」而无「启用」是另一个考点陷阱。",
          },
          {
            q: "接手一个首屏很慢的项目，你的排查和优化路径是什么？",
            intent: "体系化压轴题，把缓存、渲染、网络全部串起来——考察的是方法论而不是背优化清单。",
            depth: 4,
            a: "先测量再动手：Network 面板看瀑布图（DNS/TLS/首字节/下载各占多少，谁在阻塞）、Performance 面板看主线程（长任务在哪）、Lighthouse 看 FCP/LCP 指标。然后按瓶颈对症下药：网络慢→CDN、HTTP/2、关键资源 preload；体积大→代码分割、按需加载、压缩与图片格式优化；渲染慢→关键 CSS 内联、JS 加 defer/async、长列表虚拟化、动画走 transform；缓存差→指纹文件名+强缓存+HTML 协商。每改一项都要回测量验证，优化不做无功之劳。",
            bonus:
              "进阶认知：LCP 大头通常是「最大内容元素」的图片与字体，font-display: swap、图片 preload + 现代格式（WebP/AVIF）往往比压缩 JS 更立竿见影。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "为什么改一个样式会引发重排：回流与重绘",
            to: "/note/frontend/browser/fundamentals/reflow-repaint",
            description: "渲染成本怎么一档档算出来：脏位、失效传播、布局抖动与度量手段。",
          },
          {
            title: "为什么有了索引还要回表？",
            to: "/note/database/mysql/index/covering-index",
            description: "「缓存与检索成本」思想在数据库侧的形态：B+ 树、回表与覆盖索引。",
          },
          {
            title: "setState 之后 React 做了什么？",
            to: "/note/frontend/react/core/setstate-scheduling",
            description: "渲染之上的调度：框架如何入队、合并并驱动这些 DOM 更新。",
          },
        ]}
      />
    </NoteShell>
  );
}

function HolLanes() {
  const frames = [
    { label: "A1", color: "#1677ff" },
    { label: "B1", color: "#8b5cf6" },
    { label: "C1", color: "#f59e0b" },
    { label: "A2", color: "#1677ff" },
    { label: "B2", color: "#8b5cf6" },
    { label: "C2", color: "#f59e0b" },
  ];
  return (
    <VizBlock label="队头阻塞 vs 多路复用 / head-of-line" color="#8b5cf6">
      <div className="space-y-5">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-muted">
              HTTP/1.1 · 一条连接 · 响应必须按序（A 慢，B/C 全等）
            </span>
            <span className="font-mono text-[10px] text-muted">总耗时 ≈ 300ms</span>
          </div>
          <div className="flex gap-1">
            <motion.div
              initial={{ opacity: 0, scaleX: 0.5 }}
              whileInView={{ opacity: 1, scaleX: 1 }}
              viewport={{ once: true }}
              className="flex h-11 flex-1 items-center justify-center rounded-md font-mono text-[11px]"
              style={{ backgroundColor: "#1677ff1a", color: "#1677ff" }}
            >
              请求 A · 100ms
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="flex h-11 flex-1 items-center justify-center rounded-md border border-dashed border-border font-mono text-[11px] text-muted"
            >
              B 等待 A
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex h-11 flex-1 items-center justify-center rounded-md border border-dashed border-border font-mono text-[11px] text-muted"
            >
              C 等待 B
            </motion.div>
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-muted">
              HTTP/2 · 同一条连接 · 帧交错，按流 ID 重组
            </span>
            <span className="font-mono text-[10px] text-muted">总耗时 ≈ 100ms</span>
          </div>
          <div className="flex gap-1">
            {frames.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex h-11 flex-1 items-center justify-center rounded-md font-mono text-[11px] font-bold"
                style={{ backgroundColor: `${f.color}1a`, color: f.color }}
              >
                {f.label}
              </motion.div>
            ))}
          </div>
          <div className="mt-1.5 text-[11px] leading-relaxed text-muted">
            A1/B1/C1 是三个响应交错的帧，流 ID 标注归属——慢响应不再堵住别人；但 TCP
            层丢包仍会让所有流一起等重传，这就是 HTTP/3 换 QUIC 的原因。
          </div>
        </div>
      </div>
    </VizBlock>
  );
}
