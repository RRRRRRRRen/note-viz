import { Conclusion, Heading, NoteShell, Paragraph, QAChain } from "@/components/note";
import CodeBlock from "@/components/demo/CodeBlock";
import { FlowChart } from "@/components/demo/FlowChart";
import { CompareTable, DoDont, MemoryCard, Timeline } from "@/components/viz";
import FlexShrinkSimulator from "./FlexShrinkSimulator";

export default function Note() {
  return (
    <NoteShell>
      <Conclusion>
        内容沿<strong>一个方向</strong>排 → Flex；需要<strong>同时约束行和列</strong> → Grid。 Grid
        先定网格再放内容（layout-out），Flex 先有内容再分配空间（content-out）——两种相反的布局哲学。
        拿不准时记住经验法则：<strong>组件内部的一维排列用 Flex，页面骨架与二维网格用 Grid</strong>
        ；嵌套组合（外 Grid 内 Flex）是常态而非妥协。两个引擎共有的第一坑是
        <strong>自动最小尺寸</strong>：Flex 解法 <code>min-w-0</code>，Grid 解法{" "}
        <code>minmax(0, 1fr)</code>。
      </Conclusion>

      <Heading level={2} title="两种布局哲学：content-out vs layout-out" />
      <Paragraph>
        Flexbox 是<strong>一维</strong>布局：项目沿一条主轴排布，<code>flex-wrap</code>{" "}
        虽然能换行，但换出的每一行都是一条<strong>独立主轴</strong>
        ——行与行之间如何对齐、列是否要跨行看齐，Flex 一概不管。Grid 是<strong>二维</strong>
        布局：先用 <code>grid-template</code> 把行列轨道定死，再把内容放进格子里，行列天然构成体系。
      </Paragraph>
      <Paragraph>
        这决定了两者完全相反的工作顺序：Flex 是 content-out——先有内容，再看空间怎么分；Grid 是
        layout-out——先有网格，再决定内容放哪。理解这一点，「为什么 Grid 做页面骨架更舒服、Flex
        做组件内部更顺手」就不言自明了。
      </Paragraph>

      <CompareTable
        label="心智模型 / mental model"
        left={{
          title: "Flex = 一维流（content-out）",
          color: "#8b5cf6",
          points: [
            "先有内容，再沿主轴分配空间",
            "只管一条轴：wrap 后每行独立，行间关系不归它管",
            "项目尺寸驱动布局（flex-basis 以内容为基准）",
            "适合：组件内部、工具条、导航栏、表单行",
          ],
        }}
        right={{
          title: "Grid = 二维网格（layout-out）",
          color: "#1677ff",
          points: [
            "先定行列轨道，内容填进格子",
            "行列同时约束：跨行跨列、行间对齐成体系",
            "轨道驱动布局（grid-template 先行）",
            "适合：页面骨架、卡片网格、需要行间看齐的场景",
          ],
        }}
      />
      <MemoryCard keyword="拿不准时的经验法则" color="#1677ff">
        组件内部一维排列 → Flex；页面骨架、卡片网格、跨行对齐 → Grid；两者都要 → 外 Grid 定骨架、内
        Flex 排细节。<strong>选型不是二选一，是分工。</strong>
      </MemoryCard>

      <Heading level={2} title="Flex 深拆：弹性三件套的分配算法" />
      <Paragraph>
        <code>flex-grow / flex-shrink / flex-basis</code> 三件套的默认值是 <code>0 1 auto</code>
        ——只缩不涨。真正决定布局的是浏览器内部的分配顺序：先定基准，再算剩余，最后按弹性分派。
      </Paragraph>

      <Timeline
        label="弹性分配算法 / flex algorithm"
        steps={[
          { label: "定基准 basis", sub: "auto = 内容尺寸", color: "#1677ff" },
          { label: "算剩余空间", sub: "容器 − Σbasis", color: "#f59e0b" },
          { label: "正剩余 → grow", sub: "按 grow 比例分", color: "#3fb950" },
          { label: "负剩余 → shrink", sub: "shrink × basis 加权", color: "#f85149" },
          { label: "min/max 夹逼", sub: "触边冻结，二次分配", color: "#8b5cf6" },
        ]}
      />
      <Paragraph>
        关键在第四步：<strong>收缩不是等比压缩</strong>。每项承担的收缩量 = 溢出量 × (shrink ×
        basis) ÷ 权重和——shrink 是缩放意愿，basis 是加权基数。shrink
        全相同时退化为按内容占比收缩；shrink 不同时，大 basis 且高 shrink
        的项会被压得远比等比更狠。拖一拖下面的模拟器，这个公式立刻长在手上：
      </Paragraph>

      <FlexShrinkSimulator />
      <Paragraph>
        顺带把最容易混的两个缩写掰开：<code>flex: 1</code> 是 <code>1 1 0%</code>
        ——基准归零、纯按 grow 比例分，内容宽度完全不影响结果；<code>flex: auto</code> 是{" "}
        <code>1 1 auto</code>
        ——先按内容分，剩余再均分。等宽卡片、工具条用前者；内容自适应、不想忽略内容差异时用后者。
      </Paragraph>

      <DoDont
        label="等宽分派 / equal split"
        dont={{
          code: `.card { flex: auto; }
/* 三张卡片内容长短不一 */
/* → 宽度跟着内容走，参差不齐 */`,
          note: "flex:auto 以内容为基准：内容差异直接写进宽度，等宽场景翻车",
        }}
        do={{
          code: `.card { flex: 1; }
/* = flex: 1 1 0% */
/* → basis 归零，纯按比例等分 */`,
          note: "flex:1 忽略内容宽度，剩余空间纯按 grow 比例分配",
        }}
      />

      <Heading level={2} title="Flex 第一坑：min-width:auto" />
      <Paragraph>
        经典事故：子项里放了一段长文本（长单词、URL、宽表格），容器被撑爆，
        <code>flex-shrink</code> 好像失效了。根因是 flex 子项有一条<strong>自动最小尺寸</strong>
        协议：默认 <code>min-width: auto</code>，子项
        <strong>拒绝收缩到自身 min-content 以下</strong>
        （最长不可断单元的宽度）。这是规范有意为之的保护——防止内容被压得完全不可读——代价是收缩算法在碰到这条隐形下限时提前冻结。
      </Paragraph>
      <Paragraph>
        解法链：给子项 <code>min-w-0</code> 把隐形下限钉到
        0，收缩算法就能正常工作；需要溢出保护时再加 <code>overflow: hidden</code> 或{" "}
        <code>overflow: auto</code>；要省略号就配 <code>truncate</code>
        。图片是重灾区：替换元素的自动最小尺寸来自<strong>固有尺寸</strong>
        ——一张 3000px 的原图，隐形下限就是 3000px，必须 <code>min-w-0</code>（解除下限）和{" "}
        <code>max-w-full</code>（压住上限）<strong>双管齐下</strong>，只给 max-w-full
        没用——它限的是上限，下限还是 auto。
      </Paragraph>

      <DoDont
        label="长文本溢出 / min-width"
        dont={{
          code: `<div class="flex">
  <span class="flex-1">
    a-very-long-unbreakable-url-slug
  </span>
</div>
/* 撑爆容器，shrink 无力回天 */`,
          note: "自动最小尺寸 = min-content：长单词把下限抬到内容宽度，收缩提前冻结",
        }}
        do={{
          code: `<div class="flex">
  <span class="flex-1 min-w-0 truncate">
    a-very-long-unbreakable-url-slug
  </span>
</div>
/* min-w-0 解除下限，truncate 出省略号 */`,
          note: "min-w-0 是 flex 子项处理长内容的第一反应，几乎总是需要的",
        }}
      />

      <Heading level={2} title="Grid 深拆：轨道、fr 与命名区域" />
      <Paragraph>
        <code>grid-template-columns</code> 定义<strong>显式轨道</strong>
        ；塞不进显式轨道的项目会掉进
        <strong>隐式行/列</strong>（由 <code>grid-auto-rows</code> 等控制尺寸）。fr
        的准确语义不是「等分单位」，而是「<strong>剩余空间分配比例</strong>
        」：浏览器先满足非弹性部分（px、auto、内容约束），剩余空间才按 fr 比例分。所以{" "}
        <code>200px 1fr 1fr</code> 是「先扣 200px，余下对半」，而不是三等分。
      </Paragraph>
      <Paragraph>
        fr 最大的红利是和 <code>repeat</code>、<code>minmax</code> 组合出
        <strong>零媒体查询</strong>的响应式卡片：每列最小
        240px、多余空间均分，列数随容器宽度自动增减——没有断点，没有 JS。另一个杀手锏是{" "}
        <code>grid-template-areas</code>
        ：用带名字的字符串直接画出页面骨架，圣杯布局一行搞定，Flex 要嵌套三层才能做到。
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`/* 零断点响应式卡片：每列最小 240px，自动填满 */
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

/* 经典圣杯布局：网格区域即图纸 */
.page {
  display: grid;
  grid-template:
    "header header" auto
    "aside  main" 1fr
    "footer footer" auto
    / 220px 1fr;
}`}
      />
      <Paragraph>
        <code>auto-fill</code> 和 <code>auto-fit</code>{" "}
        只差一个词，行为差异却很具体：两者按最小列宽算出的
        <strong>列数完全相同</strong>，差别在<strong>空轨道</strong>——auto-fill
        保留空轨道占位（项目宽度保持稳定，适合列表一致性）；auto-fit 把空轨道折叠成
        0，让已有项目拉伸铺满整行（适合「少而大」的展示场景）。项目刚好塞满所有列时，二者完全等价。
      </Paragraph>

      <MemoryCard keyword="auto-fill vs auto-fit" color="#8b5cf6">
        列数计算相同；差别只在空轨道：<strong>auto-fill 保留占位</strong>
        （宽度稳定），<strong>auto-fit 折叠空轨道</strong>（现有项目铺满）。项目填满时等价。
      </MemoryCard>

      <Heading level={2} title="Grid 的同款坑：1fr 也会溢出" />
      <Paragraph>
        Flex 有 min-width:auto，Grid 有一模一样的孪生问题：<code>1fr</code> 轨道的默认最小尺寸是{" "}
        <code>auto</code>，即<strong>轨道内所有项目 min-content 的最大值</strong>
        。往格子里塞一个长单词或宽表格，轨道被撑破，<code>repeat(3, 1fr)</code>{" "}
        的「等分」瞬间失效——而且和 Flex 一样，页面不报错，只是布局悄悄走样。
      </Paragraph>
      <Paragraph>
        解法与 Flex 同源（它们本来就是同一套自动最小尺寸协议的两副面孔）：把 fr 的隐形下限显式钉到
        0——<code>minmax(0, 1fr)</code>；或者给子项加 <code>min-w-0</code>
        。分栏布局（如「侧栏 + 内容区」）几乎永远应该写 <code>minmax(0, 1fr)</code> 而不是裸{" "}
        <code>1fr</code>，这是 Grid 时代的肌肉记忆。
      </Paragraph>

      <DoDont
        label="等分轨道 / fr track"
        dont={{
          code: `.layout {
  display: grid;
  grid-template-columns: 220px 1fr;
}
/* 内容区出现长 URL → 轨道被撑破 */`,
          note: "裸 1fr 的最小尺寸是 auto：内容一长，轨道不再等分",
        }}
        do={{
          code: `.layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
}
/* 下限钉到 0，等分不再受内容要挟 */`,
          note: "minmax(0, 1fr) 与 Flex 的 min-w-0 异曲同工，分栏场景的默认写法",
        }}
      />
      <MemoryCard keyword="同源陷阱：自动最小尺寸" color="#f85149">
        Flex 的 <code>min-w-0</code> 和 Grid 的 <code>minmax(0, 1fr)</code> 是同一个问题的两副面孔：
        <strong>子项/轨道默认拒绝收缩到内容以下</strong>
        。任何收缩或等分失效，先怀疑隐形下限，解法都是显式把下限钉到 0。
      </MemoryCard>

      <Heading level={2} title="对齐体系：同一属性，两套语义" />
      <Paragraph>
        Flex 只有两条轴：<code>justify-*</code> 管<strong>主轴</strong>、<code>align-*</code> 管
        <strong>交叉轴</strong>（换 <code>writing-mode</code> 或 <code>flex-direction</code>{" "}
        会换轴，属性名不变语义变）。Grid 则是行列各一套、每套三层： <code>-content</code> 管
        <strong>轨道组与容器之间</strong>、<code>-items</code> 管<strong>项目在格子内</strong>、
        <code>-self</code> 单项覆盖——共 3×2 个属性，粒度细得多。
      </Paragraph>
      <Paragraph>
        最常见的困惑正是层次错位：Grid 里写了 <code>justify-content: center</code>{" "}
        项目却没在格子里居中——因为它居中的是「整组轨道」，项目在轨道内的对齐要用{" "}
        <code>justify-items</code> / <code>justify-self</code>。间距同理：格点系统里永远优先{" "}
        <code>gap</code>——它不参与项目尺寸计算、不产生首尾多余间距；<code>margin</code>{" "}
        留给单项偏移和 auto 吸收剩余空间（如导航栏右贴：<code>margin-left: auto</code>）。
      </Paragraph>

      <CompareTable
        label="对齐三层 / alignment"
        left={{
          title: "Flex：两轴两族",
          color: "#8b5cf6",
          points: [
            "justify-* 管主轴，align-* 管交叉轴",
            "-content 分配轴上的剩余/溢出空间（多行时 align-content 才生效）",
            "-items / -self 管交叉轴上的项目对齐",
            "flex-direction 换向时轴随之换，属性名不变",
          ],
        }}
        right={{
          title: "Grid：两轴三层",
          color: "#1677ff",
          points: [
            "-content：轨道组 vs 容器（分布整组轨道）",
            "-items：项目在格子内的默认对齐",
            "-self：单个项目覆盖",
            "justify 系沿列轴、align 系沿行轴，行列各一套",
          ],
        }}
      />

      <Heading level={2} title="经典场景与选型决策" />
      <Paragraph>
        把前面所有机制收拢成一棵决策树，日常选型基本可以在十秒内完成——记住「外 Grid 内
        Flex」的组合才是常态：
      </Paragraph>

      <FlowChart
        label="选型决策 / decision"
        height={300}
        data={{
          direction: "TB",
          nodes: [
            { id: "start", label: "需要同时约束行和列吗？", color: "#f59e0b" },
            { id: "grid", label: "页面骨架 / 卡片网格 / 跨行对齐 → Grid", color: "#1677ff" },
            { id: "flex", label: "组件内一维排列（工具条/导航/表单行）→ Flex", color: "#8b5cf6" },
            { id: "both", label: "外 Grid 定骨架，内 Flex 排细节", color: "#3fb950" },
          ],
          edges: [
            { source: "start", target: "grid", label: "要（二维约束）" },
            { source: "start", target: "flex", label: "不要（一维流）" },
            { source: "grid", target: "both", label: "格子里还有内容要排" },
            { source: "flex", target: "both", label: "组件要放进骨架格子" },
          ],
        }}
      />
      <Paragraph>
        典型场景逐个过一遍：<strong>导航栏、工具条</strong>是一维流，Flex 最顺手，右侧菜单用{" "}
        <code>margin-left: auto</code> 一行解决；<strong>卡片流</strong>
        数量不定又要换行对齐，auto-fill + minmax 零断点搞定；<strong>页面骨架</strong>
        （头/侧栏/主体/脚）行列同时约束，grid-template-areas 一图胜千言；<strong>表单行</strong>
        （label + input）一维排布，Flex；<strong>sticky footer</strong> 用 Grid 的{" "}
        <code>auto 1fr auto</code> 三行轨道，中段自动撑满。场景对上了，写法基本是唯一的：
      </Paragraph>

      <CodeBlock
        lang="typescript"
        code={`/* 导航栏：一维流，右侧菜单 auto margin 顶到最右 */
.nav {
  display: flex;
  align-items: center;
  gap: 16px;
}
.nav .spacer { margin-left: auto; }

/* 卡片流：数量不定、自动换行、零断点 */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

/* sticky footer：三行轨道，中段自动撑满 */
.page {
  display: grid;
  min-height: 100vh;
  grid-template-rows: auto 1fr auto;
}`}
      />

      <Heading level={2} title="经典追问链" />
      <QAChain
        items={[
          {
            q: "flex-basis 和 width 到底谁说了算？column 方向呢？",
            intent:
              "热身题，看你是否把 basis 背成「优先级更高的 width」——它的本质是主轴尺寸，不是横坐标属性。",
            depth: 2,
            a: "basis 是「主轴方向的基准尺寸」，width 只是横坐标的属性名。flex-direction: row 时 basis 覆盖 width（basis 为 auto 才回落到 width）；column 时 basis 管的是 height，width 退居交叉轴。所以「basis 优先于 width」的背法只在 row 方向成立——本质是 basis 永远描述主轴，换方向它就换属性。",
            bonus:
              "完整的尺寸决定链：min/max 始终最外层夹逼；内层是 basis（auto 时依次回落到 width/height、再回落到 content）。",
          },
          {
            q: "容器 600px，三个子项 basis 200/300/300、shrink 分别 1/2/1，各自最终多宽？",
            intent:
              "直接考加权收缩公式。背过「shrink 按比例缩」的人多半答成等比缩放——这题专门把两种答案分开。",
            depth: 3,
            a: "溢出 200px。权重 = shrink × basis = 200/600/200，权重和 1000。各收缩 = 200 × 权重占比 = 40/120/40，最终宽度 160/180/260。注意对比：如果是等比缩放（×0.75）应得 150/225/225——中间项 shrink 高被压得更狠（180 vs 225），第三个 basis 相同却少缩 35px。shrink 全相同时加权才退化为按 basis 等比。",
            bonus:
              "真实引擎还会做夹逼迭代：某项触到 min/max 后被冻结，剩余溢出在未冻结项之间按权重重分——上面的手算是单轮理想值。",
          },
          {
            q: "auto-fill 和 auto-fit 渲染差异到底是什么？",
            intent: "高频混淆点，考你是否真懂「空轨道折叠」的时机，而不是背「一个占位一个填充」。",
            depth: 3,
            a: "两者按最小列宽算出的列数完全相同，差异只出现在「项目数少于列数」时：auto-fill 保留空轨道占位，项目保持列宽稳定，适合列表一致性；auto-fit 把空轨道折叠成 0，让已有项目拉伸铺满整行，适合「少而大」的展示。项目填满所有列时二者渲染完全等价。",
            bonus:
              "折叠发生在轨道定义阶段：auto-fit 折叠的是空重复轨道，已有项目占据的轨道不会被折——所以「只有 1 个项目时铺满」的是 auto-fit，而不是某种媒体查询魔法。",
          },
          {
            q: "min-width:auto 的 auto 到底取什么值？为什么图片在 flex 里溢出得比文本更极端？",
            intent:
              "考自动最小尺寸协议的细节——能答出 min-content 与替换元素差异，说明真读过规范行为而不是背 min-w-0 口诀。",
            depth: 4,
            a: "非替换元素的自动最小尺寸基于 min-content（最长不可断单元的宽度：长单词、URL、表格列）；替换元素（图片、视频）则是其固有尺寸——3000px 的原图下限就是 3000px，容器再窄也压不下去，所以图片溢出比文本更极端。解法上文本加 min-w-0 即可；图片必须 min-w-0（解除下限）+ max-w-full（压住上限）双管齐下，只写 max-w-full 无效——它限的是上限，下限仍是 auto。",
            bonus:
              "这套协议只在 flex/grid 子项上生效（普通 block 没有 min:auto 行为）；表格是 min-content 重灾区，惯用做法是外面套一层 overflow-x:auto 的容器。",
          },
          {
            q: "margin:auto 为什么在 Flex 里能居中，在普通 block 布局里不行？",
            intent:
              "考「auto margin = 吸收剩余空间」这个分配本质——理解它，justify-content 与 auto margin 的优先级就全通了。",
            depth: 4,
            a: "margin 上的 auto 语义是「把该方向的剩余空间分给我」。普通 block 布局垂直方向没有「分配剩余空间」这个动作（块从上往下流），auto 退化为 0；Flex/Grid 是分配式布局，剩余空间先被 auto margin 吃掉，剩下的才轮到 justify-content——所以 auto margin 的优先级高于对齐属性。导航栏「右侧菜单」的 margin-left:auto 正是这个机制：把左边的剩余空间全部吃掉，自己贴到最右。",
            bonus:
              "推论：justify-content:center 与 margin:auto 并存时，auto margin 先分；Grid 里 auto margin 在项目所在轨道内分配，同样优先于 align/justify。",
          },
        ]}
      />

      <Heading level={2} title="写在最后" />
      <Paragraph>
        两个新属性值得放进雷达：<strong>subgrid</strong>{" "}
        让嵌套网格继承父级的轨道定义——「每张卡片的标题行跨卡片对齐」不再靠魔法数字；{" "}
        <strong>container queries</strong> 让组件按<strong>容器</strong>
        宽度而非视口宽度响应——组件真正成为自包含单元，与「组件内部 Flex / 页面骨架
        Grid」的分工天然契合。布局的原语在变稳，但
        <strong>分配空间的思维方式</strong>（基准 → 剩余 → 加权 → 夹逼）是长期资产——它同样是理解
        flex 演进与未来特性的钥匙。
      </Paragraph>
    </NoteShell>
  );
}
