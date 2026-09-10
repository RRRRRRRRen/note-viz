import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import { CodeBlock, FlowChart } from "@/components/demo";
import { CrossRef, DoDont, MemoryCard, Prerequisite, Timeline } from "@/components/viz";
import LayoutThrashingSimulator from "./LayoutThrashingSimulator";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        渲染成本的三个档位：<strong>回流（布局）＞ 重绘（绘制）＞ 合成（GPU 拼层）</strong>
        。引擎机制一句话：布局是<strong>惰性</strong>的——写操作只打脏位标记，到帧边界才批量处理； 但
        <strong>读几何属性</strong>需要最新值，树是脏的就立即强制同步布局。循环里读写交错 =
        布局抖动（每读一次 flush 一次）。失效传播到<strong>最近清洁边界</strong>
        才停，<code>contain</code> 可以人为设界收窄波及范围。<code>transform</code>/
        <code>opacity</code> 走合成器线程，主线程繁忙照样流畅——但层提升有显存代价，警惕层爆炸。
      </Conclusion>

      <Prerequisite
        notes={[
          {
            title: "从输入 URL 到页面渲染，中间发生了什么？",
            to: "/note/frontend/browser/fundamentals/url-to-render",
          },
        ]}
      >
        回流与重绘是渲染流水线的后两站——先有「HTML 到像素」的全景图，成本模型才有挂靠的位置。
      </Prerequisite>

      <Heading level={2} title="一帧的生命周期：批处理发生在哪" />
      <Paragraph>
        渲染器的一帧沿固定顺序推进：输入事件分发 → JS 任务 → <code>requestAnimationFrame</code> 回调
        → 样式重算（Style）→ 布局（Layout）→ 绘制（Paint）→ 合成器提交（Composite） → 剩余时间交给
        idle 回调。这个顺序决定了两条铁律：<strong>写操作不会立刻产生像素</strong>
        （样式与布局是惰性的，改动只打脏位标记，攒到帧边界的 Style/Layout 阶段统一处理）；而{" "}
        <code>rAF</code> 的回调恰好排在 Style 之前——它是「本帧最后一次改动样式的机会」。
      </Paragraph>
      <Paragraph>
        强制同步布局的根源就在这个批处理机制里：JS 执行阶段位于 Style/Layout <strong>之前</strong>
        ，此时上一帧的布局树还是「干净」的缓存；如果你的代码
        <strong>先写了样式再读几何</strong>
        ，引擎发现脏位已置、但布局结果还没算，只能中断 JS、同步跑完 Style → Layout
        把最新值交给你——这就是 DevTools 里紫色的 forced reflow。一次不致命，循环里每轮都来就致命了。
      </Paragraph>

      <Timeline
        label="一帧的生命周期 / frame lifecycle"
        steps={[
          { label: "输入事件", sub: "主线程", color: "#1677ff" },
          { label: "JS 任务", sub: "主线程", color: "#f59e0b" },
          { label: "rAF 回调", sub: "本帧最后的写机会", color: "#8b5cf6" },
          { label: "Style", sub: "样式重算", color: "#1677ff" },
          { label: "Layout", sub: "脏节点布局", color: "#f85149" },
          { label: "Paint", sub: "生成绘制指令", color: "#f59e0b" },
          { label: "Composite", sub: "合成器线程", color: "#3fb950" },
        ]}
      />

      <Heading level={2} title="回流的触发与失效传播" />
      <Paragraph>
        触发回流的操作清单：改几何属性（width/height/padding/margin/border/font-size/line-height）、改内容（文本、
        <code>innerText</code>、图片尺寸）、DOM 增删、<code>display</code> 切换、窗口 resize
        、字体加载完成触发重排、以及<strong>读取几何信息</strong>
        （offset*/client*/scroll*/getBoundingClientRect、 getComputedStyle
        的布局相关属性——前提是树是脏的）。注意 <code>visibility</code>、<code>box-shadow</code>{" "}
        这类「看着像几何」的属性不影响布局，只触发重绘。
      </Paragraph>
      <Paragraph>
        波及范围由<strong>失效传播</strong>
        决定，不是「整个页面一律重排」：脏位从改动节点向上标记， 直到撞上一个
        <strong>清洁边界</strong>才停——positioned 祖先、<code>contain: layout</code>{" "}
        元素都是边界；布局时从最近的清洁祖先向下重新计算。所以「一个固定尺寸绝对定位容器里的改动」波及远小于「文档流深处的改动」。这也是{" "}
        <code>contain</code> 属性的原理：显式声明「我的子树变化不会外溢」，把边界人工画在那里。
      </Paragraph>

      <FlowChart
        label="属性改动的路径 / change path"
        height={380}
        data={{
          direction: "TB",
          nodes: [
            { id: "change", label: "DOM / 样式改动（打脏位）", color: "#f59e0b" },
            { id: "style", label: "Style 样式重算（任何改动必经）", color: "#8b5cf6" },
            { id: "reflow", label: "Layout 回流（几何 / 内容变化）", color: "#f85149" },
            { id: "paint", label: "Paint 重绘（仅外观变化）", color: "#f59e0b" },
            { id: "composite", label: "合成器直改（transform / opacity）", color: "#3fb950" },
            { id: "out", label: "Commit → Raster（栅格化）→ Draw", color: "#1677ff" },
          ],
          edges: [
            { source: "change", target: "style" },
            { source: "style", target: "reflow", label: "几何 / 内容" },
            { source: "style", target: "paint", label: "仅外观" },
            { source: "style", target: "composite", label: "已提升层" },
            { source: "reflow", target: "out", label: "随后仍要重绘 + 合成" },
            { source: "paint", target: "out" },
            { source: "composite", target: "out", label: "跳过主线程绘制" },
          ],
        }}
      />

      <Heading level={2} title="强制同步布局与布局抖动" />
      <Paragraph>
        「读几何属性 = 强制回流」是常见的过度概括，准确表述是：
        <strong>树脏的时候读，才强制</strong>
        。树干净时 <code>getBoundingClientRect()</code>{" "}
        读的是上次布局的缓存结果，几乎免费。真正的事故模式是
        <strong>布局抖动（layout thrashing）</strong>：循环里对每个节点「写 → 读 → 写 →
        读」——每次写把树弄脏，紧接着的读强制 flush ，一帧之内 N 个节点触发 N
        次完整布局，主线程直接打满。
      </Paragraph>
      <Paragraph>
        解法是<strong>读写分离</strong>
        ：先把所有要读的量批量读完（首个读触发唯一一次布局，后续读干净树），再批量写；
        写完的脏位留到帧边界统一处理。写库 FastDOM、以及把写操作挪进 rAF
        的分帧模式，本质都是这个。用下面的模拟器跑两种模式，差距一 目了然：
      </Paragraph>

      <DoDont
        label="读写分离 / read-write split"
        dont={{
          code: `// 交错：N 个节点 = N 次强制布局
for (const el of items) {
  const h = el.getBoundingClientRect().height; // 读（脏→flush）
  el.style.height = h * 2 + "px";             // 写（弄脏）
}`,
          note: "每次读取都撞上上一轮写入的脏位，一帧 N 次完整布局",
        }}
        do={{
          code: `// 分离：先读全量，再写全量 = 1 次布局
const heights = items.map(
  (el) => el.getBoundingClientRect().height   // 批量读
);
items.forEach((el, i) => {
  el.style.height = heights[i] * 2 + "px";    // 批量写
});`,
          note: "首个读取触发唯一一次布局，写下的脏位留到帧边界统一处理",
        }}
      />
      <LayoutThrashingSimulator />

      <Heading level={2} title="重绘、合成与层树" />
      <Paragraph>
        属性按成本分三档（下图即选型依据）：<strong>仅合成</strong>——transform/opacity
        在已提升的合成层上，改动只更新层变换与透明度，主线程 Paint 都不用跑，由合成器线程在 Raster →
        Draw 阶段直接完成；<strong>仅重绘</strong>
        ——color/background/visibility/box-shadow
        不动几何，重新生成绘制指令、重新栅格化，但布局不重算；<strong>回流</strong>
        ——几何与内容变化，从 Style 一路走满整条管线。
      </Paragraph>
      <Paragraph>
        合成层的来源要心里有数：3D transform、<code>will-change</code> 指定的属性、video/canvas、
        部分条件下的 fixed 元素都会被提升。每层是一块显存里的纹理，面积按{" "}
        <strong>尺寸 × dpr²</strong> 计算——给长列表的每一项都加 <code>will-change</code>{" "}
        就是层爆炸的经典现场：显存暴涨、启动变慢，比不加还卡。
        <strong>层是昂贵的缓存，只给真正在动画的元素</strong>
        ，动画结束及时移除。另外合成器线程有自己的执行轨道：主线程卡死时 transform 动画照常播；
        反过来合成线程过载（层太多、栅格化量大）时滚动会掉帧——排查时 Performance 面板的 主线程轨与
        GPU/合成轨要分开看。
      </Paragraph>
      <DoDont
        label="动画属性选型 / animate transform"
        dont={{
          code: `/* 动 top/left：每帧改几何 → 每帧回流 */
@keyframes slide {
  from { top: 0; left: 0; }
  to   { top: 100px; left: 300px; }
}`,
          note: "top/left 参与布局几何，动画的每一帧都走满 Style → Layout → Paint，主线程被持续打满",
        }}
        do={{
          code: `/* transform：合成器直改，跳过主线程 Layout/Paint */
@keyframes slide {
  from { transform: translate(0, 0); }
  to   { transform: translate(300px, 100px); }
}`,
          note: "transform 不参与布局，作用于合成层变换——动画从「回流档」迁到「仅合成档」，主线程繁忙照样流畅",
        }}
      />
      <DoDont
        label="层提升的范围 / will-change"
        dont={{
          code: `/* 长列表 1000 项全部预提升 */
.list-item {
  will-change: transform;
}`,
          note: "每层是一块显存纹理（面积 = 尺寸 × dpr²）：层爆炸让显存暴涨、栅格化量激增，比不加还卡",
        }}
        do={{
          code: `/* 只给真正在动画的元素，动画结束及时移除 */
.list-item.is-animating {
  will-change: transform;
}
/* 也可以监听 animationstart 加、animationend 移除 */`,
          note: "层是昂贵的缓存，不是装饰——提升范围与动画生命周期严格对齐",
        }}
      />

      <MemoryCard keyword="属性三分类" color="#3fb950">
        <strong>仅合成</strong>：transform、opacity（已提升层）；
        <strong>仅重绘</strong>：color、background、visibility、box-shadow、text-decoration；
        <strong>回流</strong>：width/height/top/font-size、文本内容、DOM 增删、display。
        动画永远从第三档往第一档迁移。
      </MemoryCard>

      <Heading level={2} title="度量与 CSS 边界控制" />
      <Paragraph>
        度量先于优化：Performance 面板里紫色的 Layout 事件就是回流（悬停可见触发调用栈——
        <strong>谁读的几何谁负责</strong>），绿色的 Paint 是重绘；Rendering 面板的 Paint flashing
        给重绘区域盖绿闪、Layout Shift Regions 标出意外回流导致的位移（对应 CLS
        指标）。优化前的第一步永远是录一帧火焰图，确认抖动发生在哪个节点的哪行代码。
      </Paragraph>
      <Paragraph>
        CSS 侧有两个收窄波及的声明：<code>contain</code>{" "}
        告诉引擎「子树变化的外溢范围」（layout/paint/size，<code>strict</code>{" "}
        全选）——它直接把失效传播的边界画在你指定的节点上；<code>content-visibility: auto</code>{" "}
        更激进，屏外子树连布局与绘制都跳过，长列表与长文档的渲染成本从「全量」降到「可视区」。两者都是零
        JS 的纯声明式优化，现代浏览器全量支持。
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`/* 消息流列表项：子树的变化不外溢，布局失效到此为止 */
.message-item {
  contain: layout paint;
}

/* 长列表 / 长文档：屏外内容跳过渲染，进入视口才渲染 */
.article-body {
  content-visibility: auto;
  contain-intrinsic-size: auto 800px; /* 屏外占位高度，防滚动条跳动 */
}

/* 动画元素：提前提升合成层，动画结束移除 */
.carousel-slide {
  will-change: transform; /* 只加给真正在动画的元素 */
}`}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "getBoundingClientRect() 一定触发强制同步布局吗？",
            intent:
              "热身题，先把「读几何 = 回流」这个过度概括修正过来——考你是否知道布局树缓存的存在。",
            depth: 3,
            a: "不一定。强制布局只发生在「布局树是脏的」时候：存在未处理的样式/DOM 写操作，读取需要最新值，引擎才中断 JS 同步跑 Style → Layout。树干净时它直接读上次布局的缓存结果，成本接近零。所以「读几何」本身不贵，脏读才贵——布局抖动的本质是反复把树弄脏再反复读。",
            bonus:
              "推论：批量读的实现里只有第一个读是贵的；同理 DevTools 里看到的 forced reflow 是「这一次读取恰好赶上脏树」，不代表所有读取都在触发布局。",
          },
          {
            q: "把写操作都挪进 requestAnimationFrame，布局抖动就解决了吗？",
            intent:
              "考 rAF 的真实角色——很多人把它当万能解药，实际它只解决「时机」，不解决「读写交错」。",
            depth: 3,
            a: "没解决。rAF 回调排在 Style/Layout 之前，只是给了你「本帧改样式的正确时机」，回调内部怎么读写它不管——rAF 里照样读写交错，照样每轮读取强制 flush，抖动原样发生。rAF 真正解决的是另一件事：把写操作对齐到帧边界，避免一帧内多次无意义的样式失效。抖动的解药始终是读写分离（批量读 → 批量写）或 FastDOM 这类自动排程库。",
            bonus:
              "进阶模式：把「读」放上一个 rAF、「写」放下一个 rAF，读写跨帧分离——用一帧延迟换确定的单次布局，适合滚动联动这类双向依赖场景。",
          },
          {
            q: "改 transform 一定不触发回流吗？读 transform 呢？",
            intent:
              "考属性分类的边界——「transform 不动布局」与「读它仍要样式重算」是两件事，混为一谈就露馅。",
            depth: 4,
            a: "写 transform 本身不触发回流：它不参与布局几何，只影响已提升层的绘制与合成（未提升的元素第一次会经历提升与重绘）。但读 transform 是另一回事：getComputedStyle(el).transform 需要最新的计算样式，树脏时强制跑的是 Style 重算——不是 Layout。所以「transform 读写交错」抖的是样式重算，量级远小于布局，但不是零。",
            bonus:
              "推论：opacity 同理。动画里用 Web Animations API 或 CSS 动画让引擎全权接管这些属性，比 JS 每帧写值多一层优化空间——引擎可以在合成器上直接跑关键帧。",
          },
          {
            q: "position: fixed 的元素滚动时为什么也可能掉帧？",
            intent:
              "考合成层提升的条件——「fixed 必然走合成器」是错觉，包含块被破坏后它会退化回主线程。",
            depth: 4,
            a: "fixed 的合成器直通有前提：它的包含块必须是视口。一旦某个祖先带 transform / filter / perspective / will-change / contain: paint，包含块就变成那个祖先——fixed 语义上「钉在」祖先上随滚动移动，无法再用「层不动、滚动由合成器平移」的快路径，退化为主线程每帧更新。另外过多 fixed 层叠在一起还可能被浏览器的层压缩放弃，显存与栅格化开销上升。",
            bonus:
              "排查路径：DevTools Layers 面板看该元素是否真的在独立合成层、滚动时主线程轨有没有持续的 Layout/Paint——有就是包含块被破坏，改祖先的 transform 即可恢复。",
          },
          {
            q: "回流的波及范围由什么决定？怎么人为收窄？display:none 切换为什么特别贵？",
            intent:
              "压轴题，考失效传播模型——答出脏位与清洁边界的是懂引擎的，再带出 contain 与 display 陷阱的是能落地的。",
            depth: 5,
            a: "波及范围由失效传播决定：脏位自改动节点向上标记，停在最近的清洁边界（定位祖先、contain 边界），布局时自该边界向下重算——所以「固定尺寸的绝对定位容器」能天然隔离改动。人为收窄用 contain: layout/paint（或 strict）显式设界，长列表配合 content-visibility: auto 让屏外子树干脆不进布局。display:none 特别贵的原因正相反：它的子树完全不参与布局，切回 display:block 的瞬间整棵子树从头失效重排——「隐藏」用 visibility/hidden 或 content-visibility 才是便宜的。",
            bonus:
              "引擎细节：Blink 的样式失效还带「后代失效集」按选择器特征做增量，跳过明显无关的子树——这意味着样式重算同样有边界与传播，理解模型而非背清单才通用。",
          },
          {
            q: "主线程和合成器线程各管什么？滚动掉帧先查哪一边？",
            intent:
              "终极端口题：把帧管线拆到线程轨道——答不出「两条轨道独立卡」就说明只在主线程思维里排查过问题。",
            depth: 5,
            a: "主线程负责输入分发、JS、样式、布局、绘制并把结果 commit 给合成器；合成器线程负责栅格化（Raster，分 tile 并可多光栅线程并行）、激活（Activate）与绘制（Draw），滚动与 transform/opacity 动画在它上面自主运行。排查口诀：主线程卡 → 页面所有交互都卡（JS 长任务、布局抖动）；合成线程卡 → 只有滚动/动画掉帧但页面仍能响应（层太多、栅格化量爆炸）。Performance 面板两条轨道分开看，掉帧发生在哪条轨、瓶颈事件是什么颜色，直接决定改 JS 还是改层结构。",
            bonus:
              "合成器还承担无主线程参与的滚动（compositor-driven scroll）与命中测试初筛——这也是「主线程忙时页面仍能滚动」的原因；而 scroll 事件监听（非 passive）会把滚动拉回主线程同步处理，滚动性能的常见自毁开关。",
          },
        ]}
      />

      <CrossRef
        title="下一个该问的问题"
        notes={[
          {
            title: "从输入 URL 到页面渲染，中间发生了什么？",
            to: "/note/frontend/browser/fundamentals/url-to-render",
            description: "全景流水线：回流重绘这条成本线，挂在从网络到像素的哪一帧。",
          },
          {
            title: "事件循环是怎么调度的：从调用栈到微任务",
            to: "/note/frontend/javascript/event-loop/event-loop-basics",
            description: "rAF 回调排进哪一轮循环：帧边界与任务队列的调度关系。",
          },
          {
            title: "setState 之后 React 做了什么？",
            to: "/note/frontend/react/core/setstate-scheduling",
            description: "从引擎侧切到框架侧：DOM 数量本身才是最大的回流成本，重渲染由谁调度。",
          },
        ]}
      />
    </NoteShell>
  );
}
